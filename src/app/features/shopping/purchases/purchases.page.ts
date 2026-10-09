import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NavController } from '@ionic/angular';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import type { PurchaseSummary } from '@core/models/purchase-history.model';
import { capitalize } from '@core/utils/date.utils';
import { isAutoListName } from '@core/utils/purchase-name.utils';
import { shiftMonth } from '@core/utils/purchase-history.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ReceiptPickerComponent } from '../purchase-close/receipt-picker.component';

const monthName = (d: Date) =>
  capitalize(new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(d));
const shortDay = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** Fila de una compra: la tienda en vez de repetir la fecha (R4) y de dónde sale el total (R3). */
export function purchaseRow(p: PurchaseSummary) {
  const primary = p.store ?? p.title;
  // El título automático ya es la fecha; con tienda o nombre propio, la fecha va abajo.
  const showDate = !!p.store || !isAutoListName(p.name);
  const named = !!p.store && !isAutoListName(p.name);
  const count = `${p.itemCount} ${p.itemCount === 1 ? 'producto' : 'productos'}`;
  const secondary = [showDate ? shortDay.format(new Date(p.completedAt)) : null, named ? p.name : null, count]
    .filter(Boolean)
    .join(' · ');
  const source =
    p.totalSource === 'receipt'
      ? 'Boleta'
      : p.totalSource === 'manual'
      ? 'Total ingresado'
      : p.total === 0
      ? 'Sin precios'
      : 'Estimado';
  return { id: p.id, primary, secondary, total: p.total, source, noPrices: source === 'Sin precios' };
}

/**
 * Pestaña Compras (spec 0016): gasto por mes contra el anterior, las compras del mes y la única
 * puerta para registrar una compra con boleta.
 */
@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [
    DecimalPipe,
    AppHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonBlockComponent,
    IconComponent,
    ReceiptPickerComponent,
  ],
  templateUrl: './purchases.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesPage implements OnInit {
  readonly facade = inject(PurchaseHistoryFacade);
  readonly close = inject(PurchaseCloseFacade);
  private readonly lists = inject(ShoppingListFacade);
  private readonly nav = inject(NavController);
  private readonly destroyRef = inject(DestroyRef);

  readonly abs = Math.abs;
  readonly monthLabel = computed(() => monthName(this.facade.month()));
  readonly prevMonthLabel = computed(() => monthName(shiftMonth(this.facade.month(), -1)));
  /** Ninguna compra todavía: se explica cómo empezar (R6). */
  readonly isEmpty = computed(() => (this.facade.data() ?? []).length === 0);
  readonly rows = computed(() => this.facade.visible().map(purchaseRow));

  ngOnInit(): void {
    this.facade.initialize();
    this.destroyRef.onDestroy(() => this.facade.dispose());
  }

  /**
   * "Escanear boleta" (D2): con algo marcado en Mi Lista, la boleta cierra esa lista (dentro sigue
   * "Es otra compra"); sin nada marcado, es una compra sin lista. La lectura sigue en el cierre.
   */
  async scan(files: File[]): Promise<void> {
    await this.lists.initialize();
    const active = this.lists.data();
    if (active?.list_items.some((i) => i.is_checked)) {
      this.close.start(active, true, 'receipt', 'active', 'purchases');
    } else {
      this.close.startNew('purchases');
    }
    this.close.scan(files);
    this.nav.navigateForward('/app/close');
  }

  /** Vuelve a la boleta que se está leyendo o que quedó sin cerrar (D6). */
  resume(): void {
    this.nav.navigateForward('/app/close');
  }

  open(id: string): void {
    this.nav.navigateForward(`/app/purchases/${id}`);
  }
}
