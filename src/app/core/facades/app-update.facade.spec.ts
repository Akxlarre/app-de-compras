import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppUpdateFacade } from './app-update.facade';
import { AppUpdateService } from '../services/app-update.service';
import { ToastService } from '../services/ui/toast.service';

describe('AppUpdateFacade', () => {
  let facade: AppUpdateFacade;
  let service: {
    getCurrentBuild: ReturnType<typeof vi.fn>;
    getLatestUpdate: ReturnType<typeof vi.fn>;
  };
  let toast: {
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  function setup(opts: { build: number | null; latest?: unknown; falla?: boolean }) {
    service = {
      getCurrentBuild: vi.fn().mockResolvedValue(opts.build),
      getLatestUpdate: opts.falla
        ? vi.fn().mockRejectedValue(new Error('sin red'))
        : vi.fn().mockResolvedValue(opts.latest ?? null),
    };
    toast = { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AppUpdateFacade,
        { provide: AppUpdateService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(AppUpdateFacade);
  }

  const totalToasts = () =>
    toast.success.mock.calls.length +
    toast.info.mock.calls.length +
    toast.error.mock.calls.length +
    toast.warning.mock.calls.length;

  it('should be created', () => {
    setup({ build: 1 });
    expect(facade).toBeTruthy();
  });

  // Antes: tocar "Buscar Actualizaciones" no respondía nada salvo que
  // hubiera versión nueva.
  describe('búsqueda manual — el usuario la pidió y espera respuesta', () => {
    it('avisa que está al día', async () => {
      setup({ build: 5, latest: { build_number: 5 } });

      await facade.checkForUpdates('manual');

      // Info, no success: el verde queda para lo logrado.
      expect(toast.info).toHaveBeenCalledOnce();
      expect(totalToasts()).toBe(1);
    });

    it('avisa cuando la consulta falla', async () => {
      setup({ build: 5, falla: true });

      await facade.checkForUpdates('manual');

      expect(toast.error).toHaveBeenCalledOnce();
      expect(facade.error()).not.toBeNull();
    });

    it('avisa cuando no hay build nativo (web)', async () => {
      setup({ build: null });

      await facade.checkForUpdates('manual');

      expect(toast.info).toHaveBeenCalledOnce();
      expect(totalToasts()).toBe(1);
    });

    it('no agrega toast cuando hay versión nueva: ya aparece el modal', async () => {
      setup({ build: 5, latest: { build_number: 6 } });

      await facade.checkForUpdates('manual');

      expect(facade.updateAvailable()).not.toBeNull();
      expect(totalToasts()).toBe(0);
    });
  });

  describe('búsqueda automática — al arrancar la app, sin molestar', () => {
    it('no avisa si está al día', async () => {
      setup({ build: 5, latest: { build_number: 5 } });

      await facade.checkForUpdates();

      expect(totalToasts()).toBe(0);
    });

    it('no avisa si la consulta falla, aunque guarda el error', async () => {
      setup({ build: 5, falla: true });

      await facade.checkForUpdates('auto');

      expect(totalToasts()).toBe(0);
      expect(facade.error()).not.toBeNull();
    });
  });
});
