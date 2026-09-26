import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HistoryPage } from './history.page';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';

describe('HistoryPage', () => {
  let page: HistoryPage;
  let facade: any;
  let nav: { navigateBack: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    facade = {
      data: signal([
        { id: 'a', name: 'Semana', completedAt: '2026-09-20T15:00:00Z', total: 2000, items: [] },
      ]),
      initialize: vi.fn(),
      dispose: vi.fn(),
    };
    nav = { navigateBack: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        HistoryPage,
        { provide: PurchaseHistoryFacade, useValue: facade },
        { provide: NavController, useValue: nav },
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

  it('volver lleva a Mi Lista', () => {
    page.back();
    expect(nav.navigateBack).toHaveBeenCalledWith('/app/active');
  });
});
