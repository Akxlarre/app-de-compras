import type { ItemUnit } from '../models/shopping-list.model';

const MAX_QUANTITY = 9999;

/** kg y L se compran a granel: "1,5 kg" (spec 0019 D4). */
export function isDecimalUnit(unit: ItemUnit | undefined): boolean {
  return unit === 'kg' || unit === 'L';
}

/** Unidades y paquetes se cuentan con − y +; el resto se escribe en el detalle del ítem. */
export function hasStepper(unit: ItemUnit | undefined): boolean {
  return !unit || unit === 'un' || unit === 'paquete';
}

/** Nombre de la unidad en los botones del detalle. */
export function unitLabel(unit: ItemUnit): string {
  return unit === 'un' ? 'Unidad' : unit === 'paquete' ? 'Paquete' : unit;
}

/** "1,5 kg", "500 g", "2 paq."; en unidades, solo el número. */
export function formatQuantity(quantity: number, unit: ItemUnit | undefined): string {
  const n = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(quantity);
  if (!unit || unit === 'un') return n;
  return `${n} ${unit === 'paquete' ? 'paq.' : unit}`;
}

/**
 * Cantidad escrita a mano: acepta coma o punto, debe ser mayor que 0 y entera salvo en kg y L
 * (hasta 2 decimales). null si no sirve.
 */
export function parseQuantity(text: string, unit: ItemUnit): number | null {
  const raw = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const value = Math.round(Number(raw) * 100) / 100;
  if (!(value > 0) || value > MAX_QUANTITY) return null;
  if (!isDecimalUnit(unit) && !Number.isInteger(value)) return null;
  return value;
}
