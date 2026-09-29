import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReceiptsRepository } from './receipts.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('ReceiptsRepository', () => {
  let repo: ReceiptsRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;
  const linea = {
    raw_text: 'BETUN LIQ NE',
    kind: 'product',
    name: 'Betún líquido negro',
    matched_list_item: null,
    quantity: 2,
    unit: 'un',
    unit_price: 640,
    line_total: 1280,
    applies_to: null,
    legible: true,
  };

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ReceiptsRepository);
  });

  it('extractReceipt manda las fotos y la lista de contexto, y devuelve la boleta validada', async () => {
    mock.client.functions.invoke.mockResolvedValue({
      data: { store: 'Líder', date: null, total: 1280, lines: [linea], _model: 'gemini-3.8-flash' },
      error: null,
    });
    const images = [
      { base64: 'QUJD', mimeType: 'image/png' },
      { base64: 'REVG', mimeType: 'image/jpeg' },
    ];

    const r = await repo.extractReceipt(images, ['Betún']);

    expect(r).toEqual({ store: 'Líder', date: null, total: 1280, lines: [linea] });
    expect(mock.client.functions.invoke).toHaveBeenCalledWith('process-receipt', {
      body: { images, expectedItems: ['Betún'] },
    });
  });

  it('extractReceipt lanza si la respuesta no cumple el contrato', async () => {
    mock.client.functions.invoke.mockResolvedValue({
      data: { items: [{ name: 'Leche', price: 1200 }] },
      error: null,
    });
    await expect(repo.extractReceipt([{ base64: 'x', mimeType: 'image/jpeg' }])).rejects.toThrow(
      /contrato/
    );
  });

  it('applyReceipt cierra la compra con la boleta (RPC apply_receipt) y devuelve su id', async () => {
    mock.shop.rpc.mockResolvedValue({ data: 'r1', error: null });
    const ocr = { store: 'Líder', date: '2026-09-29', total: 1280, lines: [] };
    const check = { computedTotal: 1280, totalMatches: true, doubtfulLines: [] };

    const id = await repo.applyReceipt({
      listId: 'l1',
      carryPending: true,
      store: 'Líder',
      purchasedAt: '2026-09-29',
      total: 1280,
      imagePath: 'fam/b.jpg',
      ocrResult: ocr as never,
      ocrCheck: check,
      items: [{ itemId: 'i1', unitPrice: 640, quantity: 2, rawText: 'BETUN', saveAlias: true }],
      extras: [
        { productId: null, rawText: 'BOLSA', name: 'Bolsa basura', unitPrice: 450, quantity: 1 },
        { productId: 'p-cafe', rawText: 'CAFE JV', name: 'Café', unitPrice: 3990, quantity: 1 },
      ],
      uncheckItemIds: ['i2'],
    });

    expect(id).toBe('r1');
    expect(mock.shop.rpc).toHaveBeenCalledWith('apply_receipt', {
      p_list_id: 'l1',
      p_carry_pending: true,
      p_receipt: {
        store: 'Líder',
        purchased_at: '2026-09-29',
        total: 1280,
        image_path: 'fam/b.jpg',
        ocr_result: ocr,
        ocr_check: check,
      },
      p_items: [
        { item_id: 'i1', unit_price: 640, quantity: 2, raw_text: 'BETUN', save_alias: true },
        { item_id: 'i2', checked: false },
      ],
      p_extras: [
        {
          product_id: null,
          raw_text: 'BOLSA',
          name: 'Bolsa basura',
          unit_price: 450,
          quantity: 1,
        },
        { product_id: 'p-cafe', raw_text: 'CAFE JV', name: 'Café', unit_price: 3990, quantity: 1 },
      ],
    });
  });

  it('applyReceipt lanza el error de Supabase', async () => {
    const error = { message: 'list_not_active' };
    mock.shop.rpc.mockResolvedValue({ data: null, error });
    await expect(
      repo.applyReceipt({
        listId: 'l1',
        carryPending: false,
        store: null,
        purchasedAt: null,
        total: null,
        imagePath: null,
        ocrResult: null,
        ocrCheck: null,
        items: [],
        extras: [],
        uncheckItemIds: [],
      })
    ).rejects.toBe(error);
  });

  it('uploadImage sube la foto al bucket privado, en la carpeta de la familia', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null });
    mock.client.storage.from.mockReturnValue({ upload });
    const file = new Blob(['x'], { type: 'image/jpeg' });

    const path = await repo.uploadImage('fam-1', file);

    expect(mock.client.storage.from).toHaveBeenCalledWith('receipts');
    expect(path).toMatch(/^fam-1\/[\w-]+\.jpg$/);
    expect(upload).toHaveBeenCalledWith(path, file, { contentType: 'image/jpeg', upsert: false });
  });

  it('uploadImage lanza si falla la subida', async () => {
    const error = new Error('403');
    mock.client.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error }),
    });
    await expect(repo.uploadImage('fam-1', new Blob(['x'], { type: 'image/png' }))).rejects.toBe(
      error
    );
  });

  it('findAliases lee los alias de la familia', async () => {
    const q = queryMock({ data: [{ raw_text: 'LCH ENT', product_id: 'p1' }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findAliases('fam-1')).toEqual([{ rawText: 'LCH ENT', productId: 'p1' }]);
    expect(mock.shop.from).toHaveBeenCalledWith('product_aliases');
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
  });

  it('extractReceipt lanza si la Edge Function falla', async () => {
    const error = new Error('500');
    mock.client.functions.invoke.mockResolvedValue({ data: null, error });
    await expect(repo.extractReceipt([{ base64: 'x', mimeType: 'image/jpeg' }])).rejects.toBe(
      error
    );
  });
});
