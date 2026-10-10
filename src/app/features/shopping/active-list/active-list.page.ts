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

  @ViewChild('ionList', { read: ElementRef }) listElementRef?: ElementRef;

  constructor() {
    // Me quitaron de la familia (spec 0011): nombres y miembros pasan a ser los de la nueva.
    effect(() => {
      if (this.facade.familyChanged() > 0) untracked(() => this.family.loadMyFamily());
    });
  }

  public isSearchOpen = signal(false);

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

      const price = item.product?.last_price || 0;
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
