import { Injectable, computed, inject } from '@angular/core';
import { BaseFacade } from './base.facade';
import type { MonthlySpending, PurchaseSummary } from '../models/purchase-history.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ToastService } from '../services/ui/toast.service';
import { spendingInMonth, summarizePurchases } from '../utils/purchase-history.utils';
import { purchaseTitle } from '../utils/purchase-name.utils';

const MAX_NAME = 60;

/** Historial de compras finalizadas de la familia y gasto real del mes (boleta o total ingresado). */
@Injectable({ providedIn: 'root' })
export class PurchaseHistoryFacade extends BaseFacade<PurchaseSummary[]> {
  private readonly family = inject(FamilyRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly receipts = inject(ReceiptsRepository);
  private readonly toast = inject(ToastService);

  readonly thisMonth = computed<MonthlySpending>(() => spendingInMonth(this.data() ?? []));

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
