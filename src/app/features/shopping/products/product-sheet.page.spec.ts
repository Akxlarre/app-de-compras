import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ActionSheetController, AlertController, NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductSheetPage } from './product-sheet.page';
import { ProductSheetFacade } from '@core/facades/product-sheet.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { ToastService } from '@core/services/ui/toast.service';

describe('ProductSheetPage (spec 0017)', () => {
  let page: ProductSheetPage;
  let facade: any;
  let data: ReturnType<typeof signal<any>>;
  let lists: any;
  let nav: Record<string, ReturnType<typeof vi.fn>>;
  let alerts: { create: ReturnType<typeof vi.fn> };
  let sheets: { create: ReturnType<typeof vi.fn> };
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  const sheet = (over: object = {}, purchases: unknown[] = [{ listId: 'l1' }]) => ({
    product: { id: 'p1', name: 'Arroz', last_price: 1290, archived_at: null, ...over },
    purchases,
    aliases: [],
    frequency: null,
  });
  const alertOpts = () => alerts.create.mock.calls.at(-1)![0];
  const press = (text: string, value?: unknown) =>
    (alertOpts().buttons as any[]).find((b) => b.text === text).handler(value);
  const sheetButtons = () => sheets.create.mock.calls.at(-1)![0].buttons as any[];

  beforeEach(() => {
    data = signal<any>(sheet());
    facade = {
      data,
      isLoading: signal(false),
      error: signal(null),
      hasPurchases: computed(() => (data()?.purchases.length ?? 0) > 0),
      open: vi.fn().mockResolvedValue(undefined),
      retryLoad: vi.fn(),
      rename: vi.fn().mockResolvedValue({ ok: true }),
      remove: vi.fn().mockResolvedValue(true),
      archive: vi.fn().mockResolvedValue(true),
      unarchive: vi.fn().mockResolvedValue(true),
      mergeInto: vi.fn().mockResolvedValue(true),
      mergeCandidates: vi.fn().mockResolvedValue([{ id: 'p2', name: 'Arroz G1' }]),
      removeAlias: vi.fn().mockResolvedValue(true),
      setEstimatedPrice: vi.fn().mockResolvedValue(true),
    };
    lists = {
      data: signal<any>({ id: 'l9', list_items: [] }),
      initialize: vi.fn().mockResolvedValue(undefined),
      addProducts: vi.fn().mockResolvedValue(true),
    };
    nav = { navigateBack: vi.fn(), navigateRoot: vi.fn() };
    alerts = {
      create: vi
        .fn()
        .mockResolvedValue({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }),
    };
    sheets = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };
    toast = { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ProductSheetPage,
        { provide: ProductSheetFacade, useValue: facade },
        { provide: ShoppingListFacade, useValue: lists },
        { provide: NavController, useValue: nav },
        { provide: AlertController, useValue: alerts },
        { provide: ActionSheetController, useValue: sheets },
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } },
        },
      ],
    });
    page = TestBed.inject(ProductSheetPage);
  });

  it('abre el producto de la URL y "atrás" vuelve al Catálogo (AC1)', () => {
    page.ngOnInit();
    expect(facade.open).toHaveBeenCalledWith('p1');
    page.back();
    expect(nav.navigateBack).toHaveBeenCalledWith('/app/products');
  });

  it('la fecha de una compra se lee como en Compras', () => {
    expect(page.dateLabel('2026-10-05T15:00:00Z')).toMatch(/^5 oct\.? 2026$/);
  });

  it('la fecha de la boleta (sin hora) es "hace n días" en hora local (spec 0020 D1)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 0, 30));
    expect(page.ago('2026-10-05')).toBe('hace 5 días');
    expect(page.ago('2026-10-10')).toBe('hoy');
    vi.useRealTimers();
  });

  it('el precio dice de dónde sale (D5)', () => {
    expect(page.priceLabel()).toBe('Último pagado $1.290');
    data.set(sheet({}, []));
    expect(page.priceLabel()).toBe('$1.290 estimado');
    data.set(sheet({ last_price: null }, []));
    expect(page.priceLabel()).toBe('Sin precio');
  });

  describe('agregar a la lista (AC3)', () => {
    it('lo agrega a la lista activa', async () => {
      await page.addToList();
      expect(lists.addProducts).toHaveBeenCalledWith(['p1']);
      expect(toast['success']).toHaveBeenCalled();
    });

    it('si ya está, avisa y no lo suma', async () => {
      lists.data.set({ id: 'l9', list_items: [{ product_id: 'p1' }] });
      await page.addToList();
      expect(lists.addProducts).not.toHaveBeenCalled();
      expect(toast['info']).toHaveBeenCalledWith('Ya está en tu lista');
    });

    it('sin lista activa avisa', async () => {
      lists.data.set(null);
      await page.addToList();
      expect(toast['warning']).toHaveBeenCalled();
    });
  });

  describe('menú ⋯ (D2, D3)', () => {
    it('con compras ofrece archivar, no borrar', async () => {
      await page.more();
      expect(sheetButtons().map((b) => b.text)).toEqual([
        'Renombrar',
        'Juntar con otro producto',
        'Archivar',
        'Cancelar',
      ]);
    });

    it('sin compras ofrece borrar', async () => {
      data.set(sheet({}, []));
      await page.more();
      expect(sheetButtons().map((b) => b.text)).toContain('Borrar');
    });

    it('archivado ofrece reactivar', async () => {
      data.set(sheet({ archived_at: '2026-10-10' }));
      await page.more();
      expect(sheetButtons().map((b) => b.text)).toContain('Reactivar');
    });
  });

  it('borrar confirma y vuelve al Catálogo (AC6)', async () => {
    data.set(sheet({}, []));
    const done = page.remove();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    press('Borrar');
    await done;
    expect(facade.remove).toHaveBeenCalled();
    expect(nav.navigateBack).toHaveBeenCalledWith('/app/products');
  });

  it('renombrar a un nombre que ya existe ofrece juntarlos (AC5)', async () => {
    facade.rename.mockResolvedValue({ ok: false, duplicateOf: 'p2' });
    const done = page.rename();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalledTimes(1));
    press('Guardar', { name: 'Arroz G1' });
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalledTimes(2));
    expect(alertOpts().header).toBe('Ya existe «Arroz G1»');
    press('Juntar');
    await done;
    expect(facade.mergeInto).toHaveBeenCalledWith('p2', 'Arroz G1');
    expect(nav.navigateRoot).toHaveBeenCalledWith('/app/products/p2');
  });

  it('juntar: busca, confirma y abre el que queda (AC8)', async () => {
    page.startMerge();
    expect(page.merging()).toBe(true);
    await page.searchMerge('arroz');
    expect(page.mergeResults()).toEqual([{ id: 'p2', name: 'Arroz G1' }]);

    const done = page.pickMerge({ id: 'p2', name: 'Arroz G1' } as any);
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    expect(alertOpts().message).toMatch(/no se puede deshacer/i);
    press('Juntar');
    await done;
    expect(facade.mergeInto).toHaveBeenCalledWith('p2', 'Arroz G1');
    expect(nav.navigateRoot).toHaveBeenCalledWith('/app/products/p2');
  });

  it('quitar un texto de boleta pide confirmación (AC4)', async () => {
    const done = page.removeAlias('ARROZ G1 1KG');
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    press('Quitar');
    await done;
    expect(facade.removeAlias).toHaveBeenCalledWith('ARROZ G1 1KG');
  });

  it('el precio estimado se edita solo sin compras (AC11)', async () => {
    page.editPrice();
    expect(page.editingPrice()).toBe(false);

    data.set(sheet({}, []));
    page.editPrice();
    expect(page.editingPrice()).toBe(true);
    await page.onPriceBlur({ target: { value: '1.500' } } as unknown as Event);
    expect(facade.setEstimatedPrice).toHaveBeenCalledWith(1500);
    expect(page.editingPrice()).toBe(false);
  });
});
