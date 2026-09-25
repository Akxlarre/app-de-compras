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
  private readonly destroyRef = inject(DestroyRef);

  /** Compra con el detalle abierto. */
  readonly openId = signal<string | null>(null);

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

  back(): void {
    this.nav.navigateBack('/app/active');
  }
}
