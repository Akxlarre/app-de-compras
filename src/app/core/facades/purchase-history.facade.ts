import { Injectable, computed, inject, signal } from '@angular/core';
import { BaseFacade } from './base.facade';
import type { MonthComparison, PurchaseSummary } from '../models/purchase-history.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ToastService } from '../services/ui/toast.service';
import {
  monthComparison,
  monthlyTotals,
  purchasesInMonth,
  shiftMonth,
  spendByStore,
  summarizePurchases,
  topProducts,
} from '../utils/purchase-history.utils';
import { purchaseTitle } from '../utils/purchase-name.utils';

const MAX_NAME = 60;

/** Compras finalizadas de la familia y gasto real por mes (boleta o total ingresado). */
@Injectable({ providedIn: 'root' })
export class PurchaseHistoryFacade extends BaseFacade<PurchaseSummary[]> {
  private readonly family = inject(FamilyRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly receipts = inject(ReceiptsRepository);
  private readonly toast = inject(ToastService);

  /** Mes que se está mirando en Compras (primer día, hora local; spec 0016 D4). */
  private readonly _month = signal(shiftMonth(new Date(), 0));
  readonly month = this._month.asReadonly();

  /** Gasto del mes elegido y la diferencia con el anterior. */
  readonly selected = computed<MonthComparison>(() =>
    monthComparison(this.data() ?? [], this._month())
  );
  /** Las compras del mes elegido, más recientes primero. */
  readonly visible = computed(() => purchasesInMonth(this.data() ?? [], this._month()));
  /** No se avanza más allá del mes en curso. */
  readonly canGoNext = computed(() => this._month() < shiftMonth(new Date(), 0));

  prevMonth(): void {
    this._month.update((m) => shiftMonth(m, -1));
  }

  nextMonth(): void {
    if (this.canGoNext()) this._month.update((m) => shiftMonth(m, 1));
  }

  /** Gasto de los últimos 6 meses, terminando en el actual (spec 0020 D3). */
  readonly chart = computed(() => monthlyTotals(this.data() ?? [], shiftMonth(new Date(), 0)));
  /** Promedio por compra del mes elegido; null sin compras. */
  readonly average = computed(() => {
    const { total, count } = this.selected().current;
    return count ? Math.round(total / count) : null;
  });
  /** Los productos que más pesaron y el gasto por tienda del mes elegido (spec 0020 D4). */
  readonly top = computed(() => topProducts(this.visible()));
  readonly byStore = computed(() => spendByStore(this.visible()));

  /** Tocar una barra del gráfico: ese mes (nunca uno futuro). */
  goToMonth(date: Date): void {
    const month = shiftMonth(date, 0);
    if (month <= shiftMonth(new Date(), 0)) this._month.set(month);
  }

  /** Una compra ya cargada (detalle en `/app/purchases/:id`). */
  byId(id: string): PurchaseSummary | null {
    return this.data()?.find((p) => p.id === id) ?? null;
  }

  protected override async fetchData(): Promise<PurchaseSummary[]> {
    const familyId = await this.family.getOrCreateFamilyId();
    const completed = await this.lists.findCompleted(familyId);
    return summarizePurchases(completed);
  }

  /** URL firmada de la foto de una boleta, o null si no se puede abrir (sin acceso o sin conexión). */
  async receiptUrl(imagePath: string): Promise<string | null> {
    try {
      return await this.receipts.getSignedUrl(imagePath);
    } catch {
      return null;
    }
  }

  /**
   * Borra una compra (spec 0012): sale al instante del Historial y del gasto del mes; la BD borra
   * su boleta y recalcula la última compra de sus productos; después se borra la foto del bucket.
   * @returns false si no se pudo (la compra vuelve a la lista).
   */
  async deletePurchase(id: string): Promise<boolean> {
    const prev = this._data();
    this._data.update((list) => list?.filter((p) => p.id !== id) ?? list);

    let imagePath: string | null;
    try {
      imagePath = await this.lists.deletePurchase(id);
    } catch {
      this._data.set(prev); // rollback
      this.toast.error('No se pudo borrar la compra', 'Revisa tu conexión e intenta de nuevo.');
      return false;
    }

    if (imagePath) {
      try {
        await this.receipts.removeImage(imagePath);
      } catch (e) {
        // La compra ya no existe: la foto huérfana no se ve en ningún lado.
        console.error('No se pudo borrar la foto de la boleta', e);
      }
    }
    return true;
  }

  /**
   * Nombre propio de una compra (1 a 60 caracteres). Se valida antes de ir a la BD.
   * @returns false si el nombre no es válido o no se pudo guardar.
   */
  async renamePurchase(id: string, input: string): Promise<boolean> {
    const name = input.trim();
    if (!name || name.length > MAX_NAME) {
      this.toast.warning('Nombre no válido', `Escribe un nombre de 1 a ${MAX_NAME} caracteres.`);
      return false;
    }

    try {
      await this.lists.renamePurchase(id, name);
    } catch {
      this.toast.error('No se pudo renombrar', 'Revisa tu conexión e intenta de nuevo.');
      return false;
    }
    this._data.update(
      (list) =>
        list?.map((p) =>
          p.id === id ? { ...p, name, title: purchaseTitle(name, p.completedAt) } : p
        ) ?? list
    );
    return true;
  }
}
