import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { Product } from '../models/product.model';
import { ShoppingListFacade } from './shopping-list.facade';

export interface ProductWithStatus extends Product {
  // Aquí podemos agregar lógica en el futuro para predecir compras
  daysSinceUpdate: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  private supabase = inject(SupabaseService);
  private shoppingFacade = inject(ShoppingListFacade);

  readonly products = signal<ProductWithStatus[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  
  // Opciones simples de predicción: productos que no se actualizan hace > 7 días
  readonly recommendedProducts = computed(() => {
    return this.products().filter(p => p.daysSinceUpdate > 7);
  });

  async loadProducts(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data: member } = await this.supabase.client
        .from('family_members')
        .select('family_id')
        .limit(1)
        .maybeSingle();

      if (!member?.family_id) {
        throw new Error('Familia no encontrada');
      }

      const { data, error } = await this.supabase.client
        .from('products')
        .select('*')
        .eq('family_id', member.family_id)
        .order('name');

      if (error) throw error;

      const now = new Date();
      const mapped = (data || []).map(p => {
        const updateDate = new Date(p.updated_at || p.created_at || now);
        const diffTime = Math.abs(now.getTime() - updateDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...p,
          daysSinceUpdate: diffDays
        };
      });

      this.products.set(mapped);
    } catch (e) {
      console.error(e);
      this.error.set('Error al cargar productos');
    } finally {
      this.isLoading.set(false);
    }
  }

  async updatePrice(productId: string, newPrice: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('products')
        .update({ last_price: newPrice, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;
      
      // Update local state optimism
      this.products.update(list => list.map(p => 
        p.id === productId ? { ...p, last_price: newPrice, daysSinceUpdate: 0 } : p
      ));
    } catch (e) {
      console.error('Error updating price', e);
    }
  }

  async generateSmartList(): Promise<void> {
    try {
      const toBuy = this.recommendedProducts();
      if (toBuy.length === 0) return;

      // Usamos el facade de Shopping List para crear una lista y meterle los items
      await this.shoppingFacade.createList('Compra Inteligente');
      
      // La lista fue creada y almacenada en state
      // Ojo: await this.shoppingFacade.createList(...) hace refreshSilently
      const activeList = this.shoppingFacade.data();
      if (activeList) {
        for (const p of toBuy) {
          await this.shoppingFacade.addItem(activeList.id, p.id, 1);
        }
      }
    } catch (e) {
      console.error('Error generando lista inteligente', e);
    }
  }
}
