import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineStoreService } from './offline-store.service';
import { SessionScopeService } from '../auth/session-scope.service';
import type { ActiveShoppingList } from '../../models/shopping-list.model';

describe('OfflineStoreService', () => {
  let store: OfflineStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(OfflineStoreService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('guarda y lee la cola y la foto de la lista', () => {
    const list = { id: 'l1', list_items: [] } as unknown as ActiveShoppingList;
    store.saveQueue([{ kind: 'check', itemId: 'a', checked: true }]);
    store.saveSnapshot(list);

    const fresh = TestBed.runInInjectionContext(() => new OfflineStoreService());
    expect(fresh.loadQueue()).toEqual([{ kind: 'check', itemId: 'a', checked: true }]);
    expect(fresh.loadSnapshot()).toEqual(list);
  });

  it('sin nada guardado devuelve vacío', () => {
    expect(store.loadQueue()).toEqual([]);
    expect(store.loadSnapshot()).toBeNull();
  });

  it('si el almacenamiento falla no rompe', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => store.saveQueue([])).not.toThrow();
    expect(store.loadQueue()).toEqual([]);
    expect(store.loadSnapshot()).toBeNull();
  });

  it('se borra al cerrar sesión', () => {
    store.saveQueue([{ kind: 'quantity', itemId: 'a', delta: 1 }]);
    TestBed.inject(SessionScopeService).clear();
    expect(store.loadQueue()).toEqual([]);
  });
});
