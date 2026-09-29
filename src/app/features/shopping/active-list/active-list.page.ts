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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ShoppingListFacade, type PopulatedListItem } from '@core/facades/shopping-list.facade';
import { FamilyFacade } from '@core/facades/family.facade';
import { PurchaseCloseFacade, type CloseMode } from '@core/facades/purchase-close.facade';

type CloseMethod = CloseMode | 'later';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
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

  @ViewChild('ionList', { read: ElementRef }) listElementRef?: ElementRef;

  public isSearchOpen = signal(false);

  // Lista ordenada (pendientes arriba, listos abajo)
  public sortedListItems = computed(() => {
    const list = this.facade.data();
    if (!list || !list.list_items) return [];

    return [...list.list_items].sort((a, b) => {
      if (a.is_checked === b.is_checked) return 0;
      return a.is_checked ? 1 : -1;
    });
  });

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

  ngOnInit() {
    this.facade.initialize();
    this.facade.loadTemplates();
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

  async saveTemplate() {
    const list = this.facade.data();
    if (!list) return;
    const alert = await this.alertController.create({
      header: 'Guardar Plantilla',
      message: 'Dale un nombre a esta plantilla (ej. Asado, Mensual)',
      inputs: [
        {
          name: 'templateName',
          type: 'text',
          placeholder: 'Nombre de la plantilla',
        },
      ],
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Guardar',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: async (data) => {
            if (data.templateName) {
              await this.facade.saveAsTemplate(list.id, data.templateName);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async createNewList() {
    await this.facade.createList('Compra de la Semana');
  }

  toggleItem(itemId: string, currentStatus: boolean) {
    if (this.listElementRef?.nativeElement) {
      this.gsap.animateBentoLayoutChange(
        this.listElementRef.nativeElement,
        () => {
          this.facade.toggleItemCheck(itemId, currentStatus);
          this.cdr.detectChanges(); // Forzar render síncrono para calcular la nueva posición (FLIP)
        },
        undefined,
        { duration: 0.7, ease: 'expo.out' } // Fluid and elegant list reordering
      );
    } else {
      this.facade.toggleItemCheck(itemId, currentStatus);
    }
  }

  updateQuantity(itemId: string, currentQty: number, change: number, event: Event) {
    event.stopPropagation();
    const newQty = currentQty + change;
    if (newQty < 1) return;
    this.facade.updateItemQuantity(itemId, newQty);
  }

  deleteItem(itemId: string) {
    this.facade.deleteItem(itemId);
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
    let carryPending = false;
    if (pending > 0) {
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

  openHistory() {
    this.nav.navigateForward('/app/history');
  }
}
