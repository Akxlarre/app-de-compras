import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { NavController } from '@ionic/angular';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import type { LineDecision, MatchCandidate } from '@core/models/receipt.model';
import { groupDecisions, type DecisionGroup } from '@core/utils/close-groups.utils';
import { formatAmount, totalDifference } from '@core/utils/price.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { AlertCardComponent } from '@shared/components/alert-card/alert-card.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ReceiptPickerComponent } from './receipt-picker.component';

/**
 * Cierre de la compra (spec 0008): sin boleta (total y precios a mano) o con boleta (foto → OCR →
 * conciliación). A pantalla completa, sin barra (spec 0016 D3); se llega desde Finalizar en Mi
 * Lista o desde Compras, y se vuelve ahí al terminar o cancelar.
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
    ReceiptPickerComponent,
  ],
  templateUrl: './purchase-close.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseClosePage implements OnInit {
  readonly close = inject(PurchaseCloseFacade);
  private readonly lists = inject(ShoppingListFacade);
  private readonly nav = inject(NavController);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = computed(() => {
    const kind = this.close.kind();
    const manual = this.close.mode() === 'manual';
    if (kind === 'new') return 'Compra sin lista';
    if (kind === 'completed') return manual ? 'Ingresar total' : 'Agregar boleta';
    return manual ? 'Cerrar sin boleta' : 'Escanear boleta';
  });
  readonly pendingCount = computed(
    () => this.close.list()?.list_items.filter((i) => !i.is_checked).length ?? 0
  );

  /** Los grupos de la conciliación. "¿Es este?" sigue en su grupo después de elegir. */
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

  /** Filas: la misma línea repetida se ve una vez con "× 2" (spec 0016 AC10). */
  readonly rows = computed(() => ({
    matched: groupDecisions(this.groups().matched),
    extras: groupDecisions(this.groups().extras),
  }));
  readonly totals = computed(() => ({
    matched: this.rows().matched.reduce((s, g) => s + g.total, 0),
    extras: this.rows().extras.reduce((s, g) => s + g.total, 0),
  }));

  /** Lo que falta decidir para cerrar ("2 por decidir", AC9). */
  readonly toDecide = computed(
    () =>
      this.groups().candidates.filter((d) => d.target === null).length +
      this.close.missing().filter((m) => m.bought === null).length
  );

  /** Fila abierta para editar (cantidad, precio, nombre); las demás se ven como texto (AC11). */
  readonly expanded = signal<string | null>(null);
  /** Boleta con la tienda y la fecha en edición (AC12). */
  readonly editingReceipt = signal<number | null>(null);

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.close.setVisible(false));
  }

  /** Ionic deja la página en caché al volver atrás: la visibilidad va por entrar y salir (D6). */
  ionViewWillLeave(): void {
    this.close.setVisible(false);
  }

  async ionViewWillEnter(): Promise<void> {
    this.close.setVisible(true);
    // Un cierre en curso (desde Finalizar, Compras o una lectura en segundo plano) no se reinicia.
    if (this.close.list()) return;
    // Sin cierre (se abrió la URL directo): la boleta es de la compra activa si hay algo marcado;
    // si no, es una compra sin lista.
    await this.lists.initialize();
    const active = this.lists.data();
    if (active?.list_items.some((i) => i.is_checked)) {
      this.close.start(active, true, 'receipt', 'active', 'purchases');
    } else {
      this.close.startNew('purchases');
    }
  }

  /** "Es otra compra": la boleta no es de la lista activa; crea una compra sin lista. */
  otherPurchase(): void {
    this.close.startNew(this.close.origin());
  }

  /** Monto en pesos escrito por el usuario ("$12.990" → 12990). Vacío o inválido → null. */
  toAmount(value: string): number | null {
    const digits = value.replace(/[^\d]/g, '');
    return digits ? Number(digits) : null;
  }

  /** Montos con separador de miles mientras se escriben; el `$` va fijo a la izquierda (Q32). */
  readonly formatAmount = formatAmount;
  readonly abs = Math.abs;

  /** Total pagado − suma de precios, si ambos existen y no calzan (Q32). */
  readonly difference = computed(() =>
    totalDifference(this.close.manualTotal(), this.close.manualSum())
  );

  onTotalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const amount = this.toAmount(input.value);
    this.close.manualTotal.set(amount);
    input.value = formatAmount(amount);
  }

  onPriceInput(itemId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const amount = this.toAmount(input.value);
    this.close.setManualPrice(itemId, amount);
    input.value = formatAmount(amount);
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

  toggleRow(key: string): void {
    this.expanded.update((k) => (k === key ? null : key));
  }

  /** Un cambio en una fila agrupada vale para cada línea que junta. */
  updateGroup(g: DecisionGroup, patch: Partial<LineDecision>): void {
    for (const index of g.indexes) this.close.updateDecision(index, patch);
  }

  /** "Ninguno" en "No es este" de una fila agrupada. */
  notThisGroup(g: DecisionGroup): void {
    for (const index of g.indexes) this.notThis(index);
    this.expanded.set(null);
  }

  /** Grupos abiertos ("Coinciden", "No estaban en la lista", "Otros cargos"); parten cerrados. */
  private readonly openSections = signal<ReadonlySet<string>>(new Set());

  isOpen(section: string): boolean {
    return this.openSections().has(section);
  }

  toggleSection(section: string): void {
    this.openSections.update((s) => {
      const next = new Set(s);
      if (!next.delete(section)) next.add(section);
      return next;
    });
  }

  /** "2026-10-05" → "5 oct" (fecha local: sin pasar por UTC, que la corre un día en Chile). */
  receiptDay(date: string | null): string {
    const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return 'sin fecha';
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(d);
  }

  saveReceiptMeta(index: number, store: string, date: string): void {
    this.close.setReceiptMeta(index, { store: store.trim() || null, date: date || null });
    this.editingReceipt.set(null);
  }

  onFiles(files: File[]): void {
    this.close.scan(files);
  }

  /** Otra boleta de la misma salida (otra tienda, spec 0015 D6). */
  onMoreFiles(files: File[]): void {
    this.close.addReceipt(files);
  }

  /** Mientras lee: vuelve a donde estaba sin cancelar; al terminar avisa (D6). */
  leave(): void {
    this.nav.navigateBack(`/app/${this.close.origin()}`);
  }

  async confirm(): Promise<void> {
    const reload = this.close.kind() === 'active';
    const target = `/app/${this.close.origin()}`;
    const ok =
      this.close.mode() === 'manual'
        ? await this.close.confirmManual()
        : await this.close.confirmReceipt();
    if (!ok) return;
    // Una compra ya cerrada o sin lista no cambia la lista activa.
    if (reload) await this.lists.reloadAfterClose();
    this.close.reset();
    this.nav.navigateRoot(target);
  }

  cancel(): void {
    const target = `/app/${this.close.origin()}`;
    this.close.reset();
    this.nav.navigateRoot(target);
  }
}
