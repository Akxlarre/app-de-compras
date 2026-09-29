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

/** Línea que no estaba en la lista y el usuario guarda en el catálogo (`apply_receipt.p_extras`). */
export interface ReceiptExtraInput {
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
  ocrCheck: ReceiptValidation | null;
  items: ReceiptItemInput[];
  extras: ReceiptExtraInput[];
}

/** Ítem tal como lo devuelve la Edge Function `process-receipt` (sin normalizar). */
export interface OcrReceiptItem {
  name?: string | null;
  price?: number | null;
}
