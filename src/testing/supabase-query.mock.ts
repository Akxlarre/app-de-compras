/**
 * Mocks de Supabase para specs de Repositories (solo tests; excluido de tsconfig.app).
 */
import { vi } from 'vitest';

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'ilike',
  'like',
  'order',
  'limit',
  'single',
  'maybeSingle',
] as const;

export type QueryMock = {
  [K in (typeof CHAIN_METHODS)[number]]: ReturnType<typeof vi.fn>;
} & PromiseLike<{ data: unknown; error: unknown }>;

/** Query builder encadenable: cada método devuelve el builder y `await` resuelve `{ data, error }`. */
export function queryMock(result: { data?: unknown; error?: unknown } = {}): QueryMock {
  const builder: any = {};
  for (const m of CHAIN_METHODS) builder[m] = vi.fn(() => builder);
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
      resolve,
      reject
    );
  return builder;
}

/** `SupabaseService` falso con un `client` cuyas piezas se configuran por test. */
export function supabaseServiceMock() {
  const channel: any = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    storage: { from: vi.fn() },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  return { service: { client }, client, channel };
}
