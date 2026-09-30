import { Injectable, inject, signal } from '@angular/core';
import type { Product } from '../models/product.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { daysSince } from '../utils/date.utils';

export interface ProductWithStatus extends Product {
  /** Días desde la última compra finalizada; null si nunca se compró. */
  daysSincePurchase: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  private readonly family = inject(FamilyRepository);
  private readonly catalog = inject(ProductsRepository);

  readonly products = signal<ProductWithStatus[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  reset(): void {
    this.products.set([]);
    this.isLoading.set(false);
    this.error.set(null);
  }

  async loadProducts(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const rows = await this.catalog.findByFamily(familyId);

      this.products.set(
        rows.map((p) => ({
          ...p,
          daysSincePurchase: p.last_purchased_at ? daysSince(p.last_purchased_at) : null,
        }))
      );
    } catch (e) {
      console.error(e);
      this.error.set('Error al cargar productos');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Guarda el precio. Si no cambió no escribe.
   * @returns true si quedó guardado un precio nuevo; false si no cambió o falló (la página avisa).
   */
  async updatePrice(productId: string, newPrice: number): Promise<boolean> {
    const current = this.products().find((p) => p.id === productId);
    if (current && current.last_price === newPrice) return false;

    try {
      await this.catalog.updatePrice(productId, newPrice);
      this.products.update((list) =>
        list.map((p) => (p.id === productId ? { ...p, last_price: newPrice } : p))
      );
      return true;
    } catch (e) {
      console.error('Error updating price', e);
      return false;
    }
  }

}
