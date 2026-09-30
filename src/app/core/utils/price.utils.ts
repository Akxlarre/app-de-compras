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

/** Monto CLP con separador de miles para un campo editable ("1.290"); null → "" (spec 0013). */
export function formatAmount(amount: number | null): string {
  if (amount === null) return '';
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Diferencia entre el total pagado y la suma de los precios ingresados (descuentos, bolsas,
 * productos sin precio). null si falta alguno de los dos o si calzan (spec 0013, Q32).
 */
export function totalDifference(total: number | null, sum: number): number | null {
  if (total === null || total <= 0 || sum <= 0 || total === sum) return null;
  return total - sum;
}
