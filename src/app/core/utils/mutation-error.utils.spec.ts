import { describe, it, expect, afterEach, vi } from 'vitest';
import { MutationError, isNetworkFailure, toMutationError } from './mutation-error.utils';

describe('toMutationError', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [{ code: 'P0002', message: 'list_not_found' }, 'not_found'],
    [{ code: 'P0002', message: 'item_not_found' }, 'not_found'],
    [{ code: '22023', message: 'list_not_active' }, 'list_not_active'],
    [{ code: '', message: 'TypeError: Failed to fetch' }, 'offline'],
    [{ code: '', message: 'FetchError: Load failed' }, 'offline'],
  ])('%o → %s', (error, code) => {
    const mapped = toMutationError(error);
    expect(mapped).toBeInstanceOf(MutationError);
    expect((mapped as MutationError).code).toBe(code);
  });

  it('un TypeError de fetch lanzado (no devuelto) también es offline', () => {
    expect((toMutationError(new TypeError('Failed to fetch')) as MutationError).code).toBe(
      'offline',
    );
  });

  it('sin red en el navegador, cualquier fallo es offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect((toMutationError({ code: '500', message: 'x' }) as MutationError).code).toBe('offline');
  });

  it('deja pasar los demás errores tal cual', () => {
    const other = { code: '23514', message: 'check violation' };
    expect(toMutationError(other)).toBe(other);
  });

  it('un MutationError se devuelve igual', () => {
    const e = new MutationError('not_found');
    expect(toMutationError(e)).toBe(e);
  });
});

describe('isNetworkFailure', () => {
  it('reconoce MutationError offline', () => {
    expect(isNetworkFailure(new MutationError('offline'))).toBe(true);
    expect(isNetworkFailure(new MutationError('not_found'))).toBe(false);
  });
});
