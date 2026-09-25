import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiptsRepository } from './receipts.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('ReceiptsRepository', () => {
  let repo: ReceiptsRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ReceiptsRepository);
  });

  it('extractItems invoca process-receipt y devuelve los ítems crudos', async () => {
    const items = [{ name: 'Leche', price: 1200 }];
    mock.client.functions.invoke.mockResolvedValue({ data: { items }, error: null });

    expect(await repo.extractItems('QUJD', 'image/png')).toEqual(items);
    expect(mock.client.functions.invoke).toHaveBeenCalledWith('process-receipt', {
      body: { imageBase64: 'QUJD', mimeType: 'image/png' },
    });
  });

  it('extractItems devuelve [] si la respuesta no trae ítems', async () => {
    mock.client.functions.invoke.mockResolvedValue({ data: {}, error: null });
    expect(await repo.extractItems('x', 'image/jpeg')).toEqual([]);
  });

  it('extractItems lanza si la Edge Function falla', async () => {
    const error = new Error('500');
    mock.client.functions.invoke.mockResolvedValue({ data: null, error });
    await expect(repo.extractItems('x', 'image/jpeg')).rejects.toBe(error);
  });
});
