import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';

export interface Product {
  id: string;
  name: string;
  category: string | null;
  family_id: string;
}

@Injectable({ providedIn: 'root' })
export class ProductSearchFacade {
  private supabase = inject(SupabaseService);

  readonly searchResults = signal<Product[]>([]);
  readonly isSearching = signal(false);
  readonly error = signal<string | null>(null);

  readonly essentials = signal<Product[]>([]);

  async loadEssentials(familyId: string): Promise<void> {
    if (this.essentials().length > 0) return; // Simple cache para la sesión
    try {
      const { data, error } = await this.supabase.client
        .from('products')
        .select('*')
        .eq('family_id', familyId)
        // Idealmente, se ordenaría por frecuencia de uso. 
        // Como MVP, traemos los primeros 8 en orden alfabético.
        .order('name')
        .limit(8);

      if (error) throw error;
      this.essentials.set(data ?? []);
    } catch (e) {
      console.error('Error cargando esenciales', e);
    }
  }

  async search(term: string): Promise<void> {
    if (!term || term.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('products')
        .select('*')
        .ilike('name', `%${term.trim()}%`)
        .order('name')
        .limit(20);

      if (error) throw error;
      this.searchResults.set(data ?? []);
    } catch (e) {
      this.error.set('Error al buscar productos');
      console.error('Search error', e);
    } finally {
      this.isSearching.set(false);
    }
  }

  async createProduct(name: string, familyId: string): Promise<Product | null> {
    this.isSearching.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('products')
        .insert({ name: name.trim(), family_id: familyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      this.error.set('Error al crear producto');
      console.error('Create product error', e);
      return null;
    } finally {
      this.isSearching.set(false);
    }
  }

  clear() {
    this.searchResults.set([]);
    this.error.set(null);
  }
}
