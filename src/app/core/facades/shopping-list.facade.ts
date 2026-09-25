import { Injectable, inject, signal } from '@angular/core';
import { BaseFacade } from './base.facade';
import type { ActiveShoppingList } from '../models/shopping-list.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';
import { ToastService } from '../services/ui/toast.service';

export type { ActiveShoppingList, PopulatedListItem } from '../models/shopping-list.model';

@Injectable({
  providedIn: 'root',
})
export class ShoppingListFacade extends BaseFacade<ActiveShoppingList> {
  private readonly family = inject(FamilyRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly items = inject(ListItemsRepository);
  private readonly toast = inject(ToastService);

  /** Lista observada por Realtime y función para dejar de observarla. */
  private watched: { listId: string; stop: () => void } | null = null;

  readonly templates = signal<ActiveShoppingList[]>([]);
  readonly lastCompletedList = signal<ActiveShoppingList | null>(null);

  async loadTemplates(): Promise<void> {
    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const [lastCompleted, templates] = await Promise.all([
        this.lists.findLastCompleted(familyId),
        this.lists.findTemplates(familyId),
      ]);
      this.lastCompletedList.set(lastCompleted);
      this.templates.set(templates);
    } catch {
      // Atajos opcionales ("Repetir última compra", plantillas): si fallan, no se muestran.
    }
  }

  protected override async fetchData(): Promise<ActiveShoppingList> {
    const list = await this.lists.findLatestActive();

    // Sin lista activa la UI muestra el empty-state con "crear lista" / plantillas.
    if (!list) {
      throw new Error('NO_ACTIVE_LIST');
    }

    this.watchList(list.id);
    return list;
  }

  /**
   * Crea una nueva lista activa.
   */
  async createList(name: string): Promise<void> {
    try {
      const familyId = await this.family.getOrCreateFamilyId();
      await this.lists.create({ name, familyId, status: 'active' });
      await this.refreshSilently();
    } catch (e) {
      this.notifyError(e);
    }
  }

  /**
   * Añade un producto a la lista (si ya está, suma la cantidad).
   */
  async addItem(listId: string, productId: string, quantity: number = 1): Promise<void> {
    const currentList = this._data();
    if (!currentList) return;

    const existingItem = currentList.list_items?.find((i) => i.product?.id === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      this.patchItem(existingItem.id, { quantity: newQuantity }); // optimistic
      try {
        await this.items.updateQuantity(existingItem.id, newQuantity);
      } catch (e) {
        this.refreshSilently(); // rollback con el estado del servidor
        this.notifyError(e);
      }
      return;
    }

    try {
      await this.items.add(listId, productId, quantity);
      await this.refreshSilently();
    } catch (e) {
      this.notifyError(e);
    }
  }

  /**
   * Actualiza la cantidad de un ítem en la lista.
   */
  async updateItemQuantity(itemId: string, newQuantity: number): Promise<void> {
    const existingItem = this._data()?.list_items?.find((i) => i.id === itemId);
    if (!existingItem) return;

    const oldQuantity = existingItem.quantity;
    this.patchItem(itemId, { quantity: newQuantity }); // optimistic

    try {
      await this.items.updateQuantity(itemId, newQuantity);
    } catch (e) {
      this.patchItem(itemId, { quantity: oldQuantity }); // rollback
      this.notifyError(e);
    }
  }

  /**
   * Finaliza la compra: queda en el Historial con lo marcado. Los pendientes pasan a la lista
   * activa (`carryPending`) o se descartan.
   * @returns false si falló (la lista sigue como estaba).
   */
  async completeList(listId: string, carryPending: boolean): Promise<boolean> {
    let carriedTo: string | null;
    try {
      carriedTo = await this.lists.complete(listId, carryPending);
    } catch (e) {
      this.notifyError(e);
      return false;
    }

    this.toast.success(
      'Compra finalizada',
      carriedTo ? 'Los pendientes pasaron a tu próxima lista.' : 'Quedó guardada en tu historial.'
    );

    // Carga completa: la lista activa ahora es la que recibió los pendientes (o no hay ninguna).
    this.dispose();
    this.reset();
    await Promise.all([this.initialize(), this.loadTemplates()]);
    return true;
  }

  /**
   * Copia los ítems (producto + cantidad) de una lista a otra.
   */
  async cloneListItems(sourceListId: string, targetListId: string): Promise<void> {
    try {
      const source = await this.items.findByList(sourceListId);
      if (source.length === 0) return;

      await this.items.addMany(
        source.map((item) => ({
          list_id: targetListId,
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
      await this.refreshSilently();
    } catch (e) {
      this.notifyError(e);
    }
  }

  /**
   * Guarda la lista actual como plantilla reutilizable.
   */
  async saveAsTemplate(listId: string, templateName: string): Promise<void> {
    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const template = await this.lists.create({
        name: templateName,
        familyId,
        status: 'template',
      });
      await this.cloneListItems(listId, template.id);
      await this.loadTemplates();
    } catch (e) {
      this.notifyError(e);
    }
  }

  /**
   * Elimina un ítem de la lista (swipe-to-delete).
   */
  async deleteItem(itemId: string): Promise<void> {
    this._data.update((list) =>
      list ? { ...list, list_items: list.list_items.filter((i) => i.id !== itemId) } : list
    ); // optimistic

    try {
      await this.items.remove(itemId);
    } catch (e) {
      this.notifyError(e);
      await this.refreshSilently(); // rollback con el estado del servidor
    }
  }

  /**
   * Alterna el estado de is_checked de un ítem.
   */
  async toggleItemCheck(itemId: string, currentStatus: boolean): Promise<void> {
    this.patchItem(itemId, { is_checked: !currentStatus }); // optimistic

    try {
      await this.items.setChecked(itemId, !currentStatus);
    } catch (e) {
      this.notifyError(e);
      await this.refreshSilently(); // rollback con el estado del servidor
    }
  }

  override dispose(): void {
    this.watched?.stop();
    this.watched = null;
  }

  override reset(): void {
    super.reset();
    this.templates.set([]);
    this.lastCompletedList.set(null);
  }

  /** Errores de mutaciones: toast (swr-pattern.md). `_error` es solo de la carga: taparía la lista. */
  private notifyError(e: unknown): void {
    this.toast.error('No se pudo guardar el cambio', ShoppingListFacade.sanitizeError(e));
  }

  protected static override sanitizeError(e: unknown): string {
    if (e instanceof Error && e.message === 'NO_ACTIVE_LIST') {
      return 'NO_ACTIVE_LIST';
    }
    return BaseFacade.sanitizeError(e);
  }

  /** Si otro miembro de la familia cambia la lista, refrescamos silenciosamente. */
  private watchList(listId: string): void {
    if (this.watched?.listId === listId) return;
    this.dispose();
    this.watched = { listId, stop: this.items.watchList(listId, () => this.refreshSilently()) };
  }

  private patchItem(
    itemId: string,
    patch: Partial<ActiveShoppingList['list_items'][number]>
  ): void {
    this._data.update((list) =>
      list
        ? {
            ...list,
            list_items: list.list_items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
          }
        : list
    );
  }
}
