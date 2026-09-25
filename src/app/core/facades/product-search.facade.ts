import { Injectable, inject, signal } from '@angular/core';
import type { Product } from '../models/product.model';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

export type { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductSearchFacade {
  private readonly catalog = inject(ProductsRepository);

  readonly searchResults = signal<Product[]>([]);
  readonly isSearching = signal(false);
  readonly error = signal<string | null>(null);

  readonly essentials = signal<Product[]>([]);

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  /** Cierre de sesión: los esenciales son del catálogo de la familia anterior. */
  reset(): void {
    this.essentials.set([]);
    this.isSearching.set(false);
    this.clear();
  }

  async loadEssentials(familyId: string): Promise<void> {
    if (this.essentials().length > 0) return; // Caché por sesión (se limpia en reset())
    try {
      // MVP: los primeros 8 en orden alfabético. Idealmente, por frecuencia de compra.
      this.essentials.set(await this.catalog.findByFamily(familyId, 8));
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
      this.searchResults.set(await this.catalog.searchByName(term.trim(), 20));
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
      return await this.catalog.create({ name: name.trim(), familyId });
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
