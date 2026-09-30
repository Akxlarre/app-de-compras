import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HistoryPage } from './history.page';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';

describe('HistoryPage', () => {
  let page: HistoryPage;
  let facade: any;
  let nav: { navigateBack: ReturnType<typeof vi.fn>; navigateForward: ReturnType<typeof vi.fn> };
  let close: { start: ReturnType<typeof vi.fn>; startNew: ReturnType<typeof vi.fn> };
  let alerts: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    facade = {
      data: signal([
        { id: 'a', name: 'Semana', completedAt: '2026-09-20T15:00:00Z', total: 2000, items: [] },
      ]),
      initialize: vi.fn(),
      dispose: vi.fn(),
      receiptUrl: vi.fn().mockResolvedValue('https://x/firmada'),
      deletePurchase: vi.fn().mockResolvedValue(true),
      renamePurchase: vi.fn().mockResolvedValue(true),
    };
    nav = { navigateBack: vi.fn(), navigateForward: vi.fn() };
    close = { start: vi.fn(), startNew: vi.fn() };
    alerts = {
      create: vi
        .fn()
        .mockResolvedValue({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }),
    };

    TestBed.configureTestingModule({
      providers: [
        HistoryPage,
        { provide: PurchaseHistoryFacade, useValue: facade },
        { provide: NavController, useValue: nav },
        { provide: PurchaseCloseFacade, useValue: close },
        { provide: AlertController, useValue: alerts },
      ],
    });
    page = TestBed.inject(HistoryPage);
  });

  it('agrega la fecha legible a cada compra', () => {
    expect(page.purchases()[0].dateLabel).toMatch(/2026/);
    expect(page.purchases()[0].total).toBe(2000);
  });

  it('sin datos no hay compras', () => {
    facade.data.set(null);
    expect(page.purchases()).toEqual([]);
  });

  it('toggle abre y cierra el detalle de una compra', () => {
    page.toggle('a');
    expect(page.openId()).toBe('a');
    page.toggle('a');
    expect(page.openId()).toBeNull();
  });

  describe('renombrar y borrar (spec 0012)', () => {
    const purchase = { id: 'a', name: 'Lista de compras', title: 'Compra del dom 20 sep' } as any;
    const alertOpts = () => alerts.create.mock.calls[0][0];

    it('borrar pide confirmación explicando que se va la boleta y deja de contar en el mes', async () => {
      const done = page.deletePurchase(purchase);
      await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
      expect(alertOpts().header).toBe('¿Borrar esta compra?');
      expect(alertOpts().message).toMatch(/boleta/);
      expect(alertOpts().message).toMatch(/gasto del mes/);
      (alertOpts().buttons as any[]).find((b) => b.text === 'Borrar').handler();
      await done;

      expect(facade.deletePurchase).toHaveBeenCalledWith('a');
      expect(page.openId()).toBeNull();
    });

    it('borrar cancelado no borra', async () => {
      const done = page.deletePurchase(purchase);
      await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
      (alertOpts().buttons as any[]).find((b) => b.text === 'Cancelar').handler();
      await done;

      expect(facade.deletePurchase).not.toHaveBeenCalled();
    });

    it('renombrar ofrece el título actual y guarda el nuevo nombre', async () => {
      const done = page.renamePurchase(purchase);
      await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
      expect(alertOpts().inputs[0].value).toBe('Compra del dom 20 sep');
      (alertOpts().buttons as any[]).find((b) => b.text === 'Guardar').handler({ name: 'Once' });
      await done;

      expect(facade.renamePurchase).toHaveBeenCalledWith('a', 'Once');
    });
  });

  it('volver lleva a Mi Lista', () => {
    page.back();
    expect(nav.navigateBack).toHaveBeenCalledWith('/app/active');
  });

  describe('boleta y gasto real (spec 0009)', () => {
    const source = { id: 'a', status: 'completed', list_items: [] };
    const purchase = (over: object) =>
      ({
        id: 'a',
        totalSource: 'estimated',
        hasReceipt: false,
        receiptImagePath: null,
        source,
        ...over,
      } as any);

    it('"Agregar boleta" solo en compras sin boleta', () => {
      expect(page.canAddReceipt(purchase({}))).toBe(true);
      expect(page.canAddReceipt(purchase({ hasReceipt: true, totalSource: 'receipt' }))).toBe(
        false
      );
    });

    it('"Ingresar total" solo en compras estimadas (sin boleta ni total)', () => {
      expect(page.canEnterTotal(purchase({}))).toBe(true);
      expect(page.canEnterTotal(purchase({ totalSource: 'manual' }))).toBe(false);
      expect(page.canEnterTotal(purchase({ hasReceipt: true, totalSource: 'receipt' }))).toBe(
        false
      );
    });

    it('"Agregar boleta" abre el cierre con boleta sobre la compra cerrada', () => {
      page.addReceipt(purchase({}));
      expect(close.start).toHaveBeenCalledWith(source, false, 'receipt', 'completed');
      expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
    });

    it('"Ingresar total" abre el cierre sin boleta sobre la compra cerrada', () => {
      page.enterTotal(purchase({}));
      expect(close.start).toHaveBeenCalledWith(source, false, 'manual', 'completed');
      expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
    });

    it('"Compra sin lista" abre el escaneo de una compra nueva', () => {
      page.scanUnplanned();
      expect(close.startNew).toHaveBeenCalled();
      expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
    });

    it('"Ver boleta" pide la URL firmada y la muestra; se oculta al tocar de nuevo', async () => {
      await page.toggleReceipt(purchase({ hasReceipt: true, receiptImagePath: 'fam/r1.jpg' }));
      expect(facade.receiptUrl).toHaveBeenCalledWith('fam/r1.jpg');
      expect(page.receiptPhoto()).toEqual({ id: 'a', url: 'https://x/firmada' });

      await page.toggleReceipt(purchase({ hasReceipt: true, receiptImagePath: 'fam/r1.jpg' }));
      expect(page.receiptPhoto()).toBeNull();
    });

    it('si la foto no se puede abrir lo avisa en vez de mostrar una imagen rota', async () => {
      facade.receiptUrl.mockResolvedValue(null);
      await page.toggleReceipt(purchase({ hasReceipt: true, receiptImagePath: 'fam/r1.jpg' }));
      expect(page.receiptPhoto()).toEqual({ id: 'a', url: null });
    });
  });
});
