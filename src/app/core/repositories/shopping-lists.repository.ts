import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type {
  ActiveShoppingList,
  ShoppingList,
  ShoppingListStatus,
} from '@core/models/shopping-list.model';
import type { ManualPrice } from '@core/models/receipt.model';
import { MutationError, toMutationError } from '@core/utils/mutation-error.utils';

/** UPDATE/DELETE que afecta 0 filas: así se ve un RLS que lo bloquea o un id que ya no está. */
function assertAffected(data: unknown, error: unknown): void {
  if (error) throw toMutationError(error);
  if (!Array.isArray(data) || data.length === 0) throw new MutationError('not_found');
}

/** Lista con ítems y el producto embebido de cada ítem. */
const WITH_ITEMS = '*, list_items(*, product:products(id, name, category, last_price))';

export interface NewShoppingList {
  name: string;
  familyId: string;
  status: ShoppingListStatus;
}

/**
 * Acceso tipado a `shop.shopping_lists`. Lanza `MutationError` (`not_found`, `list_not_active`,
 * `offline`) o el error de Supabase.
 */
@Injectable({ providedIn: 'root' })
export class ShoppingListsRepository {
  private readonly supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client.schema('shop');
  }

  /** La lista activa más reciente (RLS limita a mi familia). */
  async findLatestActive(): Promise<ActiveShoppingList | null> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw toMutationError(error);
    return (data as ActiveShoppingList | null) ?? null;
  }

  async findLastCompleted(familyId: string): Promise<ActiveShoppingList | null> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('family_id', familyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) throw toMutationError(error);
    return (data as ActiveShoppingList | null) ?? null;
  }

  async findTemplates(familyId: string): Promise<ActiveShoppingList[]> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('family_id', familyId)
      .eq('status', 'template')
      .order('created_at', { ascending: false });
    if (error) throw toMutationError(error);
    return (data as ActiveShoppingList[] | null) ?? [];
  }

  /**
   * La lista activa de mi familia (RPC `start_active_list`): la crea si no hay; si ya hay una
   * (doble toque, otro miembro), la devuelve con `created = false`. La BD admite una sola activa.
   */
  async startActive(name: string): Promise<{ id: string; created: boolean }> {
    const { data, error } = await this.db.rpc('start_active_list', { p_name: name }).single();
    if (error) throw toMutationError(error);
    return data as { id: string; created: boolean };
  }

  /**
   * Borra una compra cerrada (RPC `delete_purchase`): ítems y boleta en cascada; la BD recalcula
   * la última compra de sus productos (spec 0012).
   * @returns ruta de la foto de la boleta en el bucket, para borrarla; null si no tenía.
   */
  async deletePurchase(listId: string): Promise<string | null> {
    const { data, error } = await this.db.rpc('delete_purchase', { p_list_id: listId });
    if (error) throw toMutationError(error);
    return (data as string | null) ?? null;
  }

  /** Nombre propio de una compra cerrada (RPC `rename_purchase`, 1 a 60 caracteres). */
  async renamePurchase(listId: string, name: string): Promise<void> {
    const { error } = await this.db.rpc('rename_purchase', { p_list_id: listId, p_name: name });
    if (error) throw toMutationError(error);
  }

  /** Renombra una plantilla (solo `status = template`; 0 filas → `not_found`) (spec 0013). */
  async renameTemplate(templateId: string, name: string): Promise<void> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .update({ name })
      .eq('id', templateId)
      .eq('status', 'template')
      .select('id');
    assertAffected(data, error);
  }

  /** Borra una plantilla con sus ítems (cascada). Nunca toca compras ni la lista activa. */
  async deleteTemplate(templateId: string): Promise<void> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .delete()
      .eq('id', templateId)
      .eq('status', 'template')
      .select('id');
    assertAffected(data, error);
  }

  /** Crea una lista no activa (plantilla). La activa se crea con `startActive`. */
  async create(input: NewShoppingList): Promise<ShoppingList> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .insert({ name: input.name, family_id: input.familyId, status: input.status })
      .select()
      .single();
    if (error) throw toMutationError(error);
    return data as ShoppingList;
  }

  /** Compras finalizadas de la familia, más recientes primero (para el Historial). */
  async findCompleted(familyId: string, limit = 50): Promise<ActiveShoppingList[]> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(`${WITH_ITEMS}, receipts(id, image_url, store)`)
      .eq('family_id', familyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw toMutationError(error);
    return (data as ActiveShoppingList[] | null) ?? [];
  }

  /**
   * Finaliza la compra en una transacción (RPC `complete_list`): guarda el precio pagado y la
   * fecha de compra de lo marcado; los pendientes pasan a la lista activa o se descartan.
   * @returns id de la lista que recibió los pendientes, o null si no hubo o se descartaron.
   */
  async complete(listId: string, carryPending: boolean): Promise<string | null> {
    const { data, error } = await this.db.rpc('complete_list', {
      p_list_id: listId,
      p_carry_pending: carryPending,
    });
    if (error) throw toMutationError(error);
    return (data as string | null) ?? null;
  }

  /**
   * "Ingresar total" de una compra ya cerrada y sin boleta (RPC `set_purchase_total`): el total
   * pagado y, opcionalmente, los precios confirmados de lo marcado.
   */
  async setPurchaseTotal(listId: string, total: number, prices: ManualPrice[]): Promise<void> {
    const { error } = await this.db.rpc('set_purchase_total', {
      p_list_id: listId,
      p_total: total,
      p_prices: prices.map((p) => ({ item_id: p.itemId, unit_price: p.unitPrice })),
    });
    if (error) throw toMutationError(error);
  }

  /**
   * Cierra la compra sin boleta (RPC `close_list_manual`): precios confirmados de lo marcado y el
   * total pagado (null = no lo sé → queda `estimated`). Mismo retorno que `complete`.
   */
  async closeManual(
    listId: string,
    carryPending: boolean,
    prices: ManualPrice[],
    total: number | null
  ): Promise<string | null> {
    const { data, error } = await this.db.rpc('close_list_manual', {
      p_list_id: listId,
      p_carry_pending: carryPending,
      p_prices: prices.map((p) => ({ item_id: p.itemId, unit_price: p.unitPrice })),
      p_total: total,
    });
    if (error) throw toMutationError(error);
    return (data as string | null) ?? null;
  }
}
