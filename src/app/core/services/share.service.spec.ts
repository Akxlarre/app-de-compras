import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const native = vi.hoisted(() => ({ isNative: false }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.isNative },
}));

import { ShareService } from './share.service';

describe('ShareService (spec 0024 D2)', () => {
  let service: ShareService;
  let open: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  const URL = 'https://wa.me/?text=*Lista*%0A%E2%80%A2%20Leche%20%C3%97%202';

  beforeEach(() => {
    native.isNative = false;
    open = vi.fn().mockReturnValue({});
    writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('open', open);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({ providers: [ShareService] });
    service = TestBed.inject(ShareService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('en el navegador abre WhatsApp Web en otra pestaña con el texto', async () => {
    expect(await service.openWhatsApp('*Lista*\n• Leche × 2')).toBe('opened');
    expect(open).toHaveBeenCalledWith(URL, '_blank');
  });

  it('en el teléfono navega a wa.me (Capacitor lo abre en WhatsApp)', async () => {
    native.isNative = true;
    const go = vi.spyOn(service as any, 'navigate').mockImplementation(() => {});
    expect(await service.openWhatsApp('*Lista*\n• Leche × 2')).toBe('opened');
    expect(go).toHaveBeenCalledWith(URL);
    expect(open).not.toHaveBeenCalled();
  });

  it('si el navegador bloquea la pestaña, copia el texto', async () => {
    open.mockReturnValue(null);
    expect(await service.openWhatsApp('hola')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hola');

    writeText.mockRejectedValue(new Error('sin permiso'));
    expect(await service.openWhatsApp('hola')).toBe('failed');
  });
});
