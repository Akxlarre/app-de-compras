import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppUpdateService } from './app-update.service';
import { AppUpdatesRepository } from '../repositories/app-updates.repository';

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let repo: { findLatest: ReturnType<typeof vi.fn>; getApkPublicUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = { findLatest: vi.fn(), getApkPublicUrl: vi.fn() };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppUpdateService, { provide: AppUpdatesRepository, useValue: repo }],
    });
    service = TestBed.inject(AppUpdateService);
  });

  it('getLatestUpdate pide la última versión del target shop', async () => {
    const update = { id: 'u', build_number: 7 };
    repo.findLatest.mockResolvedValue(update);

    expect(await service.getLatestUpdate()).toEqual(update);
    expect(repo.findLatest).toHaveBeenCalledWith('shop');
  });

  it('getLatestUpdate devuelve null si la consulta falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.findLatest.mockRejectedValue({ message: '406' });

    expect(await service.getLatestUpdate()).toBeNull();
  });

  it('getApkDownloadUrl delega en el repositorio', async () => {
    repo.getApkPublicUrl.mockReturnValue('https://x/app.apk');

    expect(await service.getApkDownloadUrl('v7/app.apk')).toBe('https://x/app.apk');
    expect(repo.getApkPublicUrl).toHaveBeenCalledWith('v7/app.apk');
  });
});
