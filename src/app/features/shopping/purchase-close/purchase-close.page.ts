import { Component, ChangeDetectionStrategy, OnInit, computed, inject } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { NavController } from '@ionic/angular';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import type { LineDecision, MatchCandidate } from '@core/models/receipt.model';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { AlertCardComponent } from '@shared/components/alert-card/alert-card.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Cierre de la compra (spec 0008): sin boleta (total y precios a mano) o con boleta (foto → OCR →
 * conciliación). Se llega desde Finalizar en Mi Lista o desde la pestaña Boletas.
 */
@Component({
  selector: 'app-purchase-close-page',
  standalone: true,
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    AppHeaderComponent,
    AlertCardComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './purchase-close.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseClosePage implements OnInit {
  readonly close = inject(PurchaseCloseFacade);
  private readonly lists = inject(ShoppingListFacade);
  private readonly nav = inject(NavController);

  readonly title = computed(() =>
    this.close.mode() === 'manual' ? 'Cerrar sin boleta' : 'Escanear boleta'
  );
  readonly pendingCount = computed(
    () => this.close.list()?.list_items.filter((i) => !i.is_checked).length ?? 0
  );

  /** Los tres grupos de la conciliación. "¿Es este?" sigue en su grupo después de elegir. */
  readonly groups = computed(() => {
    const matched: LineDecision[] = [];
    const candidates: LineDecision[] = [];
    const extras: LineDecision[] = [];
    for (const d of this.close.decisions()) {
      if (d.status === 'candidate') candidates.push(d);
      else if (d.target?.kind === 'new') extras.push(d);
      else matched.push(d);
    }
    return { matched, candidates, extras };
  });

  async ngOnInit(): Promise<void> {
    if (this.close.list()) return;
    // Pestaña Boletas: la boleta es de la compra activa; los pendientes pasan a la próxima lista.
    await this.lists.initialize();
    const active = this.lists.data();
    if (active) this.close.start(active, true, 'receipt');
  }

  /** Monto en pesos escrito por el usuario ("$12.990" → 12990). Vacío o inválido → null. */
  toAmount(value: string): number | null {
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits) : null;
  }

  lineName(d: LineDecision): string {
    return d.target && d.target.kind !== 'new' ? d.target.name : d.name || d.rawText || 'Producto';
  }

  isChosen(d: LineDecision, c: MatchCandidate): boolean {
    return !!d.target && d.target.kind !== 'new' && d.target.productId === c.productId;
  }

  notThis(index: number): void {
    this.close.updateDecision(index, { target: { kind: 'new' }, status: 'extra' });
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'));
    input.value = '';
    if (files.length) this.close.scan(files.slice(0, 5));
  }

  async confirm(): Promise<void> {
    const ok =
      this.close.mode() === 'manual'
        ? await this.close.confirmManual()
        : await this.close.confirmReceipt();
    if (!ok) return;
    await this.lists.reloadAfterClose();
    this.close.reset();
    this.nav.navigateRoot('/app/active');
  }

  cancel(): void {
    this.close.reset();
    this.nav.navigateRoot('/app/active');
  }
}
