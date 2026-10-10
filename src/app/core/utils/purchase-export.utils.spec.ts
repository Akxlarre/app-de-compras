import { describe, it, expect } from 'vitest';
import { csvFileName, monthCsv } from './purchase-export.utils';

const BOM = '﻿';
const HEADER = 'Fecha;Compra;Tienda;Producto;Cantidad;Precio unitario;Subtotal;Total de la compra';

const purchase = (over: Record<string, unknown>) =>
  ({
    title: 'Compra',
    completedAt: '2026-10-05T15:00:00',
    store: null,
    total: 0,
    items: [],
    charges: [],
    ...over,
  } as any);

const rows = (csv: string) => csv.slice(BOM.length).trimEnd().split('\r\n');

describe('purchase-export.utils (spec 0026)', () => {
  it('una fila por producto y por cargo; el total solo en la primera fila (D2)', () => {
    const csv = monthCsv([
      purchase({
        title: 'Feria',
        completedAt: '2026-10-08T10:00:00',
        total: 2000,
        items: [{ name: 'Palta', quantity: 1, unitPrice: 2000, subtotal: 2000 }],
      }),
      purchase({
        title: 'Compra del sábado',
        completedAt: '2026-10-03T18:30:00',
        store: 'Lider',
        total: 4590,
        items: [
          { name: 'Leche', quantity: 2, unitPrice: 1200, subtotal: 2400 },
          { name: 'Pan', quantity: 1.5, unitPrice: 1400, subtotal: 2100 },
        ],
        charges: [
          { kind: 'bag', rawText: 'BOLSA', amount: 90 },
          { kind: 'discount', rawText: null, amount: -100 },
        ],
      }),
    ]);

    expect(rows(csv)).toEqual([
      HEADER,
      // La más vieja primero.
      '2026-10-03;Compra del sábado;Lider;Leche;2;1200;2400;4590',
      '2026-10-03;Compra del sábado;Lider;Pan;1,5;1400;2100;',
      '2026-10-03;Compra del sábado;Lider;Bolsa · BOLSA;;;90;',
      '2026-10-03;Compra del sábado;Lider;Descuento;;;-100;',
      '2026-10-08;Feria;;Palta;1;2000;2000;2000',
    ]);
  });

  it('una compra sin productos tiene su fila con el total; sin precio queda vacío', () => {
    const csv = monthCsv([
      purchase({ total: 15000 }),
      purchase({
        completedAt: '2026-10-06T09:00:00',
        items: [{ name: 'Sal', quantity: 1, unitPrice: null, subtotal: 0 }],
      }),
    ]);
    expect(rows(csv).slice(1)).toEqual([
      '2026-10-05;Compra;;;;;;15000',
      '2026-10-06;Compra;;Sal;1;;0;0',
    ]);
  });

  it('formato para planillas en español: BOM, ";" y comillas donde hace falta (D3)', () => {
    const csv = monthCsv([
      purchase({
        title: 'Once; "especial"',
        total: 1000,
        items: [{ name: 'Té\nverde', quantity: 1, unitPrice: 1000, subtotal: 1000 }],
      }),
    ]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).toContain('2026-10-05;"Once; ""especial""";;"Té\nverde";1;1000;1000;1000');
  });

  it('la fecha es la del día local, no la UTC', () => {
    const local = new Date(2026, 9, 31, 23, 30).toISOString();
    expect(rows(monthCsv([purchase({ completedAt: local })]))[1].startsWith('2026-10-31;')).toBe(
      true
    );
  });

  it('el archivo se llama compras-AAAA-MM.csv', () => {
    expect(csvFileName(new Date(2026, 0, 1))).toBe('compras-2026-01.csv');
    expect(csvFileName(new Date(2026, 9, 1))).toBe('compras-2026-10.csv');
  });
});
