import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { OcrReceiptItem } from '@core/models/receipt.model';

/** Boletas: OCR vía Edge Function `process-receipt` (Gemini). Lanza si la función falla. */
@Injectable({ providedIn: 'root' })
export class ReceiptsRepository {
  private readonly supabase = inject(SupabaseService);

  /** @param imageBase64 imagen en base64 **sin** el prefijo `data:…;base64,`. */
  async extractItems(imageBase64: string, mimeType: string): Promise<OcrReceiptItem[]> {
    const { data, error } = await this.supabase.client.functions.invoke('process-receipt', {
      body: { imageBase64, mimeType },
    });
    if (error) throw error;
    return (data as { items?: OcrReceiptItem[] } | null)?.items ?? [];
  }
}
