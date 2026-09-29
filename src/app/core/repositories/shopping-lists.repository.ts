import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type {
  ActiveShoppingList,
  ShoppingList,
  ShoppingListStatus,
} from '@core/models/shopping-list.model';
import type { ManualPrice } from '@core/models/receipt.model';

/** Lista con ítems y el producto embebido de cada ítem. */
const WITH_ITEMS = '*, list_items(*, product:products(id, name, category, last_price))';

export interface NewShoppingList {
  name: string;
  familyId: string;
  status: ShoppingListStatus;
}

/** Acceso tipado a `shop.shopping_lists`. Lanza el error de Supabase. */
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
    if (error) throw error;
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
    if (error) throw error;
    return (data as ActiveShoppingList | null) ?? null;
  }

  async findTemplates(familyId: string): Promise<ActiveShoppingList[]> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('family_id', familyId)
      .eq('status', 'template')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ActiveShoppingList[] | null) ?? [];
  }

  async create(input: NewShoppingList): Promise<ShoppingList> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .insert({ name: input.name, family_id: input.familyId, status: input.status })
      .select()
      .single();
    if (error) throw error;
    return data as ShoppingList;
  }

  /** Compras finalizadas de la familia, más recientes primero (para el Historial). */
  async findCompleted(familyId: string, limit = 50): Promise<ActiveShoppingList[]> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('family_id', familyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
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
    if (error) throw error;
    return (data as string | null) ?? null;
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
    if (error) throw error;
    return (data as string | null) ?? null;
  }
}
