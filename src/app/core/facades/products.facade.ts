import { Injectable, computed, inject, signal } from '@angular/core';
import type { Product } from '../models/product.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { daysSince } from '../utils/date.utils';
import { matchesSearch } from '../utils/product-sheet.utils';

export interface ProductWithStatus extends Product {
  /** Días desde la última compra finalizada; null si nunca se compró. */
  daysSincePurchase: number | null;
}

/** Catálogo de la familia (spec 0017): activos o archivados, con buscador local. */
@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  private readonly family = inject(FamilyRepository);
  private readonly catalog = inject(ProductsRepository);

  readonly products = signal<ProductWithStatus[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  /** Lo escrito en el buscador del Catálogo. */
  readonly query = signal('');
  readonly archived = signal(false);

  /** Los productos que coinciden con el buscador (sin tildes ni mayúsculas). */
  readonly filtered = computed(() =>
    this.products().filter((p) => matchesSearch(p.name, this.query()))
  );

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  reset(): void {
    this.products.set([]);
    this.isLoading.set(false);
    this.error.set(null);
    this.query.set('');
    this.archived.set(false);
  }

  /** Carga el catálogo; con datos ya cargados refresca sin skeleton (al volver de una ficha). */
  async loadProducts(): Promise<void> {
    if (this.products().length === 0) this.isLoading.set(true);
    this.error.set(null);

    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const rows = await this.catalog.findByFamily(familyId, undefined, {
        archived: this.archived(),
      });

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

  /** "Activos" / "Archivados" (spec 0017 AC7). */
  async showArchived(archived: boolean): Promise<void> {
    if (this.archived() === archived) return;
    this.archived.set(archived);
    this.products.set([]);
    await this.loadProducts();
  }

  /**
   * "Crear «texto»" del buscador (AC9). Si ya existe uno con ese nombre devuelve ese.
   * @returns id del producto, o null si el nombre está vacío o no se pudo crear.
   */
  async create(input: string): Promise<string | null> {
    const name = input.trim();
    if (!name) return null;
    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const existing = await this.catalog.findIdByName(familyId, name);
      if (existing) return existing;
      return (await this.catalog.create({ name, familyId })).id;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
