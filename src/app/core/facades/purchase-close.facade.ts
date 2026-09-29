import { Injectable, computed, inject, signal } from '@angular/core';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { ToastService } from '../services/ui/toast.service';
import type { ActiveShoppingList, PopulatedListItem } from '@core/models/shopping-list.model';
import type {
  LineDecision,
  MatchCandidate,
  MissingDecision,
  OcrReceipt,
  ReceiptValidation,
} from '@core/models/receipt.model';
import { validateReceipt } from '@core/utils/receipt.utils';
import { reconcileReceipt } from '@core/utils/reconcile.utils';
import {
  buildApplyReceipt,
  canConfirmReceipt,
  initialDecisions,
  targetFromCandidate,
} from '@core/utils/purchase-close.utils';

export type CloseMode = 'manual' | 'receipt';

/**
 * A qué compra se aplica el cierre:
 * - `active`: la lista activa que se está finalizando (0008);
 * - `completed`: una compra ya finalizada del Historial, sin boleta (0009);
 * - `new`: una compra no planificada, sin lista: la boleta la crea (0009).
 */
export type CloseKind = 'active' | 'completed' | 'new';

/** Compra vacía que representa "sin lista" mientras se concilia la boleta. */
const NEW_PURCHASE: ActiveShoppingList = {
  id: '',
  family_id: '',
  name: 'Compra sin lista',
  status: 'completed',
  created_at: '',
  list_items: [],
};

/**
 * Cierre de una compra (spec 0008): sin boleta (precios y total a mano) o con boleta (OCR +
 * conciliación). La lista la entrega la página al empezar; al terminar, la página recarga la lista.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseCloseFacade {
  private readonly family = inject(FamilyRepository);
  private readonly lists = inject(ShoppingListsRepository);
  private readonly receipts = inject(ReceiptsRepository);
  private readonly products = inject(ProductsRepository);
  private readonly toast = inject(ToastService);

  readonly list = signal<ActiveShoppingList | null>(null);
  readonly mode = signal<CloseMode | null>(null);
  readonly kind = signal<CloseKind>('active');
  readonly carryPending = signal(true);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  readonly checkedItems = computed<PopulatedListItem[]>(
    () => this.list()?.list_items.filter((i) => i.is_checked) ?? []
  );

  // ── Sin boleta ──
  readonly manualTotal = signal<number | null>(null);
  readonly manualPrices = signal<Record<string, number | null>>({});
  /** Una compra ya cerrada pide el total (es el motivo de ingresarlo); al finalizar es opcional. */
  readonly canConfirmManual = computed(() => this.kind() !== 'completed' || this.manualTotal() != null);
  readonly manualSum = computed(() =>
    this.checkedItems().reduce(
      (s, i) => s + (this.manualPrices()[i.id] ?? 0) * (i.quantity || 1),
      0
    )
  );

  // ── Con boleta ──
  readonly isScanning = signal(false);
  readonly receipt = signal<OcrReceipt | null>(null);
  readonly validation = signal<ReceiptValidation | null>(null);
  readonly decisions = signal<LineDecision[]>([]);
  readonly missing = signal<MissingDecision[]>([]);
  readonly canConfirm = computed(
    () => this.decisions().length > 0 && canConfirmReceipt(this.decisions())
  );
  readonly receiptSum = computed(() =>
    this.decisions().reduce((s, d) => s + Math.round(d.quantity * d.unitPrice), 0)
  );
  private files: File[] = [];

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  start(
    list: ActiveShoppingList,
    carryPending: boolean,
    mode: CloseMode,
    kind: CloseKind = 'active'
  ): void {
    this.reset();
    this.list.set(list);
    this.carryPending.set(carryPending);
    this.mode.set(mode);
    this.kind.set(kind);
    this.manualPrices.set(
      Object.fromEntries(this.checkedItems().map((i) => [i.id, i.product?.last_price ?? null]))
    );
  }

  /** Compra no planificada: no hay lista, la boleta crea la compra. */
  startNew(): void {
    this.start(NEW_PURCHASE, false, 'receipt', 'new');
  }

  setManualPrice(itemId: string, price: number | null): void {
    this.manualPrices.update((p) => ({ ...p, [itemId]: price }));
  }

  /** Cierra sin boleta. @returns false si falló (la compra sigue abierta). */
  async confirmManual(): Promise<boolean> {
    const list = this.list();
    if (!list || !this.canConfirmManual()) return false;
    const prices = this.checkedItems()
      .map((i) => ({ itemId: i.id, unitPrice: this.manualPrices()[i.id] }))
      .filter((p): p is { itemId: string; unitPrice: number } => p.unitPrice != null);

    return this.save(async () => {
      if (this.kind() === 'completed') {
        await this.lists.setPurchaseTotal(list.id, this.manualTotal()!, prices);
      } else {
        await this.lists.closeManual(list.id, this.carryPending(), prices, this.manualTotal());
      }
    });
  }

  /** Lee la boleta (una o más fotos) y la concilia con la compra, el catálogo y los alias. */
  async scan(files: File[]): Promise<void> {
    const list = this.list();
    if (!list || !files.length) return;
    this.isScanning.set(true);
    this.error.set(null);
    this.decisions.set([]);
    this.files = files;

    try {
      const checked = this.checkedItems().map((i) => ({
        itemId: i.id,
        productId: i.product?.id ?? i.product_id ?? '',
        name: i.product?.name ?? '',
        quantity: i.quantity,
      }));
      const images = await Promise.all(
        files.map(async (f) => ({ base64: await toBase64(f), mimeType: f.type || 'image/jpeg' }))
      );
      const familyId = await this.family.getOrCreateFamilyId();
      const [receipt, aliases, catalog] = await Promise.all([
        this.receipts.extractReceipt(
          images,
          checked.map((c) => c.name)
        ),
        this.receipts.findAliases(familyId),
        this.products.findByFamily(familyId),
      ]);

      const validation = validateReceipt(receipt);
      const result = reconcileReceipt(
        receipt.lines,
        checked,
        catalog.map((p) => ({ productId: p.id, name: p.name })),
        aliases
      );
      this.receipt.set(receipt);
      this.validation.set(validation);
      const decisions = initialDecisions(result, receipt, validation);
      // Sin lista, lo que no se reconoce entra al catálogo (si no, la compra quedaría vacía).
      this.decisions.set(
        this.kind() === 'new'
          ? decisions.map((d) => (d.target?.kind === 'new' ? { ...d, saveToCatalog: true } : d))
          : decisions
      );
      this.missing.set(result.missing.map((item) => ({ item, bought: true })));
    } catch (e) {
      console.error('Error OCR:', e);
      this.error.set(
        'No pudimos leer la boleta. Revisa tu conexión y que la foto se vea nítida, y reintenta.'
      );
    } finally {
      this.isScanning.set(false);
    }
  }

  updateDecision(index: number, patch: Partial<LineDecision>): void {
    this.decisions.update((ds) => ds.map((d) => (d.index === index ? { ...d, ...patch } : d)));
  }

  /** "¿Es este?": un candidato, o `'new'` ("otro": no estaba en la lista). */
  chooseCandidate(index: number, choice: MatchCandidate | 'new'): void {
    this.updateDecision(
      index,
      choice === 'new'
        ? { target: { kind: 'new' }, ...(this.kind() === 'new' ? { saveToCatalog: true } : {}) }
        : { target: targetFromCandidate(choice) }
    );
  }

  setMissingBought(itemId: string, bought: boolean): void {
    this.missing.update((ms) => ms.map((m) => (m.item.itemId === itemId ? { ...m, bought } : m)));
  }

  /** Cierra con la boleta. La foto se guarda si se puede; si no, la compra se cierra igual. */
  async confirmReceipt(): Promise<boolean> {
    const list = this.list();
    const receipt = this.receipt();
    const validation = this.validation();
    if (!list || !receipt || !validation || !this.canConfirm()) return false;

    return this.save(async () => {
      const familyId = await this.family.getOrCreateFamilyId();
      let imagePath: string | null = null;
      try {
        if (this.files[0]) imagePath = await this.receipts.uploadImage(familyId, this.files[0]);
      } catch (e) {
        console.error('No se pudo guardar la foto de la boleta:', e);
      }
      const input = buildApplyReceipt({
        listId: list.id,
        carryPending: this.carryPending(),
        receipt,
        validation,
        imagePath,
        decisions: this.decisions(),
        missing: this.missing(),
      });
      const kind = this.kind();
      if (kind === 'completed') await this.receipts.attachReceipt(input);
      else if (kind === 'new') await this.receipts.createReceiptPurchase(input);
      else await this.receipts.applyReceipt(input);
    });
  }

  reset(): void {
    this.list.set(null);
    this.mode.set(null);
    this.kind.set('active');
    this.carryPending.set(true);
    this.isSaving.set(false);
    this.error.set(null);
    this.manualTotal.set(null);
    this.manualPrices.set({});
    this.isScanning.set(false);
    this.receipt.set(null);
    this.validation.set(null);
    this.decisions.set([]);
    this.missing.set([]);
    this.files = [];
  }

  private async save(op: () => Promise<void>): Promise<boolean> {
    const kind = this.kind();
    this.isSaving.set(true);
    try {
      await op();
      if (kind === 'completed') {
        this.toast.success('Boleta agregada', 'El gasto de esa compra ya es el real.');
      } else if (kind === 'new') {
        this.toast.success('Compra registrada', 'Quedó guardada en tu historial.');
      } else {
        this.toast.success('Compra finalizada', 'Quedó guardada en tu historial.');
      }
      return true;
    } catch (e) {
      console.error(e);
      this.toast.error('No se pudo cerrar la compra', 'Revisa tu conexión e inténtalo de nuevo.');
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }
}

/** base64 sin el prefijo `data:…;base64,`. */
function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
