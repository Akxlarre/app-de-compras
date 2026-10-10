import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { ListItem } from '@core/models/shopping-list.model';
import type { ItemPatch } from '@core/models/offline-queue.model';
import { MutationError, toMutationError } from '@core/utils/mutation-error.utils';

export type ListItemContent = Pick<ListItem, 'quantity'> & { product_id: string | null };

/**
 * Acceso tipado a `shop.list_items` + Realtime por lista.
 * Altas y cantidades por RPC: la BD suma si el producto ya está (spec 0011).
 * Lanza `MutationError` (`not_found`, `list_not_active`, `offline`) o el error de Supabase; un
 * UPDATE/DELETE que no afecta filas (borrado o sin permiso por RLS) es `not_found`.
 */
@Injectable({ providedIn: 'root' })
export class ListItemsRepository {
  private readonly supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client.schema('shop');
  }

  /** Agrega el producto a la lista activa; si ya está, suma la cantidad. Devuelve la fila. */
  async add(listId: string, productId: string, quantity: number): Promise<ListItem> {
    const { data, error } = await this.db.rpc('add_list_item', {
      p_list_id: listId,
      p_product_id: productId,
      p_quantity: quantity,
    });
    if (error) throw toMutationError(error);
    return data as ListItem;
  }

  /** Agrega en lote a una lista activa o plantilla, sumando lo que ya está. */
  async addMany(listId: string, items: ListItemContent[]): Promise<void> {
    const rows = items.filter((i) => i.product_id);
    if (rows.length === 0) return;
    const { error } = await this.db.rpc('add_list_items', {
      p_list_id: listId,
      p_items: rows.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    });
    if (error) throw toMutationError(error);
  }

  /** Contenido de una lista (para clonarla). */
  async findByList(listId: string): Promise<ListItemContent[]> {
    const { data, error } = await this.db
      .from('list_items')
      .select('product_id, quantity')
      .eq('list_id', listId);
    if (error) throw toMutationError(error);
    return (data as ListItemContent[] | null) ?? [];
  }

  /** Suma `delta` a la cantidad en la BD (mínimo 1). Devuelve la cantidad final. */
  async changeQuantity(itemId: string, delta: number): Promise<number> {
    const { data, error } = await this.db.rpc('change_item_quantity', {
      p_item_id: itemId,
      p_delta: delta,
    });
    if (error) throw toMutationError(error);
    return Number(data);
  }

  async setChecked(itemId: string, checked: boolean): Promise<void> {
    const { data, error } = await this.db
      .from('list_items')
      .update({ is_checked: checked })
      .eq('id', itemId)
      .select('id');
    this.assertAffected(data, error);
  }

  /** Unidad, cantidad o precio anotado: valores finales (spec 0019). */
  async update(itemId: string, patch: ItemPatch): Promise<void> {
    const { data, error } = await this.db
      .from('list_items')
      .update(patch)
      .eq('id', itemId)
      .select('id');
    this.assertAffected(data, error);
  }

  async remove(itemId: string): Promise<void> {
    const { data, error } = await this.db.from('list_items').delete().eq('id', itemId).select('id');
    this.assertAffected(data, error);
  }

  /** "Vaciar lista" (spec 0012): borra todos los ítems; si ya estaba vacía, no es error. */
  async clearList(listId: string): Promise<void> {
    const { error } = await this.db.from('list_items').delete().eq('list_id', listId);
    if (error) throw toMutationError(error);
  }

  /**
   * Avisa cuando cualquier miembro de la familia cambia un ítem de la lista.
   * @returns función que cancela la suscripción.
   */
  watchList(listId: string, onChange: () => void): () => void {
    const client = this.supabase.client;
    const channel = client
      .channel(`list_items_changes_${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'shop', table: 'list_items', filter: `list_id=eq.${listId}` },
        () => onChange()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }

  /** RLS no da error al bloquear: el UPDATE/DELETE simplemente no afecta filas. */
  private assertAffected(data: unknown, error: unknown): void {
    if (error) throw toMutationError(error);
    if (!Array.isArray(data) || data.length === 0) throw new MutationError('not_found');
  }
}
