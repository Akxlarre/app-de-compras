import { Injectable, inject, signal } from '@angular/core';
import { BaseFacade } from './base.facade';
import { ShoppingList, ListItem } from '../models/shopping-list.model';
import { Product } from '../models/product.model';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PopulatedListItem extends ListItem {
  product?: Partial<Product>;
}

export interface ActiveShoppingList extends ShoppingList {
  list_items: PopulatedListItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ShoppingListFacade extends BaseFacade<ActiveShoppingList> {
  private supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

  readonly templates = signal<ActiveShoppingList[]>([]);
  readonly lastCompletedList = signal<ActiveShoppingList | null>(null);

  async loadTemplates(): Promise<void> {
    const familyId = await this.getOrCreateFamily();

    const { data: lastCompleted } = await this.supabase.client
      .from('shopping_lists')
      .select('*, list_items(*, product:products(id, name, category, last_price))')
      .eq('family_id', familyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    this.lastCompletedList.set((lastCompleted as unknown as ActiveShoppingList) || null);

    const { data: templatesData } = await this.supabase.client
      .from('shopping_lists')
      .select('*, list_items(*, product:products(id, name, category, last_price))')
      .eq('family_id', familyId)
      .eq('status', 'template')
      .order('created_at', { ascending: false });

    this.templates.set((templatesData as unknown as ActiveShoppingList[]) || []);
  }

  protected override async fetchData(): Promise<ActiveShoppingList> {
    // 1. Obtener la lista activa más reciente
    const { data: list, error: listError } = await this.supabase.client
      .from('shopping_lists')
      .select('*, list_items(*, product:products(id, name, category, last_price))')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (listError) throw listError;

    // Si no hay lista activa, lanzar un error o retornar un objeto vacío (depende de tu UX, aquí lanzamos error para que la UI muestre el empty-state y permita crear una)
    if (!list) {
      throw new Error('NO_ACTIVE_LIST');
    }

    this.setupRealtime(list.id);
    return list as unknown as ActiveShoppingList;
  }

  /**
   * Obtiene la familia actual del usuario o crea una por defecto.
   */
  private async getOrCreateFamily(): Promise<string> {
    // RPC SECURITY DEFINER: RLS no permite insertar familias ni membresías directamente.
    const { data, error } = await this.supabase.client.rpc('get_or_create_family');
    if (error) throw error;
    return data as string;
  }

  /**
   * Crea una nueva lista activa.
   */
  async createList(name: string): Promise<void> {
    try {
      const familyId = await this.getOrCreateFamily();

      const { error } = await this.supabase.client
        .from('shopping_lists')
        .insert({ name, family_id: familyId, status: 'active' });

      if (error) throw error;

      await this.refreshSilently();
    } catch (e) {
      this._error.set(ShoppingListFacade.sanitizeError(e));
    }
  }

  /**
   * Añade un producto a la lista.
   */
  async addItem(listId: string, productId: string, quantity: number = 1): Promise<void> {
    const currentList = this._data();
    if (!currentList) return;

    const existingItem = currentList.list_items?.find((i) => i.product?.id === productId);

    if (existingItem) {
      // Optimistic Update
      const oldQty = existingItem.quantity;
      this._data.update((list) => {
        if (!list) return list;
        const items = [...list.list_items];
        const idx = items.findIndex((i) => i.id === existingItem.id);
        if (idx !== -1) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
        }
        return { ...list, list_items: items };
      });

      const { error } = await this.supabase.client
        .from('list_items')
        .update({ quantity: oldQty + quantity })
        .eq('id', existingItem.id);

      if (error) {
        this.refreshSilently(); // rollback
        this._error.set(ShoppingListFacade.sanitizeError(error));
      }
    } else {
      const { error } = await this.supabase.client
        .from('list_items')
        .insert({ list_id: listId, product_id: productId, quantity });

      if (error) {
        this._error.set(ShoppingListFacade.sanitizeError(error));
        return;
      }
      await this.refreshSilently();
    }
  }

  /**
   * Actualiza la cantidad de un ítem en la lista.
   */
  async updateItemQuantity(itemId: string, newQuantity: number): Promise<void> {
    const list = this._data();
    if (!list) return;

    const existingItem = list.list_items?.find((i) => i.id === itemId);
    if (!existingItem) return;

    const oldQty = existingItem.quantity;

    // Optimistic Update
    this._data.update((curr) => {
      if (!curr) return curr;
      const items = [...curr.list_items];
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], quantity: newQuantity };
      }
      return { ...curr, list_items: items };
    });

    const { error } = await this.supabase.client
      .from('list_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) {
      // Rollback
      this._data.update((curr) => {
        if (!curr) return curr;
        const items = [...curr.list_items];
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx !== -1) {
          items[idx] = { ...items[idx], quantity: oldQty };
        }
        return { ...curr, list_items: items };
      });
      this._error.set(ShoppingListFacade.sanitizeError(error));
    }
  }

  /**
   * Finaliza la compra y archiva la lista actual.
   */
  async completeList(listId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('shopping_lists')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', listId);

    if (error) {
      this._error.set(ShoppingListFacade.sanitizeError(error));
      return;
    }

    // Resetear y forzar fetch. Como la lista ya no es 'active', lanzará NO_ACTIVE_LIST
    this.reset();
    await this.initialize();
  }

  /**
   * Clona los ítems de una lista a otra
   */
  async cloneListItems(sourceListId: string, targetListId: string): Promise<void> {
    const { data: itemsToClone } = await this.supabase.client
      .from('list_items')
      .select('product_id, quantity')
      .eq('list_id', sourceListId);

    if (itemsToClone && itemsToClone.length > 0) {
      const newItems = itemsToClone.map((item) => ({
        list_id: targetListId,
        product_id: item.product_id,
        quantity: item.quantity,
      }));
      await this.supabase.client.from('list_items').insert(newItems);
      await this.refreshSilently();
    }
  }

  /**
   * Guarda la lista actual como una plantilla
   */
  async saveAsTemplate(listId: string, templateName: string): Promise<void> {
    const familyId = await this.getOrCreateFamily();
    const { data: newTemplate, error: createError } = await this.supabase.client
      .from('shopping_lists')
      .insert({ name: templateName, family_id: familyId, status: 'template' })
      .select()
      .single();

    if (createError || !newTemplate) {
      this._error.set(ShoppingListFacade.sanitizeError(createError));
      return;
    }

    await this.cloneListItems(listId, newTemplate.id);
    await this.loadTemplates();
  }

  /**
   * Elimina un ítem de la lista (swipe-to-delete).
   */
  async deleteItem(itemId: string): Promise<void> {
    // Optimistic Update
    const currentData = this._data();
    if (currentData) {
      this._data.set({
        ...currentData,
        list_items: currentData.list_items.filter((i) => i.id !== itemId),
      });
    }

    const { error } = await this.supabase.client.from('list_items').delete().eq('id', itemId);

    if (error) {
      console.error('Error deleting item:', error);
      await this.refreshSilently();
    }
  }

  /**
   * Alterna el estado de is_checked de un ítem.
   */
  async toggleItemCheck(itemId: string, currentStatus: boolean): Promise<void> {
    // Optimistic UI Update
    const currentData = this._data();
    if (currentData) {
      const updatedItems = currentData.list_items.map((item) =>
        item.id === itemId ? { ...item, is_checked: !currentStatus } : item
      );
      this._data.set({ ...currentData, list_items: updatedItems });
    }

    const { error } = await this.supabase.client
      .from('list_items')
      .update({ is_checked: !currentStatus })
      .eq('id', itemId);

    if (error) {
      console.error('Error toggling item:', error);
      // Revert optimistic update
      await this.refreshSilently();
    }
  }

  /**
   * Configura la suscripción Realtime para los items de esta lista.
   */
  private setupRealtime(listId: string): void {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = this.supabase.client
      .channel(`list_items_changes_${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${listId}`,
        },
        () => {
          // Si otro miembro de la familia hace un cambio, refrescamos silenciosamente
          this.refreshSilently();
        }
      )
      .subscribe();
  }

  override dispose(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  protected static override sanitizeError(e: unknown): string {
    if (e instanceof Error && e.message === 'NO_ACTIVE_LIST') {
      return 'NO_ACTIVE_LIST';
    }
    return BaseFacade.sanitizeError(e);
  }
}
