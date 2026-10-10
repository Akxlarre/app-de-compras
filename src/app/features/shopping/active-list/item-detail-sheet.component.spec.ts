import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ItemDetailSheetComponent, type ItemDetail } from './item-detail-sheet.component';

describe('ItemDetailSheetComponent (spec 0019 D4, spec 0021)', () => {
  let sheet: ItemDetailSheetComponent;
  let saved: unknown[];
  let opened: string[];

  const create = (over: Partial<ItemDetail> = {}) => {
    const fixture = TestBed.createComponent(ItemDetailSheetComponent);
    fixture.componentRef.setInput('item', {
      id: 'i1',
      productId: 'p1',
      name: 'Papas',
      quantity: 2,
      unit: 'un',
      unitPrice: null,
      notes: null,
      ...over,
    });
    sheet = fixture.componentInstance;
    saved = [];
    opened = [];
    sheet.save.subscribe((v) => saved.push(v));
    sheet.openProduct.subscribe((id) => opened.push(id));
    fixture.detectChanges();
  };

  beforeEach(() => create());

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

  describe('nota (spec 0021 D1)', () => {
    it('se guarda recortada', () => {
      sheet.notesText.set('  sin lactosa  ');
      sheet.submit();
      expect(saved).toEqual([
        { itemId: 'i1', patch: { unit: 'un', quantity: 2, notes: 'sin lactosa' } },
      ]);
    });

    it('vacía borra la que había; sin cambios no se envía', () => {
      create({ notes: 'el grande' });
      expect(sheet.notesText()).toBe('el grande');
      sheet.submit();
      expect(saved).toEqual([{ itemId: 'i1', patch: { unit: 'un', quantity: 2 } }]);

      sheet.notesText.set('   ');
      sheet.submit();
      expect(saved.at(-1)).toEqual({
        itemId: 'i1',
        patch: { unit: 'un', quantity: 2, notes: null },
      });
    });

    it('cuenta los caracteres que quedan, hasta 80', () => {
      sheet.notesText.set('x'.repeat(75));
      expect(sheet.notesLeft()).toBe(5);
    });
  });

  it('"Ver ficha del producto" avisa con el id del producto (D4)', () => {
    sheet.goToProduct();
    expect(opened).toEqual(['p1']);
  });
});
