export type ReceiptStatus = 'pending_ocr' | 'processed' | 'error';

export interface Receipt {
  id: string;
  family_id: string;
  image_url?: string;
  total_amount?: number;
  status: ReceiptStatus;
  date?: string;
  uploaded_by?: string;
  created_at: string;
}

/** Qué es cada línea de una boleta. `other` = redondeo, donación, etc.: no suma al total. */
export type OcrLineKind = 'product' | 'discount' | 'bag' | 'deposit' | 'other';

/** Línea leída por el OCR (contrato de `process-receipt`, specs/0007). */
export interface OcrReceiptLine {
  raw_text: string | null;
  kind: OcrLineKind;
  name: string | null;
  matched_list_item: string | null;
  quantity: number | null;
  unit: 'un' | 'kg' | null;
  unit_price: number | null;
  line_total: number | null;
  /** Índice de la línea a la que aplica un descuento (null: descuento sobre el total). */
  applies_to: number | null;
  /** false: el OCR no pudo leerla (no la inventa). */
  legible: boolean;
}

export interface OcrReceipt {
  store: string | null;
  date: string | null;
  total: number | null;
  lines: OcrReceiptLine[];
}

export type DoubtReason = 'ilegible' | 'sin-total' | 'no-cuadra';

/** Resultado de revisar una boleta con aritmética (`validateReceipt`). */
export interface ReceiptValidation {
  /** Suma de las líneas que cobran (productos, bolsas, envases) menos los descuentos. */
  computedTotal: number;
  /** null si la boleta no trae total. */
  totalMatches: boolean | null;
  /** Líneas a revisar, por índice. */
  doubtfulLines: { index: number; reason: DoubtReason }[];
}

/** De dónde sale el total de una compra cerrada (`shopping_lists.total_source`). */
export type TotalSource = 'receipt' | 'manual' | 'estimated';

/** Ítem marcado de la compra, candidato a coincidir con una línea de la boleta. */
export interface ReconcileListItem {
  itemId: string;
  productId: string;
  name: string;
  quantity: number;
}

/** Producto del catálogo de la familia. */
export interface CatalogProduct {
  productId: string;
  name: string;
}

/** Texto de boleta ya confirmado como un producto (`shop.product_aliases`). */
export interface ReceiptAlias {
  rawText: string;
  productId: string;
}

export interface MatchCandidate {
  productId: string;
  /** Ítem de la compra; null si el producto no estaba en la lista. */
  itemId: string | null;
  name: string;
  score: number;
}

/**
 * Una línea de producto de la boleta después de conciliar:
 * - `matched`: coincide con un ítem de la compra (por alias, por el OCR o por similitud alta);
 * - `candidate`: parecida a uno o más productos, el usuario elige ("¿Es este?");
 * - `extra`: no estaba en la lista (suma al gasto; opcionalmente se guarda en el catálogo).
 */
export interface ReconciledLine {
  index: number;
  line: OcrReceiptLine;
  status: 'matched' | 'candidate' | 'extra';
  via: 'alias' | 'ocr' | 'similarity' | null;
  match: MatchCandidate | null;
  candidates: MatchCandidate[];
}

export interface ReconciliationResult {
  lines: ReconciledLine[];
  /** Ítems marcados que no aparecen en la boleta: "¿no lo compraste?". */
  missing: ReconcileListItem[];
}

/** A qué va una línea de la boleta al cerrar la compra. */
export type LineTarget =
  /** Un ítem de la compra. */
  | { kind: 'item'; itemId: string; productId: string; name: string }
  /** Un producto del catálogo que no estaba en la lista. */
  | { kind: 'product'; productId: string; name: string }
  /** Algo nuevo: suma al gasto; entra al catálogo solo si `saveToCatalog`. */
  | { kind: 'new' };

/** Una línea de la boleta en la pantalla de conciliación, con lo que decidió el usuario. */
export interface LineDecision {
  index: number;
  rawText: string | null;
  /** Nombre para un producto nuevo (lo que leyó el OCR; editable). */
  name: string;
  quantity: number;
  unitPrice: number;
  /** null: "¿Es este?" todavía sin elegir. */
  target: LineTarget | null;
  status: ReconciledLine['status'];
  candidates: MatchCandidate[];
  saveToCatalog: boolean;
  /** Línea que `validateReceipt` marcó para revisar. */
  doubt: DoubtReason | null;
  /**
   * Lo que propuso la lectura, para registrar las correcciones (`ocr_check`). `target`: el
   * producto, `'new'` o null (sin elegir), como `targetKey`.
   */
  ocr: { quantity: number; unitPrice: number; target: string | null };
}

/** Ítem marcado que no aparece en la boleta: "¿no lo compraste?". */
export interface MissingDecision {
  item: ReconcileListItem;
  /** false: vuelve a pendiente. Por defecto true (la boleta no desmarca sin preguntar). */
  bought: boolean;
}

export interface ReceiptCorrection {
  index: number;
  field: 'quantity' | 'unitPrice' | 'product';
  ocr: number | string | null;
  user: number | string | null;
}

/** Lo que se guarda en `receipts.ocr_check`: la revisión aritmética y lo que corrigió el usuario. */
export interface ReceiptCheck extends ReceiptValidation {
  corrections: ReceiptCorrection[];
}

/** Precio confirmado de un ítem marcado al cerrar sin boleta. */
export interface ManualPrice {
  itemId: string;
  unitPrice: number;
}

/** Línea de la boleta aplicada a un ítem de la compra (`apply_receipt.p_items`). */
export interface ReceiptItemInput {
  itemId: string;
  unitPrice: number;
  quantity: number;
  rawText: string | null;
  /** Guardar `rawText` como alias del producto (el usuario confirmó la coincidencia). */
  saveAlias: boolean;
}

/**
 * Línea que no estaba en la lista y entra a la compra (`apply_receipt.p_extras`): un producto ya
 * conocido (`productId`) o uno nuevo que el usuario guarda en el catálogo (`productId` null).
 */
export interface ReceiptExtraInput {
  productId: string | null;
  rawText: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ApplyReceiptInput {
  listId: string;
  carryPending: boolean;
  store: string | null;
  /** YYYY-MM-DD */
  purchasedAt: string | null;
  total: number | null;
  imagePath: string | null;
  ocrResult: OcrReceipt | null;
  ocrCheck: ReceiptCheck | ReceiptValidation | null;
  items: ReceiptItemInput[];
  extras: ReceiptExtraInput[];
  /** "¿No lo compraste?": ítems marcados que vuelven a pendiente. */
  uncheckItemIds: string[];
}

/** Ítem tal como lo devuelve la Edge Function `process-receipt` (sin normalizar). */
export interface OcrReceiptItem {
  name?: string | null;
  price?: number | null;
}
