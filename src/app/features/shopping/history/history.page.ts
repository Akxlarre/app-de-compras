import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NavController } from '@ionic/angular';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import type { PurchaseSummary } from '@core/models/purchase-history.model';
import { capitalize, formatChileanDate } from '@core/utils/date.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [
    DecimalPipe,
    AppHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonBlockComponent,
    IconComponent,
  ],
  templateUrl: './history.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage implements OnInit {
  readonly facade = inject(PurchaseHistoryFacade);
  private readonly nav = inject(NavController);
  private readonly close = inject(PurchaseCloseFacade);
  private readonly destroyRef = inject(DestroyRef);

  /** Compra con el detalle abierto. */
  readonly openId = signal<string | null>(null);
  /** Foto de boleta abierta (URL firmada; null si no se pudo abrir). */
  readonly receiptPhoto = signal<{ id: string; url: string | null } | null>(null);
  readonly loadingPhoto = signal(false);

  readonly monthLabel = capitalize(
    new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date())
  );

  readonly purchases = computed(() =>
    (this.facade.data() ?? []).map((p) => ({
      ...p,
      dateLabel: formatChileanDate(p.completedAt, 'medium'),
    }))
  );

  ngOnInit(): void {
    this.facade.initialize();
    this.destroyRef.onDestroy(() => this.facade.dispose());
  }

  toggle(id: string): void {
    this.openId.update((current) => (current === id ? null : id));
  }

  canAddReceipt(p: PurchaseSummary): boolean {
    return !p.hasReceipt;
  }

  canEnterTotal(p: PurchaseSummary): boolean {
    return !p.hasReceipt && p.totalSource === 'estimated';
  }

  /** Historial → "Agregar boleta": la misma conciliación de 0008 sobre la compra ya cerrada. */
  addReceipt(p: PurchaseSummary): void {
    this.close.start(p.source, false, 'receipt', 'completed');
    this.nav.navigateForward('/app/close');
  }

  /** Historial → "Ingresar total": el "sin boleta" de 0008 sobre la compra ya cerrada. */
  enterTotal(p: PurchaseSummary): void {
    this.close.start(p.source, false, 'manual', 'completed');
    this.nav.navigateForward('/app/close');
  }

  /** Compra no planificada: la boleta crea la compra. */
  scanUnplanned(): void {
    this.close.startNew();
    this.nav.navigateForward('/app/close');
  }

  async toggleReceipt(p: PurchaseSummary): Promise<void> {
    if (this.receiptPhoto()?.id === p.id) {
      this.receiptPhoto.set(null);
      return;
    }
    if (!p.receiptImagePath) return;
    this.loadingPhoto.set(true);
    const url = await this.facade.receiptUrl(p.receiptImagePath);
    this.loadingPhoto.set(false);
    this.receiptPhoto.set({ id: p.id, url });
  }

  back(): void {
    this.nav.navigateBack('/app/active');
  }
}
