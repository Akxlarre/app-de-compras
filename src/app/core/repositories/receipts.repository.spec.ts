import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiptsRepository } from './receipts.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { supabaseServiceMock } from '../../../testing/supabase-query.mock';

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

  it('extractReceipt lanza si la Edge Function falla', async () => {
    const error = new Error('500');
    mock.client.functions.invoke.mockResolvedValue({ data: null, error });
    await expect(repo.extractReceipt([{ base64: 'x', mimeType: 'image/jpeg' }])).rejects.toBe(
      error
    );
  });
});
