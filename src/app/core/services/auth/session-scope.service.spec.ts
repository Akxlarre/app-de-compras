import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SessionScopeService } from './session-scope.service';

describe('SessionScopeService', () => {
  let scope: SessionScopeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    scope = TestBed.inject(SessionScopeService);
  });

  it('clear() ejecuta todas las limpiezas registradas', () => {
    const a = vi.fn();
    const b = vi.fn();
    scope.register(a);
    scope.register(b);

    scope.clear();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('las limpiezas siguen registradas para el próximo cierre de sesión', () => {
    const reset = vi.fn();
    scope.register(reset);

    scope.clear();
    scope.clear();

    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('si una limpieza falla, igual corren las demás', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn();
    scope.register(() => {
      throw new Error('boom');
    });
    scope.register(ok);

    expect(() => scope.clear()).not.toThrow();
    expect(ok).toHaveBeenCalled();
  });
});
