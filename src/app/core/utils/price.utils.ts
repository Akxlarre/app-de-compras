/**
 * Precio en CLP escrito por el usuario → entero ≥ 0, o `null` si no es un precio
 * (vacío, texto, negativo). `Number('')` es 0, así que un campo vaciado no debe convertirse así.
 */
export function parsePrice(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;

  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value);
}
