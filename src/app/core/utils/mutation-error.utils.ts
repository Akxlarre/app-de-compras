/**
 * Errores tipados de las mutaciones de la lista (spec 0011).
 * - `not_found`: la fila no existe o RLS no la deja ver (con RLS son indistinguibles).
 * - `list_not_active`: la lista ya se cerró.
 * - `offline`: la petición no llegó al servidor.
 */
export type MutationErrorCode = 'not_found' | 'list_not_active' | 'offline';

export class MutationError extends Error {
  constructor(readonly code: MutationErrorCode) {
    super(code);
    this.name = 'MutationError';
  }
}

const NETWORK_MESSAGE =
  /failed to fetch|load failed|networkerror|network request failed|fetch failed/i;

/** Traduce un error de Supabase (o de `fetch`) a `MutationError`; los demás pasan tal cual. */
export function toMutationError(error: unknown): unknown {
  if (error instanceof MutationError) return error;

  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (message === 'list_not_found' || message === 'item_not_found') {
    return new MutationError('not_found');
  }
  if (message === 'list_not_active') return new MutationError('list_not_active');

  const offlineBrowser = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offlineBrowser || (!code && NETWORK_MESSAGE.test(message ?? ''))) {
    return new MutationError('offline');
  }
  return error;
}

export function isNetworkFailure(error: unknown): boolean {
  return error instanceof MutationError && error.code === 'offline';
}
