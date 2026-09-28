import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { OcrReceipt } from '@core/models/receipt.model';
import { parseOcrReceipt } from '@core/utils/receipt.utils';

/** Foto de una boleta en base64 **sin** el prefijo `data:…;base64,`. */
export interface ReceiptImage {
  base64: string;
  mimeType: string;
}

/** Boletas: OCR vía Edge Function `process-receipt` (Gemini). Lanza si la función falla. */
@Injectable({ providedIn: 'root' })
export class ReceiptsRepository {
  private readonly supabase = inject(SupabaseService);

  /**
   * Lee una boleta (varias fotos si es larga). `expectedItems` = lo que la familia pensaba comprar,
   * para que el OCR lo use de contexto. Lanza `OcrContractError` si la respuesta no cumple el contrato.
   */
  async extractReceipt(images: ReceiptImage[], expectedItems: string[] = []): Promise<OcrReceipt> {
    const { data, error } = await this.supabase.client.functions.invoke('process-receipt', {
      body: { images, expectedItems },
    });
    if (error) throw error;
    return parseOcrReceipt(data);
  }
}
