import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ActionSheetController, AlertController, NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PurchaseDetailPage } from './purchase-detail.page';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';

describe('PurchaseDetailPage (spec 0016 AC7)', () => {
  let page: PurchaseDetailPage;
  let facade: any;
  let current: ReturnType<typeof signal<any>>;
  let nav: { navigateBack: ReturnType<typeof vi.fn>; navigateForward: ReturnType<typeof vi.fn> };
  let close: { start: ReturnType<typeof vi.fn> };
  let alerts: { create: ReturnType<typeof vi.fn> };
  let sheets: { create: ReturnType<typeof vi.fn> };
  const source = { id: 'a', status: 'completed', list_items: [] };
  const purchase = (over: object = {}) => ({
    id: 'a',
    name: 'Lista de compras',
    title: 'Compra del dom 20 sep',
    completedAt: '2026-09-20T15:00:00Z',
    totalSource: 'estimated',
    total: 2000,
    hasReceipt: false,
    receiptImagePaths: [],
    items: [],
    charges: [],
    source,
    ...over,
  });

  beforeEach(() => {
    current = signal<any>(purchase());
    facade = {
      byId: vi.fn(() => current()),
      initialize: vi.fn().mockResolvedValue(undefined),
      isLoading: signal(false),
      hasData: signal(true),
      receiptUrl: vi.fn().mockResolvedValue('https://x/firmada'),
      deletePurchase: vi.fn().mockResolvedValue(true),
      renamePurchase: vi.fn().mockResolvedValue(true),
    };
    nav = { navigateBack: vi.fn(), navigateForward: vi.fn() };
    close = { start: vi.fn() };
    alerts = {
      create: vi
        .fn()
        .mockResolvedValue({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }),
    };
    sheets = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };

    TestBed.configureTestingModule({
      providers: [
        PurchaseDetailPage,
        { provide: PurchaseHistoryFacade, useValue: facade },
        { provide: PurchaseCloseFacade, useValue: close },
        { provide: NavController, useValue: nav },
        { provide: AlertController, useValue: alerts },
        { provide: ActionSheetController, useValue: sheets },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a' }) } },
        },
      ],
    });
    page = TestBed.inject(PurchaseDetailPage);
  });

  it('busca la compra de la URL', () => {
    expect(page.purchase()?.id).toBe('a');
    expect(facade.byId).toHaveBeenCalledWith('a');
  });

  it('pide las URLs firmadas de todas sus boletas', async () => {
    current.set(purchase({ hasReceipt: true, receiptImagePaths: ['f/1.jpg', 'f/2.jpg'] }));
    facade.receiptUrl.mockResolvedValueOnce('u1').mockResolvedValueOnce(null);

    await page.ngOnInit();

    expect(page.photos()).toEqual(['u1', null]);
  });

  it('"Agregar boleta" e "Ingresar total" solo en compras sin boleta; estimadas para el total', () => {
    expect(page.canAddReceipt()).toBe(true);
    expect(page.canEnterTotal()).toBe(true);
    current.set(purchase({ totalSource: 'manual' }));
    expect(page.canEnterTotal()).toBe(false);
    current.set(purchase({ hasReceipt: true, totalSource: 'receipt' }));
    expect(page.canAddReceipt()).toBe(false);
  });

  it('"Agregar boleta" abre el cierre de la compra cerrada y vuelve a Compras', () => {
    page.addReceipt();
    expect(close.start).toHaveBeenCalledWith(source, false, 'receipt', 'completed', 'purchases');
    expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
  });

  it('"Ingresar total" abre el cierre sin boleta', () => {
    page.enterTotal();
    expect(close.start).toHaveBeenCalledWith(source, false, 'manual', 'completed', 'purchases');
  });

  it('el menú ⋯ ofrece Renombrar y Borrar (R5)', async () => {
    await page.more();
    const texts = sheets.create.mock.calls[0][0].buttons.map((b: { text: string }) => b.text);
    expect(texts).toEqual(['Renombrar', 'Borrar compra', 'Cancelar']);
  });

  describe('renombrar y borrar (spec 0012)', () => {
    const alertOpts = () => alerts.create.mock.calls[0][0];

    it('borrar pide confirmación, borra y vuelve a Compras', async () => {
      const done = page.remove(page.purchase()!);
      await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
      expect(alertOpts().message).toMatch(/gasto del mes/);
      expect(alertOpts().inputs).toEqual([]);
      (alertOpts().buttons as any[]).find((b) => b.text === 'Borrar').handler();
      await done;

      expect(facade.deletePurchase).toHaveBeenCalledWith('a');
      expect(nav.navigateBack).toHaveBeenCalledWith('/app/purchases');
    });

    it('borrar cancelado no borra', async () => {
      const done = page.remove(page.purchase()!);
      await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
      (alertOpts().buttons as any[]).find((b) => b.text === 'Cancelar').handler();
      await done;
      expect(facade.deletePurchase).not.toHaveBeenCalled();
    });

    it('renombrar ofrece el título actual y guarda el nuevo nombre', async () => {
      const done = page.rename(page.purchase()!);
      await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
      expect(alertOpts().inputs[0].value).toBe('Compra del dom 20 sep');
      (alertOpts().buttons as any[]).find((b) => b.text === 'Guardar').handler({ name: 'Once' });
      await done;
      expect(facade.renamePurchase).toHaveBeenCalledWith('a', 'Once');
    });
  });
});
