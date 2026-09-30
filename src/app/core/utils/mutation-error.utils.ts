/**
 * Errores tipados de las mutaciones de la lista (spec 0011).
 * - `not_found`: la fila no existe o RLS no la deja ver (con RLS son indistinguibles).
 * - `list_not_active`: la lista ya se cerró.
 * - `offline`: la petición no llegó al servidor.
 * Spec 0012:
 * - `nothing_checked`: se intentó finalizar sin nada marcado.
 * - `list_not_completed`: la compra no está cerrada (borrar/renombrar).
 * - `invalid_name`: nombre vacío o de más de 60 caracteres.
 */
export type MutationErrorCode =
  | 'not_found'
  | 'list_not_active'
  | 'offline'
  | 'nothing_checked'
  | 'list_not_completed'
  | 'invalid_name';

/** Mensajes de las RPCs que se traducen tal cual a su código. */
const RPC_CODES: Partial<Record<string, MutationErrorCode>> = {
  list_not_found: 'not_found',
  item_not_found: 'not_found',
  list_not_active: 'list_not_active',
  nothing_checked: 'nothing_checked',
  list_not_completed: 'list_not_completed',
  invalid_name: 'invalid_name',
};

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
  const rpcCode = message ? RPC_CODES[message] : undefined;
  if (rpcCode) return new MutationError(rpcCode);

  const offlineBrowser = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offlineBrowser || (!code && NETWORK_MESSAGE.test(message ?? ''))) {
    return new MutationError('offline');
  }
  return error;
}

export function isNetworkFailure(error: unknown): boolean {
  return error instanceof MutationError && error.code === 'offline';
}
