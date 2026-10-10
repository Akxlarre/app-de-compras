import type { OcrLineKind } from '@core/models/receipt.model';
import type { PurchaseSummary } from '@core/models/purchase-history.model';

type ExportedPurchase = Pick<
  PurchaseSummary,
  'title' | 'completedAt' | 'store' | 'total' | 'items' | 'charges'
>;

const HEADER = [
  'Fecha',
  'Compra',
  'Tienda',
  'Producto',
  'Cantidad',
  'Precio unitario',
  'Subtotal',
  'Total de la compra',
];

const CHARGE_LABELS: Record<OcrLineKind, string> = {
  product: 'Otro',
  bag: 'Bolsa',
  deposit: 'Envase',
  discount: 'Descuento',
  other: 'Otro',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** `AAAA-MM-DD` del día local. */
function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Número para una planilla en español: coma decimal, sin separador de miles. */
const num = (n: number | null) => (n == null ? '' : String(n).replace('.', ','));

/** Un campo entre comillas si trae `;`, comillas o saltos de línea. */
function cell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV del mes para el presupuesto familiar (spec 0026): una fila por producto y por cargo de la
 * boleta, la compra más vieja primero. El total pagado va solo en la primera fila de cada compra,
 * así sumar esa columna da el gasto del mes (D2). Formato para Excel/Sheets en español (D3).
 */
export function monthCsv(purchases: ExportedPurchase[]): string {
  const sorted = [...purchases].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const lines = [HEADER];

  for (const p of sorted) {
    const head = [localDate(p.completedAt), p.title, p.store ?? ''];
    const rows = [
      ...p.items.map((i) => [i.name, num(i.quantity), num(i.unitPrice), num(i.subtotal)]),
      ...p.charges.map((c) => [
        [CHARGE_LABELS[c.kind], c.rawText].filter(Boolean).join(' · '),
        '',
        '',
        num(c.amount),
      ]),
    ];
    if (rows.length === 0) rows.push(['', '', '', '']);
    rows.forEach((r, i) => lines.push([...head, ...r, i === 0 ? num(p.total) : '']));
  }

  return '﻿' + lines.map((l) => l.map(cell).join(';')).join('\r\n') + '\r\n';
}

/** `compras-AAAA-MM.csv` del mes de `month`. */
export function csvFileName(month: Date): string {
  return `compras-${month.getFullYear()}-${pad(month.getMonth() + 1)}.csv`;
}
