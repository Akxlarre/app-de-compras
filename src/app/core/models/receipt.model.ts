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

/** Ítem tal como lo devuelve la Edge Function `process-receipt` (sin normalizar). */
export interface OcrReceiptItem {
  name?: string | null;
  price?: number | null;
}
