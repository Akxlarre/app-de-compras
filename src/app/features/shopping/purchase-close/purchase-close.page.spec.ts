import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
      kind: signal<any>('active'),
      decisions,
      start: vi.fn(),
      startNew: vi.fn(),
      reset: vi.fn(),
      confirmManual: vi.fn().mockResolvedValue(true),
      confirmReceipt: vi.fn().mockResolvedValue(true),
      updateDecision: vi.fn(),
      canConfirm: computed(() => true),
      manualTotal: signal<number | null>(null),
      manualSum: signal(0),
      setManualPrice: vi.fn(),
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

  it('el contenido reserva el espacio de la barra: en Boletas está visible (fix-048, B1)', () => {
    const html = readFileSync(
      join(process.cwd(), 'src/app/features/shopping/purchase-close/purchase-close.page.html'),
      'utf8'
    );
    const main = html.match(/<main[^>]*class="([^"]*)"/)?.[1].split(/\s+/) ?? [];

    expect(main).toContain('pb-chrome');
  });

  describe('montos del cierre sin boleta (spec 0013, Q32)', () => {
    const typed = (value: string) => ({ target: { value } } as unknown as Event);

    it('el total se guarda como número y se reescribe con separador de miles', () => {
      const ev = typed('$12990');
      page.onTotalInput(ev);

      expect(close.manualTotal()).toBe(12990);
      expect((ev.target as HTMLInputElement).value).toBe('12.990');
    });

    it('el precio de un producto también', () => {
      const ev = typed('1290');
      page.onPriceInput('i1', ev);

      expect(close.setManualPrice).toHaveBeenCalledWith('i1', 1290);
      expect((ev.target as HTMLInputElement).value).toBe('1.290');
    });

    it('muestra la diferencia entre el total y la suma solo cuando no calzan', () => {
      close.manualSum.set(12500);
      expect(page.difference()).toBeNull();
      close.manualTotal.set(15000);
      expect(page.difference()).toBe(2500);
      close.manualTotal.set(12500);
      expect(page.difference()).toBeNull();
    });
  });

  it('desde la pestaña Boletas (sin cierre en curso) empieza con la compra activa', async () => {
    const active = { id: 'l1', list_items: [{ id: 'i1', is_checked: true }] };
    lists.initialize.mockImplementation(async () => lists.data.set(active));

    await page.ngOnInit();

    expect(close.start).toHaveBeenCalledWith(active, true, 'receipt');
  });

  it('desde la pestaña Boletas sin nada marcado (o sin lista) es una compra sin lista', async () => {
    lists.initialize.mockImplementation(async () =>
      lists.data.set({ id: 'l1', list_items: [{ id: 'i1', is_checked: false }] })
    );
    await page.ngOnInit();
    expect(close.startNew).toHaveBeenCalled();
    expect(close.start).not.toHaveBeenCalled();
  });

  it('"Es otra compra" cambia a una compra sin lista', () => {
    page.otherPurchase();
    expect(close.startNew).toHaveBeenCalled();
  });

  it('al agregar la boleta a una compra del Historial vuelve al Historial (sin recargar la lista)', async () => {
    close.mode.set('receipt');
    close.kind.set('completed');
    await page.confirm();

    expect(lists.reloadAfterClose).not.toHaveBeenCalled();
    expect(nav.navigateRoot).toHaveBeenCalledWith('/app/history');
  });

  it('una compra sin lista también termina en el Historial', async () => {
    close.mode.set('receipt');
    close.kind.set('new');
    await page.confirm();
    expect(nav.navigateRoot).toHaveBeenCalledWith('/app/history');
  });

  it('cancelar desde el Historial vuelve al Historial', () => {
    close.kind.set('completed');
    page.cancel();
    expect(nav.navigateRoot).toHaveBeenCalledWith('/app/history');
  });

  it('el título dice qué se está haciendo', () => {
    close.mode.set('manual');
    close.kind.set('completed');
    expect(page.title()).toBe('Ingresar total');
    close.mode.set('receipt');
    expect(page.title()).toBe('Agregar boleta');
    close.kind.set('new');
    expect(page.title()).toBe('Compra sin lista');
    close.kind.set('active');
    expect(page.title()).toBe('Escanear boleta');
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
