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

/** Ítem tal como lo devuelve la Edge Function `process-receipt` (sin normalizar). */
export interface OcrReceiptItem {
  name?: string | null;
  price?: number | null;
}
