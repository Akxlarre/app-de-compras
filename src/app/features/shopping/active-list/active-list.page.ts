import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  DestroyRef,
  signal,
  computed,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import {
  DEFAULT_LIST_NAME,
  ShoppingListFacade,
  type PopulatedListItem,
} from '@core/facades/shopping-list.facade';
import type { ActiveShoppingList } from '@core/models/shopping-list.model';
import { FamilyFacade } from '@core/facades/family.facade';
import { PurchaseCloseFacade, type CloseMode } from '@core/facades/purchase-close.facade';

type CloseMethod = CloseMode | 'later';

const SWIPE_HINT_KEY = 'shop.hint.swipe-delete.v1';
const VIEW_KEY = 'shop.list.view.v1';
/** Cuánto queda a la vista "¿Precio?" después de marcar, si no se toca (spec 0019 D5). */
export const PRICE_PROMPT_MS = 6000;
/** Cuánto hay que mantener apretada una fila para abrir su detalle (spec 0021 D3). */
export const LONG_PRESS_MS = 500;

/** Una fila de Mi Lista: un ítem o el encabezado de un pasillo. */
interface ListRow {
  key: string;
  item?: PopulatedListItem;
  aisle?: string;
  pending?: number;
}

function readView(): string | null {
  try {
    return localStorage.getItem(VIEW_KEY);
  } catch {
    return null;
  }
}

function writeView(view: 'aisle' | 'added'): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Sin almacenamiento: vuelve a "Por pasillo" la próxima vez.
  }
}

/** Preferencias de UI por dispositivo; sin almacenamiento (modo privado) se comporta como "no visto". */
function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Sin almacenamiento: la pista vuelve a aparecer la próxima vez.
  }
}
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { sortListItems } from '@core/utils/shopping-list.utils';
import { groupByAisle } from '@core/utils/aisles.utils';
import { pendingListText } from '@core/utils/share-list.utils';
import { ShareService } from '@core/services/share.service';
import { ToastService } from '@core/services/ui/toast.service';
import { formatQuantity, hasStepper, isDecimalUnit } from '@core/utils/units.utils';
import { parsePrice } from '@core/utils/price.utils';
import type { ItemPatch } from '@core/models/offline-queue.model';
import { ItemDetailSheetComponent, type ItemDetail } from './item-detail-sheet.component';
import { restockSuggestions, snoozeUntil } from '@core/utils/restock.utils';
import { RestockFacade } from '@core/facades/restock.facade';
import type { RestockSuggestion } from '@core/models/restock.model';
import { RestockStripComponent } from './restock-strip.component';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ProductSearchComponent } from '../product-search/product-search.component';
import { ListShortcutsComponent } from './list-shortcuts.component';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  IonList,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  AlertController,
  NavController,
} from '@ionic/angular';

@Component({
  selector: 'app-active-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CheckboxModule,
    AppHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonBlockComponent,
    IconComponent,
    ProductSearchComponent,
    ListShortcutsComponent,
    RestockStripComponent,
    ItemDetailSheetComponent,
    ConfirmDialogModule,
    IonList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
  ],
  templateUrl: './active-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveListPage implements OnInit {
  public facade = inject(ShoppingListFacade);
  private destroyRef = inject(DestroyRef);
  private nav = inject(NavController);
  private family = inject(FamilyFacade);
  private close = inject(PurchaseCloseFacade);
  private alertController = inject(AlertController);
  private gsap = inject(GsapAnimationsService);
  private cdr = inject(ChangeDetectorRef);
  private restock = inject(RestockFacade);
  private sharing = inject(ShareService);
  private toast = inject(ToastService);

  @ViewChild('ionList', { read: ElementRef }) listElementRef?: ElementRef;

  constructor() {
    // Me quitaron de la familia (spec 0011): nombres y miembros pasan a ser los de la nueva.
    effect(() => {
      if (this.facade.familyChanged() > 0) untracked(() => this.family.loadMyFamily());
    });
  }

  public isSearchOpen = signal(false);

  /** "Por pasillo" (por defecto) o "Como la agregué"; se recuerda en el teléfono (spec 0019 D3). */
  readonly byAisle = signal(readView() !== 'added');

  setView(byAisle: boolean): void {
    this.byAisle.set(byAisle);
    writeView(byAisle ? 'aisle' : 'added');
  }

  /**
   * Filas de la lista: por pasillo, con un encabezado por pasillo y los marcados al final de cada
   * uno; o como se agregó, pendientes arriba y marcados abajo (Q19).
   */
  readonly rows = computed<ListRow[]>(() => {
    const items = this.facade.data()?.list_items ?? [];
    if (!this.byAisle()) return sortListItems(items).map((item) => ({ key: item.id, item }));
    return groupByAisle(items).flatMap((g) => [
      { key: `aisle:${g.aisle}`, aisle: g.aisle, pending: g.pending },
      ...g.items.map((item) => ({ key: item.id, item })),
    ]);
  });

  readonly hasStepper = hasStepper;
  readonly formatQuantity = formatQuantity;

  /** Precio que se muestra: el anotado al marcar o, si no, el último (spec 0019 D5). */
  priceOf(item: PopulatedListItem): number | null {
    return item.unit_price ?? item.product?.last_price ?? null;
  }

  /** "/kg" en lo que se compra a granel. */
  priceUnit(item: PopulatedListItem): string {
    return isDecimalUnit(item.unit) ? `/${item.unit}` : '';
  }

  // ── Detalle del ítem: unidad, cantidad y precio (D4) ───────────────────────
  readonly detail = signal<ItemDetail | null>(null);

  openDetail(item: PopulatedListItem, event?: Event): void {
    event?.stopPropagation();
    this.detail.set({
      id: item.id,
      productId: item.product?.id ?? item.product_id ?? null,
      name: item.product?.name ?? 'Producto',
      quantity: item.quantity || 1,
      unit: item.unit ?? 'un',
      unitPrice: item.unit_price ?? null,
      notes: item.notes ?? null,
      addedBy: this.addedByDetail(item),
    });
  }

  // ── Lista compartida (spec 0024) ───────────────────────────────────────────
  /** "Pedido por Ana": en un pendiente que agregó otro miembro (D1). */
  addedByLabel(item: PopulatedListItem): string | null {
    if (item.is_checked || !item.added_by || !this.family.hasOtherMembers()) return null;
    const name = this.family.memberNames().get(item.added_by);
    return name && name !== 'Tú' ? `Pedido por ${name}` : null;
  }

  private addedByDetail(item: PopulatedListItem): string | null {
    const name = item.added_by ? this.family.memberNames().get(item.added_by) : undefined;
    if (!name) return null;
    return name === 'Tú' ? 'Lo agregaste tú' : `Lo agregó ${name}`;
  }

  /** Los pendientes como texto para WhatsApp; null si no hay (D2). */
  readonly shareText = computed(() => pendingListText(this.facade.data()?.list_items ?? []));

  async share(): Promise<void> {
    const text = this.shareText();
    if (!text) return;
    const result = await this.sharing.openWhatsApp(text);
    if (result === 'copied')
      this.toast.info('Lista copiada', 'Pégala en WhatsApp o donde quieras.');
    else if (result === 'failed') this.toast.error('No se pudo compartir la lista');
  }

  /** "Ver ficha del producto" desde el detalle (spec 0021 D4). */
  openProduct(productId: string): void {
    this.detail.set(null);
    this.nav.navigateForward(`/app/products/${productId}`);
  }

  // ── Pulsación larga en la fila: abre el detalle (spec 0021 D3) ─────────────
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private pressStart: { x: number; y: number } | null = null;
  /** El "click" que sigue a una pulsación larga no marca el ítem. */
  private longPressed = false;

  startPress(item: PopulatedListItem, event: PointerEvent): void {
    this.cancelPress();
    this.longPressed = false;
    this.pressStart = { x: event.clientX, y: event.clientY };
    this.pressTimer = setTimeout(() => {
      this.pressTimer = null;
      this.longPressed = true;
      this.openDetail(item);
    }, LONG_PRESS_MS);
  }

  /** Moverse más de unos píxeles (deslizar para borrar, hacer scroll) no es una pulsación larga. */
  movePress(event: PointerEvent): void {
    if (!this.pressStart) return;
    const dx = event.clientX - this.pressStart.x;
    const dy = event.clientY - this.pressStart.y;
    if (Math.hypot(dx, dy) > 10) this.cancelPress();
  }

  cancelPress(): void {
    if (this.pressTimer) clearTimeout(this.pressTimer);
    this.pressTimer = null;
    this.pressStart = null;
  }

  /** Toque en la fila: marca, salvo que haya sido una pulsación larga. */
  tapItem(itemId: string, currentStatus: boolean): void {
    if (this.longPressed) {
      this.longPressed = false;
      return;
    }
    this.toggleItem(itemId, currentStatus);
  }

  saveDetail(change: { itemId: string; patch: ItemPatch }): void {
    void this.facade.editItem(change.itemId, change.patch);
    this.detail.set(null);
  }

  // ── "¿Precio?" al marcar (D5): unos segundos, sin bloquear ─────────────────
  readonly pricePrompt = signal<{ id: string; name: string; unit: string } | null>(null);
  private promptTimer: ReturnType<typeof setTimeout> | null = null;

  private askPrice(item: PopulatedListItem): void {
    this.pricePrompt.set({
      id: item.id,
      name: item.product?.name ?? 'el producto',
      unit: isDecimalUnit(item.unit) ? ` por ${item.unit}` : '',
    });
    this.releasePrompt();
  }

  /** Mientras se escribe, no se cierra. */
  holdPrompt(): void {
    if (this.promptTimer) clearTimeout(this.promptTimer);
    this.promptTimer = null;
  }

  /** Se cierra sola si no se toca. */
  releasePrompt(): void {
    this.holdPrompt();
    this.promptTimer = setTimeout(() => this.pricePrompt.set(null), PRICE_PROMPT_MS);
  }

  savePrompt(raw: string): void {
    const prompt = this.pricePrompt();
    const price = parsePrice(raw.replace(/\D/g, ''));
    this.holdPrompt();
    this.pricePrompt.set(null);
    if (prompt && price !== null && price > 0) {
      void this.facade.editItem(prompt.id, { unit_price: price });
    }
  }

  // Pendientes arriba, marcados abajo; cada grupo en orden de alta (Q19).
  public sortedListItems = computed(() => sortListItems(this.facade.data()?.list_items ?? []));

  // KPIs
  public listSummary = computed(() => {
    const list = this.facade.data();
    if (!list || !list.list_items) return { total: 0, checked: 0, pending: 0, estimatedCost: 0 };

    let checked = 0;
    let estimatedCost = 0;

    for (const item of list.list_items) {
      if (item.is_checked) checked++;

      // Lo anotado al marcar manda sobre el último precio (spec 0019 D5).
      const price = this.priceOf(item) ?? 0;
      estimatedCost += (item.quantity || 1) * price;
    }

    return {
      total: list.list_items.length,
      checked,
      pending: list.list_items.length - checked,
      estimatedCost,
    };
  });

  /** "Te puede faltar": lo que toca reponer y no está en la lista (spec 0014). */
  readonly suggestions = computed(() => {
    const data = this.restock.data();
    const list = this.facade.data();
    if (!data || !list) return [];
    const inList = new Set(
      list.list_items.flatMap((i) => {
        const id = i.product?.id ?? i.product_id;
        return id ? [id] : [];
      })
    );
    return restockSuggestions(data.products, data.stats, inList);
  });

  addSuggested(productId: string) {
    const list = this.facade.data();
    if (list) void this.facade.addItem(list.id, productId);
  }

  addAllSuggested(productIds: string[]) {
    void this.facade.addProducts(productIds);
  }

  /** "Todavía tengo": se pospone un intervalo para toda la familia. */
  snoozeSuggestion(s: RestockSuggestion) {
    void this.restock.snooze(s.product.id, snoozeUntil(s.intervalDays));
  }

  /** Ionic conserva la página entre pestañas: al volver (p. ej. tras cerrar una compra) se
   * refrescan las sugerencias sin skeleton. */
  ionViewWillEnter() {
    void this.restock.initialize();
  }

  ngOnInit() {
    this.facade.initialize();
    this.facade.loadTemplates();
    void this.restock.initialize();
    // Nombres de los miembros para "quién marcó" (composición en la página: facades aislados).
    if (!this.family.currentFamily()) this.family.loadMyFamily();
    this.destroyRef.onDestroy(() => this.facade.dispose());
  }

  /** Quién marcó el ítem ("Tú" o el nombre); solo si la familia tiene más de un miembro. */
  checkedByName(item: PopulatedListItem): string | null {
    if (!item.is_checked || !item.checked_by || !this.family.hasOtherMembers()) return null;
    return this.family.memberNames().get(item.checked_by) ?? null;
  }

  /** Hay "Repetir última compra" o plantillas para ofrecer. */
  readonly hasShortcuts = computed(
    () => !!this.facade.lastCompletedList() || this.facade.templates().length > 0
  );

  /**
   * Atajo elegido (última compra o plantilla): con una lista vacía copia los ítems en ella; sin
   * lista activa, crea la lista con esos ítems (spec 0010).
   */
  async startFrom(sourceListId: string) {
    const list = this.facade.data();
    if (list) await this.facade.cloneListItems(sourceListId, list.id);
    else await this.facade.startListFrom(sourceListId);
  }

  /** Guardar plantilla: el campo toma el foco; sin nombre avisa y la alerta queda abierta (Q30). */
  async saveTemplate() {
    const list = this.facade.data();
    if (!list) return;
    await this.askName('Guardar plantilla', 'Dale un nombre (ej. Asado, Mensual).', '', (name) =>
      this.facade.saveAsTemplate(list.id, name)
    );
  }

  /** "⋯" de una plantilla: renombrar o borrar (Q28). */
  async manageTemplate(template: ActiveShoppingList) {
    const action = await this.choose<'rename' | 'delete'>(`«${template.name}»`, '', [
      { text: 'Renombrar', value: 'rename' },
      { text: 'Borrar', value: 'delete', role: 'destructive' },
    ]);
    if (action === 'rename') {
      await this.askName('Renombrar plantilla', '', template.name, (name) =>
        this.facade.renameTemplate(template.id, name)
      );
    } else if (action === 'delete') {
      const ok = await this.choose<boolean>(
        '¿Borrar la plantilla?',
        `«${template.name}» deja de aparecer en tus atajos. Tus listas y compras no cambian.`,
        [{ text: 'Borrar', value: true, role: 'destructive' }]
      );
      if (ok) await this.facade.deleteTemplate(template.id);
    }
  }

  /** Suma los productos de una plantilla a la lista en curso (Q28). */
  async addTemplateToList() {
    const list = this.facade.data();
    if (!list) return;
    const templateId = await this.choose<string>(
      'Agregar plantilla',
      'Sus productos se suman a esta lista.',
      this.facade.templates().map((t) => ({ text: t.name, value: t.id }))
    );
    if (templateId) await this.facade.cloneListItems(templateId, list.id);
  }

  /**
   * Alerta con un campo de nombre que toma el foco. `save` devuelve false si el nombre no sirve:
   * la alerta queda abierta para corregirlo.
   */
  private async askName(
    header: string,
    message: string,
    value: string,
    save: (name: string) => Promise<boolean>
  ): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message: message || undefined,
      inputs: [{ name: 'name', type: 'text', value, attributes: { maxlength: 40 } }],
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Guardar',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: (data?: { name?: string }) => {
            const name = (data?.name ?? '').trim();
            void save(name);
            return name.length > 0; // vacío: el facade avisa y la alerta sigue abierta
          },
        },
      ],
    });
    await alert.present();
    alert.querySelector<HTMLInputElement>('input')?.focus();
  }

  /** Pista "Desliza para quitar" hasta que la persona quite un producto una vez (Q27). */
  readonly swipeHintSeen = signal(readFlag(SWIPE_HINT_KEY));

  async createNewList() {
    await this.facade.createList(DEFAULT_LIST_NAME);
  }

  /** "Vaciar lista" (spec 0012): pide confirmación y borra todos los ítems, sin crear una compra. */
  async clearList() {
    const confirmed = await this.choose<boolean>(
      '¿Vaciar la lista?',
      'Se quitan todos los productos. No queda nada en Compras.',
      [{ text: 'Vaciar', value: true, role: 'destructive' }]
    );
    if (confirmed) await this.facade.clearList();
  }

  /** Marca/desmarca con un solo movimiento corto a su nuevo lugar (Q3). */
  toggleItem(itemId: string, currentStatus: boolean) {
    const item = this.facade.data()?.list_items.find((i) => i.id === itemId);
    if (!currentStatus && item && item.unit_price == null) this.askPrice(item);
    else if (currentStatus && this.pricePrompt()?.id === itemId) this.pricePrompt.set(null);

    const list = this.listElementRef?.nativeElement as HTMLElement | undefined;
    if (!list) {
      this.facade.toggleItemCheck(itemId, currentStatus);
      return;
    }
    this.gsap.animateListReorder(list, () => {
      this.facade.toggleItemCheck(itemId, currentStatus);
      this.cdr.detectChanges(); // render síncrono: la animación mide la posición nueva al tiro
    });
  }

  updateQuantity(itemId: string, currentQty: number, change: number, event: Event) {
    event.stopPropagation();
    if (currentQty + change < 1) return;
    this.facade.updateItemQuantity(itemId, change); // incremento: la BD suma (spec 0011)
  }

  deleteItem(itemId: string) {
    this.facade.deleteItem(itemId);
    if (!this.swipeHintSeen()) {
      this.swipeHintSeen.set(true);
      writeFlag(SWIPE_HINT_KEY);
    }
  }

  /**
   * Finalizar (spec 0008): con boleta, sin boleta (precios y total a mano) o "ahora no" (precios
   * estimados, como antes). Si quedan pendientes se elige pasarlos a la próxima lista o descartarlos.
   */
  async completeList(listId: string) {
    const list = this.facade.data();
    if (!list) return;

    const method = await this.choose<CloseMethod>(
      '¿Cómo cierras la compra?',
      'Con la boleta queda lo que pagaste de verdad.',
      [
        { text: 'Escanear boleta', value: 'receipt', cssClass: 'alert-confirm-btn' },
        { text: 'Sin boleta', value: 'manual' },
        { text: 'Ahora no', value: 'later' },
      ]
    );
    if (!method) return;

    const pending = this.listSummary().pending;
    // Con boleta o sin boleta la pantalla de cierre ya tiene "Pasar pendientes" (marcado): no se
    // pregunta dos veces (spec 0013, Q29). "Ahora no" cierra aquí mismo, así que pregunta.
    let carryPending = true;
    if (method === 'later' && pending > 0) {
      const carry = await this.choose<boolean>(
        'Quedan pendientes',
        pending === 1
          ? 'Queda 1 pendiente sin comprar.'
          : `Quedan ${pending} pendientes sin comprar.`,
        [
          { text: 'Pasar a la próxima lista', value: true, cssClass: 'alert-confirm-btn' },
          { text: 'Descartarlos', value: false, role: 'destructive' },
        ]
      );
      if (carry === null) return;
      carryPending = carry;
    }

    if (method === 'later') {
      await this.facade.completeList(listId, carryPending);
      return;
    }
    this.close.start(list, carryPending, method);
    this.nav.navigateForward('/app/close');
  }

  /** Alerta con opciones + "Cancelar". Resuelve con el valor elegido, o null si se cancela. */
  private async choose<T>(
    header: string,
    message: string,
    options: { text: string; value: T; role?: string; cssClass?: string }[]
  ): Promise<T | null> {
    return new Promise<T | null>(async (resolve) => {
      const alert = await this.alertController.create({
        header,
        message,
        cssClass: 'premium-alert',
        buttons: [
          ...options.map((o) => ({
            text: o.text,
            role: o.role ?? 'confirm',
            cssClass: o.cssClass,
            handler: () => resolve(o.value),
          })),
          {
            text: 'Cancelar',
            role: 'cancel',
            cssClass: 'alert-cancel-btn',
            handler: () => resolve(null),
          },
        ],
      });
      alert.onDidDismiss().then(() => resolve(null));
      await alert.present();
    });
  }
}
