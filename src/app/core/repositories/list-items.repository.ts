import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { ListItem } from '@core/models/shopping-list.model';

export type NewListItem = Pick<ListItem, 'list_id' | 'quantity'> & { product_id: string | null };
export type ListItemContent = Pick<ListItem, 'quantity'> & { product_id: string | null };

/** Acceso tipado a `shop.list_items` + Realtime por lista. Lanza el error de Supabase. */
@Injectable({ providedIn: 'root' })
export class ListItemsRepository {
  private readonly supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client.schema('shop');
  }

  async add(listId: string, productId: string, quantity: number): Promise<void> {
    const { error } = await this.db
      .from('list_items')
      .insert({ list_id: listId, product_id: productId, quantity });
    if (error) throw error;
  }

  async addMany(items: NewListItem[]): Promise<void> {
    if (items.length === 0) return;
    const { error } = await this.db.from('list_items').insert(items);
    if (error) throw error;
  }

  /** Contenido de una lista (para clonarla). */
  async findByList(listId: string): Promise<ListItemContent[]> {
    const { data, error } = await this.db
      .from('list_items')
      .select('product_id, quantity')
      .eq('list_id', listId);
    if (error) throw error;
    return (data as ListItemContent[] | null) ?? [];
  }

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    const { error } = await this.db.from('list_items').update({ quantity }).eq('id', itemId);
    if (error) throw error;
  }

  async setChecked(itemId: string, checked: boolean): Promise<void> {
    const { error } = await this.db
      .from('list_items')
      .update({ is_checked: checked })
      .eq('id', itemId);
    if (error) throw error;
  }

  async remove(itemId: string): Promise<void> {
    const { error } = await this.db.from('list_items').delete().eq('id', itemId);
    if (error) throw error;
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
}
