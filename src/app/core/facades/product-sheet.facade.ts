import { Injectable, computed, inject } from '@angular/core';
import { BaseFacade } from './base.facade';
import type { Product } from '../models/product.model';
import type { ProductSheet } from '../models/product-sheet.model';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ToastService } from '../services/ui/toast.service';
import { buyEvery, purchaseHistory } from '../utils/product-sheet.utils';

const MAX_NAME = 60;
const NOT_FOUND = 'product_not_found';

/** Resultado de renombrar: si el nombre ya es de otro producto, se ofrece juntarlos (AC5). */
export type RenameResult = { ok: true } | { ok: false; duplicateOf?: string };

/** Ficha de un producto (spec 0017): compras, textos de boleta y las correcciones del catálogo. */
@Injectable({ providedIn: 'root' })
export class ProductSheetFacade extends BaseFacade<ProductSheet> {
  private readonly family = inject(FamilyRepository);
  private readonly products = inject(ProductsRepository);
  private readonly receipts = inject(ReceiptsRepository);
  private readonly toast = inject(ToastService);

  private id = '';

  /** Con compras no se borra ni se escribe un precio estimado (D3, D5). */
  readonly hasPurchases = computed(() => (this.data()?.purchases.length ?? 0) > 0);

  protected override async fetchData(): Promise<ProductSheet> {
    const id = this.id;
    const product = await this.products.findById(id);
    if (!product) throw new Error(NOT_FOUND);
    const [rows, aliases, stats] = await Promise.all([
      this.products.findPurchases(id),
      this.receipts.findAliasesOf(id),
      this.products.findRestockStats(),
    ]);
    return {
      product,
      purchases: purchaseHistory(rows),
      aliases,
      frequency: buyEvery(stats.find((s) => s.product_id === id)),
    };
  }

  protected static override sanitizeError(e: unknown): string {
    if (e instanceof Error && e.message === NOT_FOUND) return 'No encontramos este producto.';
    return BaseFacade.sanitizeError(e);
  }

  /** Abre la ficha de un producto; si era otro, no muestra el anterior mientras carga. */
  async open(id: string): Promise<void> {
    if (id !== this.id) {
      this.id = id;
      this.reset();
    }
    await this.initialize();
  }

  async rename(input: string): Promise<RenameResult> {
    const name = input.trim();
    const sheet = this.data();
    if (!sheet) return { ok: false };
    if (!name || name.length > MAX_NAME) {
      this.toast.warning('Nombre no válido', `Escribe un nombre de 1 a ${MAX_NAME} caracteres.`);
      return { ok: false };
    }
    try {
      const existing = await this.products.findIdByName(sheet.product.family_id, name);
      if (existing && existing !== sheet.product.id) return { ok: false, duplicateOf: existing };
      await this.products.rename(sheet.product.id, name);
    } catch (e) {
      console.error(e);
      this.toast.error('No se pudo renombrar', 'Revisa tu conexión e intenta de nuevo.');
      return { ok: false };
    }
    this.patchProduct({ name });
    return { ok: true };
  }

  /** Borra un producto sin compras (con compras se archiva, D3). */
  async remove(): Promise<boolean> {
    const sheet = this.data();
    if (!sheet || this.hasPurchases()) return false;
    return this.run(() => this.products.remove(sheet.product.id), 'No se pudo borrar');
  }

  async archive(): Promise<boolean> {
    const ok = await this.run(() => this.products.archive(this.id), 'No se pudo archivar');
    if (ok) this.patchProduct({ archived_at: new Date().toISOString() });
    return ok;
  }

  async unarchive(): Promise<boolean> {
    const ok = await this.run(() => this.products.unarchive(this.id), 'No se pudo reactivar');
    if (ok) this.patchProduct({ archived_at: null });
    return ok;
  }

  /** Productos con los que se puede juntar este (D4): los que coinciden, sin él mismo. */
  async mergeCandidates(term: string): Promise<Product[]> {
    if (!term.trim()) return [];
    const found = await this.products.searchByName(term.trim(), 20);
    return found.filter((p) => p.id !== this.id);
  }

  /** Junta este producto en `intoId`: todo pasa a ese y este se borra (D4). */
  async mergeInto(intoId: string, intoName: string): Promise<boolean> {
    try {
      const moved = await this.products.merge(this.id, intoId);
      this.toast.success(
        'Productos juntados',
        `Se juntaron ${moved} ${moved === 1 ? 'compra' : 'compras'} en «${intoName}».`
      );
      return true;
    } catch (e) {
      console.error(e);
      this.toast.error('No se pudieron juntar', 'Revisa tu conexión e intenta de nuevo.');
      return false;
    }
  }

  /** Quita un texto de boleta equivocado: la próxima boleta no lo reconoce sola (AC4). */
  async removeAlias(rawText: string): Promise<boolean> {
    const sheet = this.data();
    if (!sheet) return false;
    const ok = await this.run(
      () => this.receipts.removeAlias(sheet.product.family_id, rawText),
      'No se pudo quitar'
    );
    if (ok) this._data.set({ ...sheet, aliases: sheet.aliases.filter((a) => a.rawText !== rawText) });
    return ok;
  }

  /** Precio estimado de un producto que nunca se compró (D5); con compras manda el pagado. */
  async setEstimatedPrice(price: number): Promise<boolean> {
    if (!this.data() || this.hasPurchases()) return false;
    const ok = await this.run(() => this.products.updatePrice(this.id, price), 'No se pudo guardar el precio');
    if (ok) this.patchProduct({ last_price: price });
    return ok;
  }

  private patchProduct(changes: Partial<Product>): void {
    const sheet = this.data();
    if (sheet) this._data.set({ ...sheet, product: { ...sheet.product, ...changes } });
  }

  private async run(op: () => Promise<void>, failure: string): Promise<boolean> {
    try {
      await op();
      return true;
    } catch (e) {
      console.error(e);
      this.toast.error(failure, 'Revisa tu conexión e intenta de nuevo.');
      return false;
    }
  }
}
