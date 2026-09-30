import { describe, it, expect } from 'vitest';
import { disambiguateTitles, isAutoListName, purchaseTitle } from './purchase-name.utils';

// Fechas en hora local (los títulos usan la hora del teléfono).
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();
const NOW = new Date(2026, 8, 30, 18, 0);

describe('isAutoListName', () => {
  it.each(['Lista de compras', 'Compra de la Semana', 'Compra Inteligente', 'Compra sin lista'])(
    '"%s" es automático',
    (name) => expect(isAutoListName(name)).toBe(true)
  );

  it('un nombre propio no lo es', () => {
    expect(isAutoListName('Asado del sábado')).toBe(false);
  });
});

describe('purchaseTitle', () => {
  it('un nombre automático se muestra como la fecha de la compra', () => {
    expect(purchaseTitle('Compra de la Semana', at(2026, 9, 30), NOW)).toBe(
      'Compra del mié 30 sep'
    );
  });

  it('de otro año, agrega el año', () => {
    expect(purchaseTitle('Lista de compras', at(2025, 12, 1), NOW)).toBe(
      'Compra del lun 1 dic 2025'
    );
  });

  it('la compra registrada desde la boleta, sin lista', () => {
    expect(purchaseTitle('Compra sin lista', at(2026, 9, 29), NOW)).toBe(
      'Compra sin lista del mar 29 sep'
    );
  });

  it('un nombre propio se muestra tal cual', () => {
    expect(purchaseTitle('Asado', at(2026, 9, 30), NOW)).toBe('Asado');
  });
});

describe('disambiguateTitles', () => {
  it('dos compras automáticas del mismo día llevan la hora', () => {
    const result = disambiguateTitles(
      [
        { name: 'Lista de compras', completedAt: at(2026, 9, 30, 10, 5) },
        { name: 'Compra de la Semana', completedAt: at(2026, 9, 30, 19, 40) },
        { name: 'Asado', completedAt: at(2026, 9, 30, 20, 0) },
        { name: 'Lista de compras', completedAt: at(2026, 9, 28) },
      ],
      NOW
    );
    expect(result).toEqual([
      'Compra del mié 30 sep · 10:05',
      'Compra del mié 30 sep · 19:40',
      'Asado',
      'Compra del lun 28 sep',
    ]);
  });
});
