import { Injectable, computed, inject, signal } from '@angular/core';
import type { Product } from '../models/product.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { daysSince } from '../utils/date.utils';
import type { Aisle } from '../models/product.model';
import { filterCatalog, sortCatalog, type CatalogOrder } from '../utils/catalog.utils';

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

  /** Orden del Catálogo (spec 0022 D1); vale mientras la app está abierta. */
  readonly order = signal<CatalogOrder>('name');
  /** Pasillo elegido; null = todos (spec 0022 D2). */
  readonly aisle = signal<Aisle | null>(null);
  readonly noPrice = signal(false);
  /** Compras por producto (`restock_stats`), para "Más comprados". */
  private readonly counts = signal<ReadonlyMap<string, number>>(new Map());

  readonly hasFilters = computed(() => this.noPrice() || this.aisle() !== null);

  /** Buscador + filtros + orden; en Archivados, solo el buscador y A–Z. */
  readonly filtered = computed(() => {
    const archived = this.archived();
    const list = filterCatalog(this.products(), {
      query: this.query(),
      aisle: archived ? null : this.aisle(),
      noPrice: !archived && this.noPrice(),
    });
    return sortCatalog(list, archived ? 'name' : this.order(), this.counts());
  });

  clearFilters(): void {
    this.noPrice.set(false);
    this.aisle.set(null);
  }

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  reset(): void {
    this.products.set([]);
    this.isLoading.set(false);
    this.error.set(null);
    this.query.set('');
    this.archived.set(false);
    this.order.set('name');
    this.clearFilters();
    this.counts.set(new Map());
  }

  /** Carga el catálogo; con datos ya cargados refresca sin skeleton (al volver de una ficha). */
  async loadProducts(): Promise<void> {
    if (this.products().length === 0) this.isLoading.set(true);
    this.error.set(null);

    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const [rows, stats] = await Promise.all([
        this.catalog.findByFamily(familyId, undefined, { archived: this.archived() }),
        // Sin estadísticas el Catálogo funciona igual ("Más comprados" queda como A–Z).
        this.catalog.findRestockStats().catch(() => []),
      ]);
      this.counts.set(new Map(stats.map((s) => [s.product_id, s.purchase_count])));

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
