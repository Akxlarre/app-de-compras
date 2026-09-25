import { Injectable, inject, signal, computed } from '@angular/core';
import type { Product } from '../models/product.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';

export interface ProductWithStatus extends Product {
  // Aquí podemos agregar lógica en el futuro para predecir compras
  daysSinceUpdate: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  private readonly family = inject(FamilyRepository);
  private readonly catalog = inject(ProductsRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly items = inject(ListItemsRepository);

  readonly products = signal<ProductWithStatus[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Opciones simples de predicción: productos que no se actualizan hace > 7 días
  readonly recommendedProducts = computed(() => {
    return this.products().filter((p) => p.daysSinceUpdate > 7);
  });

  async loadProducts(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const rows = await this.catalog.findByFamily(familyId);

      const now = Date.now();
      this.products.set(
        rows.map((p) => {
          const updated = new Date(p.updated_at || p.created_at || now).getTime();
          return { ...p, daysSinceUpdate: Math.ceil(Math.abs(now - updated) / DAY_MS) };
        })
      );
    } catch (e) {
      console.error(e);
      this.error.set('Error al cargar productos');
    } finally {
      this.isLoading.set(false);
    }
  }

  async updatePrice(productId: string, newPrice: number): Promise<void> {
    try {
      await this.catalog.updatePrice(productId, newPrice);
      this.products.update((list) =>
        list.map((p) =>
          p.id === productId ? { ...p, last_price: newPrice, daysSinceUpdate: 0 } : p
        )
      );
    } catch (e) {
      console.error('Error updating price', e);
    }
  }

  /**
   * Crea una lista activa "Compra Inteligente" con los productos recomendados.
   * La pantalla de lista la toma al entrar (SWR + Realtime), sin acoplar facades.
   */
  async generateSmartList(): Promise<void> {
    const toBuy = this.recommendedProducts();
    if (toBuy.length === 0) return;

    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const list = await this.lists.create({
        name: 'Compra Inteligente',
        familyId,
        status: 'active',
      });
      await this.items.addMany(
        toBuy.map((p) => ({ list_id: list.id, product_id: p.id, quantity: 1 }))
      );
    } catch (e) {
      console.error('Error generando lista inteligente', e);
    }
  }
}
