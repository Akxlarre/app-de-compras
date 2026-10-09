import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { ApplyReceiptInput, OcrReceipt, ReceiptAlias } from '@core/models/receipt.model';
import { parseOcrReceipt } from '@core/utils/receipt.utils';

/** Foto de una boleta en base64 **sin** el prefijo `data:…;base64,`. */
export interface ReceiptImage {
  base64: string;
  mimeType: string;
}

/** Bucket privado; cada familia sube en su carpeta (`<family_id>/…`). */
const BUCKET = 'receipts';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/**
 * Boletas: OCR vía Edge Function `process-receipt` (Gemini), foto en Storage y cierre de la
 * compra con `shop.apply_receipt`. Lanza el error de Supabase.
 */
@Injectable({ providedIn: 'root' })
export class ReceiptsRepository {
  private readonly supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client.schema('shop');
  }

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

  /** Sube la foto de la boleta y devuelve su ruta en el bucket. */
  async uploadImage(familyId: string, file: Blob): Promise<string> {
    const ext = EXTENSIONS[file.type] ?? 'jpg';
    const path = `${familyId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (error) throw error;
    return path;
  }

  /** Textos de boleta ya confirmados por la familia (`shop.product_aliases`). */
  async findAliases(familyId: string): Promise<ReceiptAlias[]> {
    const { data, error } = await this.db
      .from('product_aliases')
      .select('raw_text, product_id')
      .eq('family_id', familyId);
    if (error) throw error;
    return ((data ?? []) as { raw_text: string; product_id: string }[]).map((a) => ({
      rawText: a.raw_text,
      productId: a.product_id,
    }));
  }

  /**
   * Cierra la compra con la boleta en una transacción (RPC `apply_receipt`): la boleta manda en
   * precio y cantidad, guarda los alias confirmados y los extras que el usuario pasó al catálogo.
   * @returns id de la boleta guardada.
   */
  async applyReceipt(input: ApplyReceiptInput): Promise<string> {
    const { data, error } = await this.db.rpc('apply_receipt', {
      p_list_id: input.listId,
      p_carry_pending: input.carryPending,
      p_receipt: receiptPayload(input),
      p_items: itemsPayload(input),
      p_extras: extrasPayload(input),
    });
    if (error) throw error;
    return data as string;
  }

  /**
   * Agrega la boleta a una compra ya finalizada y sin boleta (RPC `attach_receipt`; Historial →
   * "Agregar boleta"). Lo mismo que `applyReceipt`, sin mover pendientes.
   */
  async attachReceipt(input: ApplyReceiptInput): Promise<string> {
    const { data, error } = await this.db.rpc('attach_receipt', {
      p_list_id: input.listId,
      p_receipt: receiptPayload(input),
      p_items: itemsPayload(input),
      p_extras: extrasPayload(input),
    });
    if (error) throw error;
    return data as string;
  }

  /**
   * Compra no planificada: la boleta crea una compra finalizada, sin lista (RPC
   * `create_receipt_purchase`). Las líneas van como `extras` (productos conocidos o nuevos).
   */
  async createReceiptPurchase(
    input: ApplyReceiptInput,
    name = 'Compra sin lista'
  ): Promise<string> {
    const { data, error } = await this.db.rpc('create_receipt_purchase', {
      p_receipt: receiptPayload(input),
      p_extras: extrasPayload(input),
      p_name: name,
    });
    if (error) throw error;
    return data as string;
  }

  /** Borra la foto de una boleta del bucket (al borrar la compra, spec 0012). */
  async removeImage(path: string): Promise<void> {
    const { error } = await this.supabase.client.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }

  /** URL firmada (1 hora) de la foto de una boleta; el bucket es privado y solo abre a la familia. */
  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error) throw error;
    return data.signedUrl;
  }
}

const SIGNED_URL_SECONDS = 3600;

const receiptPayload = (input: ApplyReceiptInput) => ({
  store: input.store,
  purchased_at: input.purchasedAt,
  total: input.total,
  image_path: input.imagePath,
  ocr_result: input.ocrResult,
  ocr_check: input.ocrCheck,
  lines: input.lines.map((l) => ({
    index: l.index,
    raw_text: l.rawText,
    name: l.name,
    kind: l.kind,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    amount: l.amount,
    item_id: l.itemId,
    product_id: l.productId,
  })),
});

const itemsPayload = (input: ApplyReceiptInput) => [
  ...input.items.map((i) => ({
    item_id: i.itemId,
    unit_price: i.unitPrice,
    quantity: i.quantity,
    raw_text: i.rawText,
    save_alias: i.saveAlias,
  })),
  ...input.uncheckItemIds.map((id) => ({ item_id: id, checked: false })),
];

const extrasPayload = (input: ApplyReceiptInput) =>
  input.extras.map((e) => ({
    product_id: e.productId,
    raw_text: e.rawText,
    name: e.name,
    unit_price: e.unitPrice,
    quantity: e.quantity,
    line_index: e.lineIndex,
  }));
