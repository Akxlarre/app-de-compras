import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PurchasesPage, purchaseRow } from './purchases.page';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import type { PurchaseSummary } from '@core/models/purchase-history.model';

const summary = (over: Partial<PurchaseSummary>) =>
  ({
    id: 'a',
    name: 'Lista de compras',
    title: 'Compra del dom 5 oct',
    completedAt: new Date(2026, 9, 5, 12).toISOString(),
    itemCount: 3,
    total: 58_900,
    totalSource: 'receipt',
    store: null,
    ...over,
  } as PurchaseSummary);

describe('purchaseRow (spec 0016 AC6)', () => {
  it('con tienda, la tienda arriba y la fecha abajo', () => {
    const row = purchaseRow(summary({ store: 'Aroca · Pedregal' }));
    expect(row.primary).toBe('Aroca · Pedregal');
    expect(row.secondary).toMatch(/5 oct.* · 3 productos$/);
    expect(row.source).toBe('Boleta');
  });

  it('sin tienda y con nombre automático, la fecha no se repite', () => {
    const row = purchaseRow(summary({}));
    expect(row.primary).toBe('Compra del dom 5 oct');
    expect(row.secondary).toBe('3 productos');
  });

  it('con tienda y nombre propio, también el nombre', () => {
    const row = purchaseRow(summary({ store: 'Líder', name: 'Asado', itemCount: 1 }));
    expect(row.secondary).toMatch(/· Asado · 1 producto$/);
  });

  it('una compra sin precios dice "Sin precios", no "$0 Estimado" (R3)', () => {
    const row = purchaseRow(summary({ total: 0, totalSource: 'estimated' }));
    expect(row).toMatchObject({ source: 'Sin precios', noPrices: true });
    expect(purchaseRow(summary({ total: 900, totalSource: 'estimated' })).source).toBe('Estimado');
    expect(purchaseRow(summary({ totalSource: 'manual' })).source).toBe('Total ingresado');
  });
});

describe('PurchasesPage', () => {
  let page: PurchasesPage;
  let facade: any;
  let close: any;
  let lists: { initialize: ReturnType<typeof vi.fn>; data: ReturnType<typeof signal<any>> };
  let nav: { navigateForward: ReturnType<typeof vi.fn> };
  const file = new File(['x'], 'b.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    const data = signal<PurchaseSummary[] | null>([summary({})]);
    const month = signal(new Date(2026, 9, 1));
    facade = {
      data,
      month,
      visible: computed(() => data() ?? []),
      chart: signal([
        { month: new Date(2026, 4, 1), total: 0, count: 0 },
        { month: new Date(2026, 5, 1), total: 0, count: 0 },
        { month: new Date(2026, 6, 1), total: 0, count: 0 },
        { month: new Date(2026, 7, 1), total: 1_000, count: 1 },
        { month: new Date(2026, 8, 1), total: 80_000, count: 2 },
        { month: new Date(2026, 9, 1), total: 40_000, count: 1 },
      ]),
      byStore: signal([{ name: 'Sin boleta', total: 2000 }]),
      initialize: vi.fn(),
      dispose: vi.fn(),
    };
    close = { start: vi.fn(), startNew: vi.fn(), scan: vi.fn() };
    lists = { initialize: vi.fn().mockResolvedValue(undefined), data: signal<any>(null) };
    nav = { navigateForward: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        PurchasesPage,
        { provide: PurchaseHistoryFacade, useValue: facade },
        { provide: PurchaseCloseFacade, useValue: close },
        { provide: ShoppingListFacade, useValue: lists },
        { provide: NavController, useValue: nav },
      ],
    });
    page = TestBed.inject(PurchasesPage);
  });

  it('nombra el mes elegido y el anterior (D4)', () => {
    expect(page.monthLabel()).toBe('Octubre');
    expect(page.prevMonthLabel()).toBe('Septiembre');
    facade.month.set(new Date(2026, 0, 1));
    expect(page.prevMonthLabel()).toBe('Diciembre');
  });

  it('vacío solo cuando no hay ninguna compra (R6)', () => {
    expect(page.isEmpty()).toBe(false);
    facade.data.set([]);
    expect(page.isEmpty()).toBe(true);
  });

  it('"Escanear boleta" con algo marcado cierra la lista activa y vuelve a Compras (AC3)', async () => {
    const active = { id: 'l1', list_items: [{ id: 'i1', is_checked: true }] };
    lists.data.set(active);

    await page.scan([file]);

    expect(close.start).toHaveBeenCalledWith(active, true, 'receipt', 'active', 'purchases');
    expect(close.scan).toHaveBeenCalledWith([file]);
    expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
  });

  it('"Escanear boleta" sin nada marcado es una compra sin lista (AC3)', async () => {
    lists.data.set({ id: 'l1', list_items: [{ id: 'i1', is_checked: false }] });

    await page.scan([file]);

    expect(close.startNew).toHaveBeenCalledWith('purchases');
    expect(close.start).not.toHaveBeenCalled();
    expect(close.scan).toHaveBeenCalledWith([file]);
  });

  it('barras de 6 meses: alto relativo al mayor, el mes elegido marcado (spec 0020 D3)', () => {
    const bars = page.bars();
    expect(bars.map((b) => b.label)).toEqual(['May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct']);
    expect(bars.map((b) => [b.height, b.empty])).toEqual([
      [0, true],
      [0, true],
      [0, true],
      [4, false], // un mes chico igual se ve
      [100, false],
      [50, false],
    ]);
    expect(bars.map((b) => b.selected)).toEqual([false, false, false, false, false, true]);
    expect(bars[4].aria).toBe('Septiembre: $80.000');

    facade.month.set(new Date(2026, 8, 1));
    expect(page.bars()[4].selected).toBe(true);
  });

  it('gasto por tienda solo si hay alguna tienda, no solo "Sin boleta" (D4)', () => {
    expect(page.stores()).toEqual([]);
    facade.byStore.set([
      { name: 'Líder', total: 5000 },
      { name: 'Sin boleta', total: 2000 },
    ]);
    expect(page.stores().map((s: { name: string }) => s.name)).toEqual(['Líder', 'Sin boleta']);
  });

  it('abrir una compra va a su detalle', () => {
    page.open('a');
    expect(nav.navigateForward).toHaveBeenCalledWith('/app/purchases/a');
  });
});
