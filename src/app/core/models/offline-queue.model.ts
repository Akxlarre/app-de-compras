/**
 * Cambio de la lista hecho sin conexión, pendiente de enviar (spec 0011). Solo marcar y
 * cantidades: el marcado guarda el valor final (idempotente) y la cantidad el incremento.
 */
export type QueuedChange =
  | { kind: 'check'; itemId: string; checked: boolean }
  | { kind: 'quantity'; itemId: string; delta: number };
