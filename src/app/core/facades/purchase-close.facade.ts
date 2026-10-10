import { Injectable, computed, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
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
  OtherCharge,
  ReceiptValidation,
} from '@core/models/receipt.model';
import { validateReceipt } from '@core/utils/receipt.utils';
import { MutationError, toMutationError } from '@core/utils/mutation-error.utils';
import { reconcileReceipt } from '@core/utils/reconcile.utils';
import {
  combineReceipts,
  combineValidations,
  partOffsets,
  splitByReceipt,
} from '@core/utils/receipt-parts.utils';
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

/** Pestaña desde la que se abrió el cierre: Mi Lista ("Finalizar") o Compras. */
export type CloseOrigin = 'active' | 'purchases';

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
  private readonly nav = inject(NavController);

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
  readonly canConfirmManual = computed(
    () => this.kind() !== 'completed' || this.manualTotal() != null
  );
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
  private readonly unmatched = signal<MissingDecision[]>([]);
  /**
   * Marcados sin línea en la boleta. No se pregunta por uno elegido en una línea, ni por uno ofrecido
   * en un "¿Es este?" sin responder (si se responde "Otro", vuelve).
   */
  readonly missing = computed(() => {
    const inReceipt = new Set(
      this.decisions().flatMap((d) => {
        if (d.target?.kind === 'item') return [d.target.itemId];
        return d.target === null ? d.candidates.flatMap((c) => (c.itemId ? [c.itemId] : [])) : [];
      })
    );
    return this.unmatched().filter((m) => !inReceipt.has(m.item.itemId));
  });
  /** Voucher de tarjeta: trae total pero no el detalle (spec 0015, B8). */
  readonly hasNoDetail = computed(() => {
    const r = this.receipt();
    return !!r && r.total != null && r.lines.length === 0;
  });
  readonly missingUnchosen = computed(() => this.missing().some((m) => m.bought === null));
  readonly canConfirm = computed(
    () =>
      (this.hasNoDetail() ||
        (this.decisions().length > 0 && canConfirmReceipt(this.decisions()))) &&
      !this.missingUnchosen()
  );
  readonly receiptSum = computed(() =>
    this.decisions().reduce((s, d) => s + Math.round(d.quantity * d.unitPrice), 0)
  );
  /** Lo que no es producto. Un descuento a un producto ya va en su precio, no se repite aquí. */
  readonly otherCharges = computed<OtherCharge[]>(() =>
    (this.receipt()?.lines ?? []).flatMap((l, index) => {
      if (!l.legible || l.kind === 'product' || l.line_total == null) return [];
      if (l.kind === 'discount' && l.applies_to != null) return [];
      const amount = l.kind === 'discount' ? -Math.abs(l.line_total) : l.line_total;
      return [{ index, rawText: l.raw_text, kind: l.kind, amount }];
    })
  );
  /** Lo que suman al total los otros cargos (`other`, como redondeos o donaciones, no suma). */
  readonly otherSum = computed(() =>
    this.otherCharges()
      .filter((c) => c.kind !== 'other')
      .reduce((s, c) => s + c.amount, 0)
  );
  /** Las boletas leídas de esta salida, en orden (spec 0015, D6). */
  private readonly parts = signal<
    { receipt: OcrReceipt; validation: ReceiptValidation; files: File[] }[]
  >([]);
  readonly receiptCount = computed(() => this.parts().length);
  /** Una fila por boleta en el resumen (fix-049): el voucher de la feria se ve "sin detalle". */
  readonly receiptSummaries = computed(() =>
    this.parts().map((p) => ({
      store: p.receipt.store,
      date: p.receipt.date,
      total: p.receipt.total ?? p.validation.computedTotal,
      noDetail: p.receipt.lines.length === 0,
    }))
  );
  /** Otra boleta solo al cerrar la lista activa: "Agregar boleta" del Historial es de una. */
  readonly canAddReceipt = computed(() => this.kind() === 'active' && this.parts().length > 0);

  /** Pestaña a la que vuelve el cierre al terminar o cancelar (spec 0016 AC8). */
  readonly origin = signal<CloseOrigin>('active');
  /** Miniatura de la foto mientras se lee (spec 0016 AC14). */
  readonly previewUrl = signal<string | null>(null);
  /** Hay una boleta leyéndose o leída sin cerrar: se puede volver a ella desde Compras. */
  readonly hasOpenReceipt = computed(
    () => this.mode() === 'receipt' && (this.isScanning() || this.parts().length > 0)
  );
  /** La pantalla del cierre está abierta; si no, al terminar de leer se avisa (D6). */
  private visible = false;
  /** Cambia con cada cierre nuevo o cancelado: una lectura vieja no pisa al siguiente. */
  private session = 0;

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  start(
    list: ActiveShoppingList,
    carryPending: boolean,
    mode: CloseMode,
    kind: CloseKind = 'active',
    origin: CloseOrigin = 'active'
  ): void {
    this.reset();
    this.origin.set(origin);
    this.list.set(list);
    this.carryPending.set(carryPending);
    this.mode.set(mode);
    this.kind.set(kind);
    this.manualPrices.set(
      Object.fromEntries(this.checkedItems().map((i) => [i.id, i.product?.last_price ?? null]))
    );
  }

  /** Compra no planificada: no hay lista, la boleta crea la compra. */
  startNew(origin: CloseOrigin = 'active'): void {
    this.start(NEW_PURCHASE, false, 'receipt', 'new', origin);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /** Corrige la tienda o la fecha que leyó la IA en una de las boletas (spec 0016 AC12). */
  setReceiptMeta(index: number, patch: { store?: string | null; date?: string | null }): void {
    const parts = this.parts().map((p, i) =>
      i === index ? { ...p, receipt: { ...p.receipt, ...patch } } : p
    );
    this.parts.set(parts);
    this.receipt.set(combineReceipts(parts.map((p) => p.receipt)));
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
  scan(files: File[]): Promise<void> {
    return this.read(files, false);
  }

  /**
   * Otra boleta de la misma salida (otra tienda, spec 0015 D6): se cruza con lo que todavía no
   * apareció en las anteriores y sus líneas siguen a continuación.
   */
  addReceipt(files: File[]): Promise<void> {
    return this.read(files, true);
  }

  private async read(files: File[], append: boolean): Promise<void> {
    const list = this.list();
    if (!list || !files.length) return;
    // Si se cancela o empieza otro cierre mientras lee, el resultado ya no es de nadie.
    const session = this.session;
    const stale = () => session !== this.session;
    const previous = append ? this.decisions() : [];
    this.isScanning.set(true);
    this.error.set(null);
    if (!append) {
      this.decisions.set([]);
      this.parts.set([]);
    }
    this.previewUrl.set(null);

    try {
      const toReconcile = (i: PopulatedListItem) => ({
        itemId: i.id,
        productId: i.product?.id ?? i.product_id ?? '',
        name: i.product?.name ?? '',
        quantity: i.quantity,
      });
      const seen = new Set(
        previous.flatMap((d) => (d.target?.kind === 'item' ? [d.target.itemId] : []))
      );
      const checked = this.checkedItems()
        .filter((i) => !seen.has(i.id))
        .map(toReconcile);
      // Solo la lista activa tiene pendientes que la boleta pueda dar por comprados.
      const pending =
        this.kind() === 'active'
          ? list.list_items.filter((i) => !i.is_checked && !seen.has(i.id)).map(toReconcile)
          : [];
      const images = await Promise.all(
        files.map(async (f) => ({ base64: await toBase64(f), mimeType: f.type || 'image/jpeg' }))
      );
      if (stale()) return;
      // data: y no blob: (la CSP de la app solo deja imágenes 'self', data: y https:).
      this.previewUrl.set(`data:${images[0].mimeType};base64,${images[0].base64}`);
      const familyId = await this.family.getOrCreateFamilyId();
      const [receipt, aliases, catalog] = await Promise.all([
        this.receipts.extractReceipt(
          images,
          checked.map((c) => c.name)
        ),
        this.receipts.findAliases(familyId),
        this.products.findByFamily(familyId),
      ]);
      if (stale()) return;

      const validation = validateReceipt(receipt);
      const result = reconcileReceipt(
        receipt.lines,
        checked,
        catalog.map((p) => ({ productId: p.id, name: p.name })),
        aliases,
        pending
      );
      const offset = this.parts().reduce((n, p) => n + p.receipt.lines.length, 0);
      const parts = [...this.parts(), { receipt, validation, files }];
      this.parts.set(parts);
      this.receipt.set(combineReceipts(parts.map((p) => p.receipt)));
      this.validation.set(
        combineValidations(
          parts.map((p) => p.validation),
          partOffsets(parts.map((p) => p.receipt))
        )
      );
      const decisions = initialDecisions(result, receipt, validation).map((d) => ({
        ...d,
        index: d.index + offset,
      }));
      // Sin lista, lo que no se reconoce entra al catálogo (si no, la compra quedaría vacía).
      this.decisions.set([
        ...previous,
        ...(this.kind() === 'new'
          ? decisions.map((d) => (d.target?.kind === 'new' ? { ...d, saveToCatalog: true } : d))
          : decisions),
      ]);
      // "¿No lo compraste?" sale de la primera boleta; lo que aparezca en otra deja de preguntarse.
      // Sin detalle no hay con qué saber qué faltó: lo marcado se da por comprado.
      if (!append) {
        this.unmatched.set(
          receipt.lines.length ? result.missing.map((item) => ({ item, bought: null })) : []
        );
      }
    } catch (e) {
      if (stale()) return;
      console.error('Error OCR:', e);
      this.error.set(
        'No pudimos leer la boleta. Revisa tu conexión y que la foto se vea nítida, y reintenta.'
      );
    } finally {
      if (!stale()) this.isScanning.set(false);
    }
    // Se salió del cierre mientras leía (D6): el aviso lleva de vuelta al resultado.
    if (!stale() && !this.visible) {
      this.toast.action(
        this.error() ? 'No pudimos leer la boleta' : 'Tu boleta está lista',
        'Ver',
        () => this.nav.navigateForward('/app/close')
      );
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

  /** "Guardar todos en el catálogo" / "Ninguno": solo lo que no estaba en la lista ni en el catálogo. */
  saveAllToCatalog(save: boolean): void {
    this.decisions.update((ds) =>
      ds.map((d) => (d.target?.kind === 'new' ? { ...d, saveToCatalog: save } : d))
    );
  }

  setMissingBought(itemId: string, bought: boolean): void {
    this.unmatched.update((ms) => ms.map((m) => (m.item.itemId === itemId ? { ...m, bought } : m)));
  }

  /** Cierra con la boleta. La foto se guarda si se puede; si no, la compra se cierra igual. */
  async confirmReceipt(): Promise<boolean> {
    const list = this.list();
    const receipt = this.receipt();
    const validation = this.validation();
    if (!list || !receipt || !validation || !this.canConfirm()) return false;

    return this.save(async () => {
      const familyId = await this.family.getOrCreateFamilyId();
      const imagePaths = await Promise.all(
        this.parts().map(async (p) => {
          try {
            return p.files[0] ? await this.receipts.uploadImage(familyId, p.files[0]) : null;
          } catch (e) {
            console.error('No se pudo guardar la foto de la boleta:', e);
            return null;
          }
        })
      );
      const combined = buildApplyReceipt({
        listId: list.id,
        carryPending: this.carryPending(),
        receipt,
        validation,
        imagePath: imagePaths[0] ?? null,
        decisions: this.decisions(),
        missing: this.missing(),
      });
      const parts = this.parts();
      const input =
        parts.length > 1
          ? splitByReceipt(
              combined,
              parts.map((p, i) => ({
                receipt: p.receipt,
                validation: p.validation,
                imagePath: imagePaths[i],
              }))
            )
          : combined;
      const kind = this.kind();
      if (kind === 'completed') await this.receipts.attachReceipt(input);
      else if (kind === 'new') await this.receipts.createReceiptPurchase(input);
      else await this.receipts.applyReceipt(input);
    });
  }

  reset(): void {
    this.session++;
    this.previewUrl.set(null);
    this.origin.set('active');
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
    this.parts.set([]);
    this.unmatched.set([]);
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
      const error = toMutationError(e);
      if (error instanceof MutationError && error.code === 'nothing_checked') {
        // Todo quedó como "no lo compraste" y la boleta no trae extras (spec 0012).
        this.toast.warning(
          'Marca lo que compraste para finalizar',
          'Sin nada marcado no es una compra.'
        );
        return false;
      }
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
