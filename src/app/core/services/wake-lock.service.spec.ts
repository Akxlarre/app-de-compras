import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WakeLockService } from './wake-lock.service';

describe('WakeLockService (spec 0025 D1)', () => {
  let service: WakeLockService;
  let release: ReturnType<typeof vi.fn>;
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    release = vi.fn().mockResolvedValue(undefined);
    request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    TestBed.configureTestingModule({ providers: [WakeLockService] });
    service = TestBed.inject(WakeLockService);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
  });

  it('pide mantener la pantalla encendida y la suelta', async () => {
    await service.keepScreenOn();
    expect(request).toHaveBeenCalledWith('screen');
    await service.release();
    expect(release).toHaveBeenCalled();
    await service.release();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('sin soporte o si el teléfono lo niega, no falla', async () => {
    request.mockRejectedValue(new Error('NotAllowedError'));
    await expect(service.keepScreenOn()).resolves.toBeUndefined();

    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    await expect(service.keepScreenOn()).resolves.toBeUndefined();
    await expect(service.release()).resolves.toBeUndefined();
  });
});
