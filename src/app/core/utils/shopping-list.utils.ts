/**
 * Orden de Mi Lista (spec 0013, Q19): pendientes arriba, marcados abajo, y dentro de cada grupo
 * el orden en que se agregaron. Así al desmarcar un producto vuelve a su lugar, sin depender del
 * orden en que el servidor devuelva las filas.
 */
/**
 * Cómo va un monto contra el presupuesto (spec 0025 D2): `percent` para la barra (0–100) y `over`,
 * cuánto se pasa (null si no se pasa).
 */
export function budgetProgress(
  amount: number,
  budget: number
): { percent: number; over: number | null } {
  const percent = Math.min(100, Math.round((amount / budget) * 100));
  return { percent, over: amount > budget ? Math.round(amount - budget) : null };
}

export function sortListItems<T extends { id: string; created_at: string; is_checked: boolean }>(
  items: readonly T[]
): T[] {
  return [...items].sort(
    (a, b) =>
      Number(a.is_checked) - Number(b.is_checked) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id)
  );
}
