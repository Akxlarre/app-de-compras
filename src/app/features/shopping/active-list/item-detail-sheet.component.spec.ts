import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ItemDetailSheetComponent } from './item-detail-sheet.component';

describe('ItemDetailSheetComponent (spec 0019 D4)', () => {
  let sheet: ItemDetailSheetComponent;
  let saved: unknown[];

  beforeEach(() => {
    const fixture = TestBed.createComponent(ItemDetailSheetComponent);
    fixture.componentRef.setInput('item', {
      id: 'i1',
      name: 'Papas',
      quantity: 2,
      unit: 'un',
      unitPrice: null,
    });
    sheet = fixture.componentInstance;
    saved = [];
    sheet.save.subscribe((v) => saved.push(v));
    fixture.detectChanges();
  });

  it('parte con la unidad y cantidad del ítem', () => {
    expect(sheet.unit()).toBe('un');
    expect(sheet.quantityText()).toBe('2');
    expect(sheet.decimal()).toBe(false);
  });

  it('en kg acepta decimales con coma y guarda unidad, cantidad y precio', () => {
    sheet.pickUnit('kg');
    sheet.quantityText.set('1,5');
    sheet.priceText.set('$2.990');
    expect(sheet.decimal()).toBe(true);
    expect(sheet.quantity()).toBe(1.5);

    sheet.submit();
    expect(saved).toEqual([
      { itemId: 'i1', patch: { unit: 'kg', quantity: 1.5, unit_price: 2990 } },
    ]);
  });

  it('una cantidad que no sirve no se guarda y lo dice', () => {
    sheet.quantityText.set('1,5'); // en unidades no hay decimales
    expect(sheet.quantity()).toBeNull();
    sheet.submit();
    expect(saved).toEqual([]);
    expect(sheet.showError()).toBe(true);
  });

  it('el precio vacío no se envía (queda el que había)', () => {
    sheet.submit();
    expect(saved).toEqual([{ itemId: 'i1', patch: { unit: 'un', quantity: 2 } }]);
  });
});
