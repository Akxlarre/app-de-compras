import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NavController } from '@ionic/angular';
import { PurchaseClosePage } from './purchase-close.page';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import type { LineDecision } from '@core/models/receipt.model';

const decision = (over: Partial<LineDecision>): LineDecision => ({
  index: 0,
  rawText: 'X',
  name: 'X',
  quantity: 1,
  unitPrice: 1000,
  target: { kind: 'new' },
  status: 'extra',
  candidates: [],
  saveToCatalog: false,
  doubt: null,
  ocr: { quantity: 1, unitPrice: 1000, target: 'new' },
  ...over,
});

describe('PurchaseClosePage', () => {
  let page: PurchaseClosePage;
  let close: any;
  let lists: any;
  let nav: { navigateRoot: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const decisions = signal<LineDecision[]>([]);
    close = {
      list: signal<any>(null),
      mode: signal<any>(null),
      decisions,
      start: vi.fn(),
      reset: vi.fn(),
      confirmManual: vi.fn().mockResolvedValue(true),
      confirmReceipt: vi.fn().mockResolvedValue(true),
      updateDecision: vi.fn(),
      canConfirm: computed(() => true),
    };
    lists = {
      data: signal<any>(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      reloadAfterClose: vi.fn().mockResolvedValue(undefined),
    };
    nav = { navigateRoot: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        PurchaseClosePage,
        { provide: PurchaseCloseFacade, useValue: close },
        { provide: ShoppingListFacade, useValue: lists },
        { provide: NavController, useValue: nav },
      ],
    });
    page = TestBed.inject(PurchaseClosePage);
  });

  it('desde la pestaña Boletas (sin cierre en curso) empieza con la compra activa', async () => {
    const active = { id: 'l1', list_items: [] };
    lists.initialize.mockImplementation(async () => lists.data.set(active));

    await page.ngOnInit();

    expect(close.start).toHaveBeenCalledWith(active, true, 'receipt');
  });

  it('si ya viene un cierre desde Finalizar no lo reinicia', async () => {
    close.list.set({ id: 'l1' });
    await page.ngOnInit();
    expect(close.start).not.toHaveBeenCalled();
  });

  it('agrupa las líneas: coinciden, ¿es este? y no estaban en la lista', () => {
    close.decisions.set([
      decision({
        index: 0,
        status: 'matched',
        target: { kind: 'item', itemId: 'i', productId: 'p', name: 'Leche' },
      }),
      decision({
        index: 1,
        status: 'extra',
        target: { kind: 'product', productId: 'p2', name: 'Café' },
      }),
      decision({ index: 2, status: 'candidate', target: null }),
      decision({ index: 3, status: 'candidate', target: { kind: 'new' } }),
      decision({ index: 4, status: 'extra', target: { kind: 'new' } }),
    ]);

    const g = page.groups();
    expect(g.matched.map((d) => d.index)).toEqual([0, 1]);
    expect(g.candidates.map((d) => d.index)).toEqual([2, 3]);
    expect(g.extras.map((d) => d.index)).toEqual([4]);
  });

  it('"No es este": una coincidencia pasa a "no estaba en la lista"', () => {
    page.notThis(3);
    expect(close.updateDecision).toHaveBeenCalledWith(3, {
      target: { kind: 'new' },
      status: 'extra',
    });
  });

  it('lee montos en pesos: sin puntos ni símbolo; vacío es null', () => {
    expect(page.toAmount('$12.990')).toBe(12990);
    expect(page.toAmount(' 850 ')).toBe(850);
    expect(page.toAmount('')).toBeNull();
    expect(page.toAmount('abc')).toBeNull();
  });

  it('al confirmar recarga la lista y vuelve a Mi Lista', async () => {
    close.mode.set('manual');
    await page.confirm();

    expect(close.confirmManual).toHaveBeenCalled();
    expect(lists.reloadAfterClose).toHaveBeenCalled();
    expect(close.reset).toHaveBeenCalled();
    expect(nav.navigateRoot).toHaveBeenCalledWith('/app/active');
  });

  it('si falla se queda en la pantalla (el cierre sigue editable)', async () => {
    close.mode.set('receipt');
    close.confirmReceipt.mockResolvedValue(false);

    await page.confirm();

    expect(lists.reloadAfterClose).not.toHaveBeenCalled();
    expect(nav.navigateRoot).not.toHaveBeenCalled();
  });
});
