import { Injectable, inject, signal, computed } from '@angular/core';
import type { Product } from '../models/product.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { daysSince } from '../utils/date.utils';
import { needsRestock } from '../utils/restock.utils';

export interface ProductWithStatus extends Product {
  /** Días desde la última compra finalizada; null si nunca se compró. */
  daysSincePurchase: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  private readonly family = inject(FamilyRepository);
  private readonly catalog = inject(ProductsRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly items = inject(ListItemsRepository);

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

  /** "Es momento de reponer": comprados hace al menos su duración estimada. */
  readonly recommendedProducts = computed(() => this.products().filter((p) => needsRestock(p)));

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

  /**
   * Agrega los productos recomendados a la lista activa (solo los que no están). Si no hay lista
   * activa crea "Compra Inteligente": nunca deja dos listas activas (la pantalla muestra solo una).
   * La pantalla de lista la toma al entrar (SWR + Realtime), sin acoplar facades.
   * @returns false si falló (la página avisa).
   */
  async generateSmartList(): Promise<boolean> {
    const recommended = this.recommendedProducts();
    if (recommended.length === 0) return true;

    try {
      let listId: string;
      let alreadyInList = new Set<string>();

      const active = await this.lists.findLatestActive();
      if (active) {
        listId = active.id;
        alreadyInList = new Set(
          active.list_items.flatMap((i) => (i.product?.id ? [i.product.id] : []))
        );
      } else {
        const familyId = await this.family.getOrCreateFamilyId();
        const list = await this.lists.create({
          name: 'Compra Inteligente',
          familyId,
          status: 'active',
        });
        listId = list.id;
      }

      const toAdd = recommended.filter((p) => !alreadyInList.has(p.id));
      await this.items.addMany(
        toAdd.map((p) => ({ list_id: listId, product_id: p.id, quantity: 1 }))
      );
      return true;
    } catch (e) {
      console.error('Error generando lista inteligente', e);
      return false;
    }
  }
}
