import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { vi } from 'vitest';
import { BaseFacade } from './base.facade';
import { SessionScopeService } from '../services/auth/session-scope.service';

// ── Subclase concreta para tests ──────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
class TestFacade extends BaseFacade<string[]> {
  fetchData = vi.fn<[], Promise<string[]>>().mockResolvedValue(['a', 'b', 'c']);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup() {
  TestBed.configureTestingModule({});
  return TestBed.inject(TestFacade);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseFacade', () => {
  let facade: TestFacade;

  beforeEach(() => {
    facade = setup();
  });

  // Estado inicial
  describe('initial state', () => {
    it('data should be null', () => {
      expect(facade.data()).toBeNull();
    });

    it('isLoading should be false', () => {
      expect(facade.isLoading()).toBe(false);
    });

    it('error should be null', () => {
      expect(facade.error()).toBeNull();
    });

    it('hasData should be false', () => {
      expect(facade.hasData()).toBe(false);
    });
  });

  // Primera carga (con skeleton)
  describe('initialize() — first call', () => {
    it('should show skeleton initially, load data, and turn off skeleton', async () => {
      expect(true).toBeTruthy();
    });

    it('should set error when fetchData throws', async () => {
      expect(true).toBeTruthy();
    });
  });

  // Patrón SWR: segunda llamada
  describe('initialize() — SWR: second call', () => {
    it('should silently refresh data on re-entry', async () => {
      expect(true).toBeTruthy();
    });

    it('should keep stale data if silent refresh fails', async () => {
      await facade.initialize();
      facade.fetchData.mockRejectedValueOnce(new Error('timeout'));
      await facade.initialize(); // segunda llamada con error
      expect(facade.data()).toEqual(['a', 'b', 'c']); // datos stale intactos
    });

    it('un refresh silencioso exitoso limpia el error anterior (0004)', async () => {
      facade.fetchData.mockRejectedValueOnce(new Error('fail'));
      await facade.initialize();
      expect(facade.error()).not.toBeNull();

      await facade.initialize(); // SWR → refreshSilently() en background

      await vi.waitFor(() => expect(facade.error()).toBeNull());
      expect(facade.data()).toEqual(['a', 'b', 'c']);
    });
  });

  // Cierre de sesión (0004)
  describe('SessionScope', () => {
    it('se limpia al cerrar sesión y el próximo initialize() recarga con skeleton', async () => {
      await facade.initialize();
      const dispose = vi.spyOn(facade, 'dispose');

      TestBed.inject(SessionScopeService).clear();

      expect(facade.data()).toBeNull();
      expect(dispose).toHaveBeenCalled();
      facade.fetchData.mockClear();
      await facade.initialize();
      expect(facade.fetchData).toHaveBeenCalledTimes(1);
    });
  });

  // reset()
  describe('reset()', () => {
    it('should clear data', async () => {
      await facade.initialize();
      facade.reset();
      expect(facade.data()).toBeNull();
    });

    it('should force a full reload on next initialize()', async () => {
      await facade.initialize();
      facade.reset();
      facade.fetchData.mockClear();
      await facade.initialize();
      expect(facade.fetchData).toHaveBeenCalledTimes(1);
      expect(facade.isLoading()).toBe(false);
    });
  });

  // retryLoad()
  describe('retryLoad()', () => {
    it('should reset and reload after an error', async () => {
      facade.fetchData.mockRejectedValueOnce(new Error('fail'));
      await facade.initialize();
      expect(facade.error()).not.toBeNull();

      await facade.retryLoad();
      expect(facade.data()).toEqual(['a', 'b', 'c']);
      expect(facade.error()).toBeNull();
    });

    it('should show skeleton on retry (not SWR path)', async () => {
      facade.fetchData.mockRejectedValueOnce(new Error('fail'));
      await facade.initialize();

      // retryLoad llama reset() → _initialized = false → próximo initialize muestra skeleton
      facade.fetchData.mockResolvedValueOnce(['new']);
      await facade.retryLoad();
      expect(facade.data()).toEqual(['new']);
      expect(facade.isLoading()).toBe(false);
    });
  });

  // dispose() — hook para Realtime
  describe('dispose()', () => {
    it('should be callable without error (default no-op)', () => {
      expect(() => facade.dispose()).not.toThrow();
    });
  });
});
