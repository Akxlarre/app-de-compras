import { Injectable, inject } from '@angular/core';
import { BaseFacade } from './base.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ToastService } from '../services/ui/toast.service';
import type { RestockData } from '../models/restock.model';

/**
 * Sugerencias de reposición (spec 0014): el catálogo de la familia y cada cuánto se compra cada
 * producto. Qué sugerir lo decide `restockSuggestions` en la página, que conoce la lista activa.
 */
@Injectable({ providedIn: 'root' })
export class RestockFacade extends BaseFacade<RestockData> {
  private readonly family = inject(FamilyRepository);
  private readonly catalog = inject(ProductsRepository);
  private readonly toast = inject(ToastService);

  protected override async fetchData(): Promise<RestockData> {
    const familyId = await this.family.getOrCreateFamilyId();
    const [products, stats] = await Promise.all([
      this.catalog.findByFamily(familyId),
      this.catalog.findRestockStats(),
    ]);
    return { products, stats };
  }

  /** Vuelve a leer después de agregar o cerrar una compra (sin skeleton). */
  refresh(): Promise<void> {
    return this.refreshSilently();
  }

  /**
   * "Todavía tengo": no sugerirlo hasta `until`, para toda la familia (optimista).
   * @returns false si no se pudo (vuelve a aparecer).
   */
  async snooze(productId: string, until: string): Promise<boolean> {
    const prev = this._data();
    if (!prev) return false;
    this._data.set({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, restock_snoozed_until: until } : p
      ),
    });
    try {
      await this.catalog.snoozeRestock(productId, until);
      return true;
    } catch (e) {
      console.error('No se pudo posponer', e);
      this._data.set(prev);
      this.toast.error('No se pudo guardar', 'Revisa tu conexión e inténtalo de nuevo.');
      return false;
    }
  }
}
