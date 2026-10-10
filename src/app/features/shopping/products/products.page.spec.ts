import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductsPage } from './products.page';
import { ProductsFacade } from '@core/facades/products.facade';
import { ToastService } from '@core/services/ui/toast.service';

describe('ProductsPage (fix-050)', () => {
  let page: ProductsPage;
  let facade: any;
  let toast: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    facade = {
      products: signal([{ id: 'p1', name: 'Leche', last_price: 1290, daysSincePurchase: 3 }]),
      isLoading: signal(false),
      loadProducts: vi.fn(),
      updatePrice: vi.fn().mockResolvedValue(true),
    };
    toast = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ProductsPage,
        { provide: ProductsFacade, useValue: facade },
        { provide: ToastService, useValue: toast },
      ],
    });
    page = TestBed.inject(ProductsPage);
  });

  it('dice cuándo fue la última compra con las mismas palabras que el resto (T3)', () => {
    expect(page.lastPurchaseLabel(3)).toBe('Última compra: hace 3 días');
    expect(page.lastPurchaseLabel(0)).toBe('Última compra: hoy');
    expect(page.lastPurchaseLabel(null)).toBe('Sin compras aún');
  });

  it('el precio es texto: "$1.290" o "Sin precio" (V3)', () => {
    expect(page.priceLabel(1290)).toBe('$1.290');
    expect(page.priceLabel(null)).toBe('Sin precio');
  });

  it('se edita al tocarlo y al guardar vuelve a ser texto', async () => {
    expect(page.editingId()).toBeNull();
    page.edit('p1');
    expect(page.editingId()).toBe('p1');

    const input = { value: '1.390' } as HTMLInputElement;
    await page.onPriceBlur('p1', { target: input } as unknown as Event);

    expect(facade.updatePrice).toHaveBeenCalledWith('p1', 1390);
    expect(page.editingId()).toBeNull();
  });

  it('sin cambios no guarda y cierra la edición', async () => {
    page.edit('p1');
    await page.onPriceBlur('p1', { target: { value: '1290' } } as unknown as Event);
    expect(facade.updatePrice).not.toHaveBeenCalled();
    expect(page.editingId()).toBeNull();
  });
});
