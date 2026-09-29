import { Injectable, computed, inject } from '@angular/core';
import { BaseFacade } from './base.facade';
import type { MonthlySpending, PurchaseSummary } from '../models/purchase-history.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { spendingInMonth, summarizePurchase } from '../utils/purchase-history.utils';

/** Historial de compras finalizadas de la familia y gasto real del mes (boleta o total ingresado). */
@Injectable({ providedIn: 'root' })
export class PurchaseHistoryFacade extends BaseFacade<PurchaseSummary[]> {
  private readonly family = inject(FamilyRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly receipts = inject(ReceiptsRepository);

  readonly thisMonth = computed<MonthlySpending>(() => spendingInMonth(this.data() ?? []));

  protected override async fetchData(): Promise<PurchaseSummary[]> {
    const familyId = await this.family.getOrCreateFamilyId();
    const completed = await this.lists.findCompleted(familyId);
    return completed.map(summarizePurchase);
  }

  /** URL firmada de la foto de una boleta, o null si no se puede abrir (sin acceso o sin conexión). */
  async receiptUrl(imagePath: string): Promise<string | null> {
    try {
      return await this.receipts.getSignedUrl(imagePath);
    } catch {
      return null;
    }
  }
}
