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
import { formatAmount } from '@core/utils/price.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ReceiptPickerComponent } from '../purchase-close/receipt-picker.component';

const monthName = (d: Date) =>
  capitalize(new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(d));
const shortMonth = (d: Date) =>
  capitalize(new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(d).replace('.', ''));
const shortDay = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dayWithYear = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Fila de una compra: la tienda en vez de repetir la fecha (R4) y de dónde sale el total (R3). */
export function purchaseRow(p: PurchaseSummary) {
  const primary = p.store ?? p.title;
  // El título automático ya es la fecha; con tienda o nombre propio, la fecha va abajo.
  const showDate = !!p.store || !isAutoListName(p.name);
  const named = !!p.store && !isAutoListName(p.name);
  const count = `${p.itemCount} ${p.itemCount === 1 ? 'producto' : 'productos'}`;
  const secondary = [
    showDate ? shortDay.format(new Date(p.completedAt)) : null,
    named ? p.name : null,
    count,
  ]
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
  return {
    id: p.id,
    primary,
    secondary,
    total: p.total,
    source,
    noPrices: source === 'Sin precios',
  };
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

  // ── Buscar en todas las compras (spec 0023 D2) ─────────────────────────────
  readonly searching = computed(() => !!this.facade.query().trim());
  /** Cada resultado con su fecha (pueden ser de cualquier mes) y lo que coincidió. */
  readonly resultRows = computed(() =>
    this.facade.results().map(({ purchase, match }) => ({
      ...purchaseRow(purchase),
      when: dayWithYear.format(new Date(purchase.completedAt)),
      match,
    }))
  );
  readonly resultsLabel = computed(() => {
    const n = this.facade.results().length;
    if (n === 0) return `Ninguna compra con «${this.facade.query().trim()}»`;
    return n === 1 ? '1 compra' : `${n} compras`;
  });

  /** Barras de los últimos 6 meses (spec 0020 D3): alto relativo al mes más alto. */
  readonly bars = computed(() => {
    const chart = this.facade.chart();
    const max = Math.max(0, ...chart.map((m) => m.total));
    const selected = this.facade.month().getTime();
    return chart.map((m) => ({
      month: m.month,
      label: shortMonth(m.month),
      height: m.total > 0 ? Math.max(4, Math.round((m.total / max) * 100)) : 0,
      empty: m.total === 0,
      selected: m.month.getTime() === selected,
      aria: `${monthName(m.month)}: $${formatAmount(m.total)}`,
    }));
  });

  /** El gasto por tienda solo dice algo si hay al menos una tienda (no solo "Sin boleta"). */
  readonly stores = computed(() => {
    const list = this.facade.byStore();
    return list.some((s) => s.name !== 'Sin boleta') ? list : [];
  });

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
