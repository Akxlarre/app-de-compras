import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { BaseFacade } from './base.facade';
import type { ActiveShoppingList } from '../models/shopping-list.model';
import type { ItemPatch, QueuedChange } from '../models/offline-queue.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';
import { ToastService } from '../services/ui/toast.service';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { NetworkStatusService } from '../services/infrastructure/network-status.service';
import { OfflineStoreService } from '../services/infrastructure/offline-store.service';
import { MutationError, isNetworkFailure, toMutationError } from '../utils/mutation-error.utils';
import { applyQueue, enqueue } from '../utils/offline-queue.utils';

export type { ActiveShoppingList, PopulatedListItem } from '../models/shopping-list.model';

const OFFLINE_DETAIL = 'Sin conexión: esto se puede hacer cuando vuelva la señal.';

const NOTHING_CHECKED_DETAIL =
  'Sin nada marcado no es una compra. Para tirar la lista, usa "Vaciar lista".';

/** Nombre de la lista activa; cerrada se muestra con la fecha (spec 0012). */
export const DEFAULT_LIST_NAME = 'Lista de compras';

@Injectable({
  providedIn: 'root',
})
export class ShoppingListFacade extends BaseFacade<ActiveShoppingList> {
  private readonly family = inject(FamilyRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly items = inject(ListItemsRepository);
  private readonly toast = inject(ToastService);
  private readonly network = inject(NetworkStatusService);
  private readonly offline = inject(OfflineStoreService);

  /** Lista observada por Realtime y función para dejar de observarla. */
  private watched: { listId: string; stop: () => void } | null = null;

  /** Familia de la lista cargada (para avisar "Ya no eres parte de «X»"). */
  private knownFamily: { id: string; name: string | null } | null = null;
  private readonly lostFamilyNotified = new Set<string>();

  /** Cambios hechos sin conexión, pendientes de enviar (spec 0011). */
  private queue: QueuedChange[] = this.offline.loadQueue();
  private flushing = false;

  readonly templates = signal<ActiveShoppingList[]>([]);
  readonly lastCompletedList = signal<ActiveShoppingList | null>(null);

  readonly isOnline = this.network.online;
  private readonly _pendingChanges = signal(this.queue.length);
  /** Cambios guardados sin conexión que aún no llegan a la BD. */
  readonly pendingChanges = this._pendingChanges.asReadonly();
  private readonly _familyChanged = signal(0);
  /** Sube cuando el usuario pasó a otra familia (lo quitaron): la página recarga la familia. */
  readonly familyChanged = this._familyChanged.asReadonly();
  readonly hasPendingChanges = computed(() => this._pendingChanges() > 0);
  /** Sin nada marcado no es una compra: Finalizar se deshabilita (spec 0012). */
  readonly hasChecked = computed(() => !!this._data()?.list_items.some((i) => i.is_checked));

  constructor() {
    super();
    // La cola y la familia son del usuario (OfflineStoreService borra su copia guardada).
    inject(SessionScopeService).register(() => {
      this.queue = [];
      this._pendingChanges.set(0);
      this.knownFamily = null;
    });
    // Al volver la red se envía la cola.
    effect(() => {
      if (this.network.online()) untracked(() => void this.flushQueue());
    });
  }

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
    let list: ActiveShoppingList | null;
    try {
      list = await this.lists.findLatestActive();
    } catch (e) {
      // Sin red: la última lista guardada con los cambios pendientes encima (AC8).
      const snapshot = this.offline.loadSnapshot();
      if (isNetworkFailure(toMutationError(e)) && snapshot) {
        this.network.reportNetworkFailure();
        return applyQueue(snapshot, this.queue);
      }
      throw e;
    }
    this.network.reportSuccess();

    // La lista es de otra familia (o no hay): ¿me quitaron? (RLS ya devuelve la de mi familia nueva).
    if (this.knownFamily && this.knownFamily.id !== list?.family_id) {
      // Sin lista en la familia nueva, un refresco silencioso dejaría la vieja en pantalla.
      if ((await this.checkLostFamily()) && !list) queueMicrotask(() => this.reloadAfterClose());
    }

    this.offline.saveSnapshot(list);

    // Sin lista activa la UI muestra el empty-state con "crear lista" / plantillas.
    if (!list) {
      throw new Error('NO_ACTIVE_LIST');
    }

    // El nombre de la familia solo sirve para un aviso futuro: no se espera, la lista se muestra
    // ya (spec 0013, Q5: esa consulta sumaba ~0,5 s a cada entrada).
    void this.rememberFamily(list.family_id);
    this.watchList(list.id);
    return applyQueue(list, this.queue);
  }

  /**
   * Crea la lista activa. Si ya había una (doble toque, otro miembro), se muestra esa: la BD
   * admite una sola por familia (spec 0011).
   */
  async createList(name: string): Promise<void> {
    if (!this.requireOnline()) return;
    try {
      await this.lists.startActive(name);
      await this.refreshSilently();
    } catch (e) {
      await this.handleMutationError(e);
    }
  }

  /**
   * Sin lista activa: crea la lista y copia en ella los ítems de otra (la última compra o una
   * plantilla) en un paso (spec 0010). Si ya había una lista activa no copia (un doble toque no
   * duplica cantidades). Si falla la copia, la lista queda creada (vacía) y se avisa.
   * @returns false si algo falló.
   */
  async startListFrom(sourceListId: string): Promise<boolean> {
    if (!this.requireOnline()) return false;
    let started: { id: string; created: boolean };
    try {
      started = await this.lists.startActive(DEFAULT_LIST_NAME);
    } catch (e) {
      await this.handleMutationError(e);
      return false;
    }

    let ok = true;
    if (started.created) {
      try {
        const source = await this.items.findByList(sourceListId);
        await this.items.addMany(started.id, source);
      } catch (e) {
        await this.handleMutationError(e);
        ok = false;
      }
    }
    await this.refreshSilently();
    return ok;
  }

  /**
   * Añade un producto a la lista; si ya está, la BD suma la cantidad (una sola fila aunque se
   * toque dos veces o lo agreguen dos miembros a la vez).
   */
  async addItem(listId: string, productId: string, quantity: number = 1): Promise<void> {
    if (!this._data() || !this.requireOnline()) return;

    const existing = this._data()?.list_items?.find((i) => i.product?.id === productId);
    if (existing) this.patchItem(existing.id, { quantity: existing.quantity + quantity });

    try {
      const row = await this.items.add(listId, productId, quantity);
      if (existing) this.patchItem(existing.id, { quantity: Number(row.quantity) });
      else await this.refreshSilently();
    } catch (e) {
      if (existing) this.patchItem(existing.id, { quantity: existing.quantity });
      await this.handleMutationError(e);
    }
  }

  /**
   * Agrega varios productos (1 de cada uno) a la lista activa: "Agregar todas" de las
   * sugerencias (spec 0014). Lo que ya está suma. @returns false si no se pudo.
   */
  async addProducts(productIds: string[]): Promise<boolean> {
    const list = this._data();
    if (!list || productIds.length === 0 || !this.requireOnline()) return false;
    try {
      await this.items.addMany(
        list.id,
        productIds.map((product_id) => ({ product_id, quantity: 1 }))
      );
      await this.refreshSilently();
      return true;
    } catch (e) {
      await this.handleMutationError(e);
      return false;
    }
  }

  /**
   * Suma `delta` a la cantidad (mínimo 1). La BD suma sobre su valor, así dos miembros tocando
   * `+` a la vez no se pisan. Sin red se guarda en la cola.
   */
  async updateItemQuantity(itemId: string, delta: number): Promise<void> {
    const item = this._data()?.list_items?.find((i) => i.id === itemId);
    if (!item || delta === 0 || item.quantity + delta < 1) return;

    this.patchItem(itemId, { quantity: item.quantity + delta }); // optimistic
    const change: QueuedChange = { kind: 'quantity', itemId, delta };
    if (!this.network.online()) {
      this.queueChange(change);
      return;
    }

    try {
      const quantity = await this.items.changeQuantity(itemId, delta);
      this.patchItem(itemId, { quantity });
    } catch (e) {
      await this.handleMutationError(e, change, () =>
        this.patchItem(itemId, { quantity: this.currentQuantity(itemId) - delta })
      );
    }
  }

  /**
   * Unidad y cantidad (spec 0019 D4) o precio anotado al marcar (D5): valores finales, al
   * instante. Sin red se guardan en la cola; si el servidor lo rechaza, vuelven a lo anterior.
   */
  async editItem(itemId: string, patch: ItemPatch): Promise<void> {
    const item = this._data()?.list_items?.find((i) => i.id === itemId);
    if (!item) return;
    const prev = Object.fromEntries(
      Object.keys(patch).map((k) => [k, item[k as keyof ItemPatch]])
    ) as ItemPatch;

    this.patchItem(itemId, patch); // optimistic
    const change: QueuedChange = { kind: 'patch', itemId, patch };
    if (!this.network.online()) {
      this.queueChange(change);
      return;
    }

    try {
      await this.items.update(itemId, patch);
    } catch (e) {
      await this.handleMutationError(e, change, () => this.patchItem(itemId, prev));
    }
  }

  /**
   * Finaliza la compra: queda en el Historial con lo marcado. Los pendientes pasan a la lista
   * activa (`carryPending`) o se descartan.
   * @returns false si falló (la lista sigue como estaba).
   */
  async completeList(listId: string, carryPending: boolean): Promise<boolean> {
    if (!this.requireOnline()) return false;
    let carriedTo: string | null;
    try {
      carriedTo = await this.lists.complete(listId, carryPending);
    } catch (e) {
      await this.handleMutationError(e);
      return false;
    }

    this.toast.success(
      'Compra finalizada',
      carriedTo ? 'Los pendientes pasaron a tu próxima lista.' : 'Quedó guardada en tu historial.'
    );

    await this.reloadAfterClose();
    return true;
  }

  /**
   * Recarga completa después de cerrar una compra (aquí o con `PurchaseCloseFacade`): la lista
   * activa ahora es la que recibió los pendientes, o no hay ninguna.
   */
  async reloadAfterClose(): Promise<void> {
    this.dispose();
    this.reset();
    await Promise.all([this.initialize(), this.loadTemplates()]);
  }

  /**
   * Copia los ítems (producto + cantidad) de una lista a otra; lo que ya está suma cantidad.
   */
  async cloneListItems(sourceListId: string, targetListId: string): Promise<void> {
    if (!this.requireOnline()) return;
    try {
      const source = await this.items.findByList(sourceListId);
      if (source.length === 0) return;

      await this.items.addMany(targetListId, source);
      await this.refreshSilently();
    } catch (e) {
      await this.handleMutationError(e);
    }
  }

  /**
   * Guarda la lista actual como plantilla reutilizable. Sin nombre avisa; al guardar confirma
   * (spec 0013, Q30). @returns false si no se guardó.
   */
  async saveAsTemplate(listId: string, templateName: string): Promise<boolean> {
    const name = this.validTemplateName(templateName);
    if (!name || !this.requireOnline()) return false;
    try {
      const familyId = await this.family.getOrCreateFamilyId();
      const template = await this.lists.create({ name, familyId, status: 'template' });
      await this.cloneListItems(listId, template.id);
      await this.loadTemplates();
      this.toast.success('Plantilla guardada', `«${name}» queda en tus atajos.`);
      return true;
    } catch (e) {
      await this.handleMutationError(e);
      return false;
    }
  }

  /** Renombra una plantilla (optimista, con rollback) (spec 0013, Q28). */
  async renameTemplate(templateId: string, newName: string): Promise<boolean> {
    const name = this.validTemplateName(newName);
    if (!name || !this.requireOnline()) return false;
    const prev = this.templates();
    this.templates.update((ts) => ts.map((t) => (t.id === templateId ? { ...t, name } : t)));
    try {
      await this.lists.renameTemplate(templateId, name);
      return true;
    } catch (e) {
      this.templates.set(prev);
      await this.handleMutationError(e);
      return false;
    }
  }

  /** Borra una plantilla (optimista, con rollback) (spec 0013, Q28). */
  async deleteTemplate(templateId: string): Promise<boolean> {
    if (!this.requireOnline()) return false;
    const prev = this.templates();
    this.templates.update((ts) => ts.filter((t) => t.id !== templateId));
    try {
      await this.lists.deleteTemplate(templateId);
      return true;
    } catch (e) {
      this.templates.set(prev);
      await this.handleMutationError(e);
      return false;
    }
  }

  /** Nombre de plantilla recortado (1 a 40 caracteres); si no sirve avisa y devuelve null. */
  private validTemplateName(raw: string): string | null {
    const name = (raw ?? '').trim();
    if (name.length >= 1 && name.length <= 40) return name;
    this.toast.warning('Ponle un nombre a la plantilla', 'De 1 a 40 caracteres, ej. «Asado».');
    return null;
  }

  /**
   * "Vaciar lista" (spec 0012): borra todos los ítems de la lista activa sin crear una compra.
   * @returns false si no se pudo (sin red o error; la lista vuelve a como estaba).
   */
  async clearList(): Promise<boolean> {
    const list = this._data();
    if (!list || !this.requireOnline()) return false;

    this._data.set({ ...list, list_items: [] }); // optimistic
    try {
      await this.items.clearList(list.id);
      return true;
    } catch (e) {
      this._data.set(list); // rollback
      await this.handleMutationError(e);
      return false;
    }
  }

  /** Quita un ítem (deslizar) y ofrece "Deshacer" (spec 0013, Q27). */
  async deleteItem(itemId: string): Promise<void> {
    if (!this.requireOnline()) return;
    const list = this._data();
    const removed = list?.list_items.find((i) => i.id === itemId);
    this._data.update((l) =>
      l ? { ...l, list_items: l.list_items.filter((i) => i.id !== itemId) } : l
    ); // optimistic

    try {
      await this.items.remove(itemId);
    } catch (e) {
      await this.handleMutationError(e);
      await this.refreshSilently(); // rollback con el estado del servidor
      return;
    }

    const productId = removed?.product?.id ?? removed?.product_id;
    if (!list || !removed || !productId) return;
    void this.toast.action(`Quitaste ${removed.product?.name ?? 'el producto'}`, 'Deshacer', () =>
      this.restoreItem(list.id, productId, removed.quantity || 1, removed.is_checked)
    );
  }

  /** Deshacer: lo vuelve a agregar con su cantidad (y marcado si lo estaba). */
  private async restoreItem(
    listId: string,
    productId: string,
    quantity: number,
    checked: boolean
  ): Promise<void> {
    try {
      const row = await this.items.add(listId, productId, quantity);
      if (checked) await this.items.setChecked(row.id, true);
      await this.refreshSilently();
    } catch (e) {
      await this.handleMutationError(e);
    }
  }

  /**
   * Alterna el estado de is_checked de un ítem. Sin red se guarda en la cola.
   */
  async toggleItemCheck(itemId: string, currentStatus: boolean): Promise<void> {
    const checked = !currentStatus;
    this.patchItem(itemId, { is_checked: checked }); // optimistic
    const change: QueuedChange = { kind: 'check', itemId, checked };
    if (!this.network.online()) {
      this.queueChange(change);
      return;
    }

    try {
      await this.items.setChecked(itemId, checked);
    } catch (e) {
      await this.handleMutationError(e, change, () =>
        this.patchItem(itemId, { is_checked: currentStatus })
      );
    }
  }

  /**
   * Envía los cambios guardados sin conexión, en orden. Los que la BD rechaza (el ítem ya no
   * está, la compra se cerró) se descartan y se avisa una vez con cuántos fueron; un nuevo
   * fallo de red corta y deja el resto para la próxima.
   */
  async flushQueue(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    let rejected = 0;
    try {
      while (this.queue.length > 0) {
        const [change] = this.queue;
        try {
          if (change.kind === 'check') await this.items.setChecked(change.itemId, change.checked);
          else if (change.kind === 'patch') await this.items.update(change.itemId, change.patch);
          else await this.items.changeQuantity(change.itemId, change.delta);
        } catch (e) {
          if (isNetworkFailure(toMutationError(e))) {
            this.network.reportNetworkFailure();
            return;
          }
          rejected++;
        }
        this.setQueue(this.queue.slice(1));
      }
    } finally {
      this.flushing = false;
    }

    if (rejected > 0) {
      this.toast.warning(
        rejected === 1
          ? '1 cambio no se pudo guardar'
          : `${rejected} cambios no se pudieron guardar`,
        'El producto ya no estaba en la lista o la compra se cerró.'
      );
    }
    await this.refreshSilently();
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

  /**
   * Errores de mutaciones (swr-pattern.md: toast; `_error` es solo de la carga y taparía la lista).
   * - Sin red: si el cambio va en la cola, se guarda (queda aplicado en pantalla).
   * - 0 filas / `not_found`: o lo borró otro miembro o ya no eres de la familia.
   * - `list_not_active`: la compra ya se cerró; se recarga.
   */
  private async handleMutationError(
    e: unknown,
    queueable?: QueuedChange,
    rollback?: () => void
  ): Promise<void> {
    const error = toMutationError(e);

    if (isNetworkFailure(error)) {
      this.network.reportNetworkFailure();
      if (queueable) {
        this.queueChange(queueable);
        return;
      }
      rollback?.();
      this.toast.error('Sin conexión', 'No se guardó. Intenta cuando vuelva la señal.');
      return;
    }

    rollback?.();
    if (error instanceof MutationError && error.code === 'not_found') {
      // Recarga completa: la lista de la familia anterior no debe quedar en pantalla.
      if (await this.checkLostFamily()) {
        await this.reloadAfterClose();
        return;
      }
      this.toast.warning('Ese producto ya no está en la lista', 'Otro miembro lo cambió.');
      await this.refreshSilently();
      return;
    }
    if (error instanceof MutationError && error.code === 'nothing_checked') {
      this.toast.warning('Marca lo que compraste para finalizar', NOTHING_CHECKED_DETAIL);
      await this.refreshSilently();
      return;
    }
    if (error instanceof MutationError && error.code === 'list_not_active') {
      this.toast.warning('Esta compra ya se cerró', 'Te mostramos la lista actual.');
      await this.reloadAfterClose();
      return;
    }
    this.toast.error('No se pudo guardar el cambio', ShoppingListFacade.sanitizeError(e));
  }

  /**
   * ¿Me quitaron de la familia de la lista? Si mi familia ya es otra, avisa una vez
   * "Ya no eres parte de «X»" y descarta lo pendiente de esa lista (AC6). Quien llama recarga.
   */
  private async checkLostFamily(): Promise<boolean> {
    const previous = this.knownFamily;
    if (!previous) return false;

    let current: string;
    try {
      current = await this.family.getOrCreateFamilyId();
    } catch {
      return false;
    }
    if (current === previous.id) return false;

    this.knownFamily = null;
    this.setQueue([]);
    this.offline.saveSnapshot(null);
    if (!this.lostFamilyNotified.has(previous.id)) {
      this.lostFamilyNotified.add(previous.id);
      this.toast.warning(
        previous.name
          ? `Ya no eres parte de «${previous.name}»`
          : 'Ya no eres parte de esa familia',
        'Ahora estás en tu propia familia.'
      );
    }
    this._familyChanged.update((n) => n + 1);
    return true;
  }

  /** Nombre de la familia de la lista, para el aviso si me quitan. Opcional: si falla, sin nombre. */
  private async rememberFamily(familyId: string): Promise<void> {
    if (this.knownFamily?.id === familyId) return;
    this.knownFamily = { id: familyId, name: null };
    try {
      const mine = await this.family.findMine();
      if (mine?.id === familyId && this.knownFamily?.id === familyId) {
        this.knownFamily = { id: familyId, name: mine.name };
      }
    } catch {
      // sin nombre
    }
  }

  /** Acciones que no van en la cola: sin red avisan y no hacen nada (la UI ya las deshabilita). */
  private requireOnline(): boolean {
    if (this.network.online()) return true;
    this.toast.info('Sin conexión', OFFLINE_DETAIL);
    return false;
  }

  private queueChange(change: QueuedChange): void {
    this.setQueue(enqueue(this.queue, change));
  }

  private setQueue(queue: QueuedChange[]): void {
    this.queue = queue;
    this.offline.saveQueue(queue);
    this._pendingChanges.set(queue.length);
  }

  private currentQuantity(itemId: string): number {
    return this._data()?.list_items.find((i) => i.id === itemId)?.quantity ?? 1;
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
