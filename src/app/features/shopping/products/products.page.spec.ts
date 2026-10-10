import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { ActionSheetController, NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductsPage } from './products.page';
import { ProductsFacade } from '@core/facades/products.facade';
import { ToastService } from '@core/services/ui/toast.service';

describe('ProductsPage (spec 0017, fix-050)', () => {
  let page: ProductsPage;
  let facade: any;
  let nav: { navigateForward: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn> };
  let sheets: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const products = signal([
      { id: 'p1', name: 'Leche', last_price: 1290, daysSincePurchase: 3 },
      { id: 'p2', name: 'Sal', last_price: null, daysSincePurchase: null },
    ]);
    const query = signal('');
    facade = {
      products,
      query,
      archived: signal(false),
      filtered: computed(() =>
        products().filter((p) => p.name.toLowerCase().includes(query().toLowerCase()))
      ),
      isLoading: signal(false),
      error: signal(null),
      loadProducts: vi.fn(),
      showArchived: vi.fn(),
      create: vi.fn().mockResolvedValue('p9'),
      order: signal('name'),
      aisle: signal(null),
      noPrice: signal(false),
      hasFilters: signal(false),
      clearFilters: vi.fn(),
    };
    sheets = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };
    nav = { navigateForward: vi.fn() };
    toast = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ProductsPage,
        { provide: ProductsFacade, useValue: facade },
        { provide: NavController, useValue: nav },
        { provide: ToastService, useValue: toast },
        { provide: ActionSheetController, useValue: sheets },
      ],
    });
    page = TestBed.inject(ProductsPage);
  });

  describe('orden y filtros (spec 0022)', () => {
    const buttons = () => sheets.create.mock.calls.at(-1)![0].buttons as any[];

    it('el orden se elige entre A–Z, Más comprados y Hace más tiempo (D1)', async () => {
      expect(page.orderLabel()).toBe('A–Z');
      await page.pickOrder();
      expect(buttons().map((b) => b.text)).toEqual([
        'A–Z (actual)',
        'Más comprados',
        'Hace más tiempo',
        'Cancelar',
      ]);
      buttons()[1].handler();
      expect(facade.order()).toBe('most');
      expect(page.orderLabel()).toBe('Más comprados');
    });

    it('el pasillo se elige entre "Todos" y los 11 (D2)', async () => {
      await page.pickAisle();
      expect(buttons()).toHaveLength(13); // Todos + 11 + Cancelar
      buttons()
        .find((b) => b.text === 'Limpieza')
        .handler();
      expect(facade.aisle()).toBe('Limpieza');
      await page.pickAisle();
      buttons()[0].handler();
      expect(facade.aisle()).toBeNull();
    });
  });

  it('dice cuándo fue la última compra con las mismas palabras que el resto (fix-050 T3)', () => {
    expect(page.lastPurchaseLabel(3)).toBe('Última compra: hace 3 días');
    expect(page.lastPurchaseLabel(0)).toBe('Última compra: hoy');
    expect(page.lastPurchaseLabel(null)).toBe('Sin compras aún');
  });

  it('el precio es texto: "$1.290" o "Sin precio" (D5)', () => {
    expect(page.priceLabel(1290)).toBe('$1.290');
    expect(page.priceLabel(null)).toBe('Sin precio');
  });

  it('al entrar a la pestaña recarga (vuelve de una ficha con cambios)', () => {
    page.ionViewWillEnter();
    expect(facade.loadProducts).toHaveBeenCalled();
  });

  it('tocar un producto abre su ficha (AC1)', () => {
    page.open('p1');
    expect(nav.navigateForward).toHaveBeenCalledWith('/app/products/p1');
  });

  it('"Crear «texto»" solo si nada coincide exacto, y abre la ficha del nuevo (AC9)', async () => {
    facade.query.set('sal');
    expect(page.canCreate()).toBe(false);
    facade.query.set('sal de mar');
    expect(page.canCreate()).toBe(true);
    facade.query.set('  ');
    expect(page.canCreate()).toBe(false);

    facade.query.set('Sal de mar');
    await page.create();
    expect(facade.create).toHaveBeenCalledWith('Sal de mar');
    expect(facade.query()).toBe('');
    expect(nav.navigateForward).toHaveBeenCalledWith('/app/products/p9');
  });

  it('si no se pudo crear, avisa', async () => {
    facade.create.mockResolvedValue(null);
    facade.query.set('Sal de mar');
    await page.create();
    expect(toast.error).toHaveBeenCalled();
    expect(nav.navigateForward).not.toHaveBeenCalled();
  });

  it('el contador habla de lo que se ve', () => {
    expect(page.countLabel()).toBe('2 productos');
    facade.query.set('lec');
    expect(page.countLabel()).toBe('1 de 2 productos');
    facade.archived.set(true);
    facade.query.set('');
    expect(page.countLabel()).toBe('2 archivados');
  });
});
