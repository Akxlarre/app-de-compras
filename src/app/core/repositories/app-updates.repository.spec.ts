import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppUpdatesRepository } from './app-updates.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('AppUpdatesRepository', () => {
  let repo: AppUpdatesRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(AppUpdatesRepository);
  });

  it('findLatest trae el build más alto del target', async () => {
    const update = { id: 'u', build_number: 7 };
    const q = queryMock({ data: update });
    mock.client.from.mockReturnValue(q);

    expect(await repo.findLatest('shop')).toEqual(update);
    expect(mock.client.from).toHaveBeenCalledWith('app_updates');
    expect(q.eq).toHaveBeenCalledWith('app_target', 'shop');
    expect(q.order).toHaveBeenCalledWith('build_number', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it('findLatest lanza el error de Supabase', async () => {
    const error = { message: '406' };
    mock.client.from.mockReturnValue(queryMock({ error }));
    await expect(repo.findLatest('shop')).rejects.toBe(error);
  });

  it('getApkPublicUrl usa el bucket releases', () => {
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://x/app.apk' } }));
    mock.client.storage.from.mockReturnValue({ getPublicUrl });

    expect(repo.getApkPublicUrl('v7/app.apk')).toBe('https://x/app.apk');
    expect(mock.client.storage.from).toHaveBeenCalledWith('releases');
    expect(getPublicUrl).toHaveBeenCalledWith('v7/app.apk');
  });

  it('getApkPublicUrl devuelve null si no hay URL', () => {
    mock.client.storage.from.mockReturnValue({ getPublicUrl: () => ({ data: {} }) });
    expect(repo.getApkPublicUrl('x')).toBeNull();
  });
});
