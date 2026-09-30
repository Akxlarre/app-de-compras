import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductsFacade } from './products.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

const NOW = new Date('2026-09-25T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('ProductsFacade', () => {
  let facade: ProductsFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let catalog: { findByFamily: ReturnType<typeof vi.fn>; updatePrice: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    catalog = { findByFamily: vi.fn(), updatePrice: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        ProductsFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ProductsRepository, useValue: catalog },
      ],
    });
    facade = TestBed.inject(ProductsFacade);
  });

  afterEach(() => vi.useRealTimers());

  describe('loadProducts', () => {
    it('calcula daysSincePurchase desde la última compra (no desde el cambio de precio)', async () => {
      catalog.findByFamily.mockResolvedValue([
        { id: 'a', name: 'Arroz', last_purchased_at: daysAgo(10), updated_at: daysAgo(0) },
        { id: 'b', name: 'Pan', last_purchased_at: daysAgo(2), updated_at: daysAgo(40) },
        { id: 'c', name: 'Sal', last_purchased_at: null, created_at: daysAgo(30) },
      ]);

      await facade.loadProducts();

      expect(catalog.findByFamily).toHaveBeenCalledWith('fam-1');
      const byId = Object.fromEntries(facade.products().map((p) => [p.id, p.daysSincePurchase]));
      expect(byId).toEqual({ a: 10, b: 2, c: null });
      expect(facade.isLoading()).toBe(false);
    });

    it('setea error si falla la carga', async () => {
      family.getOrCreateFamilyId.mockRejectedValue(new Error('not_authenticated'));

      await facade.loadProducts();

      expect(facade.error()).toBe('Error al cargar productos');
      expect(facade.products()).toEqual([]);
      expect(facade.isLoading()).toBe(false);
    });
  });

  describe('updatePrice', () => {
    beforeEach(() => {
      facade.products.set([
        { id: 'a', name: 'Arroz', last_price: 1290, daysSincePurchase: 12 } as any,
      ]);
    });

    it('persiste el precio sin tocar la fecha de compra', async () => {
      expect(await facade.updatePrice('a', 1990)).toBe(true);

      expect(catalog.updatePrice).toHaveBeenCalledWith('a', 1990);
      expect(facade.products()[0]).toMatchObject({ last_price: 1990, daysSincePurchase: 12 });
    });

    it('no guarda si el precio no cambió', async () => {
      expect(await facade.updatePrice('a', 1290)).toBe(false);

      expect(catalog.updatePrice).not.toHaveBeenCalled();
    });

    it('no toca el estado local si la BD falla (devuelve false para que la página avise)', async () => {
      catalog.updatePrice.mockRejectedValue(new Error('rls'));

      expect(await facade.updatePrice('a', 1990)).toBe(false);

      expect(facade.products()[0].last_price).toBe(1290);
    });
  });

  it('cierre de sesión: vacía el catálogo', () => {
    facade.products.set([{ id: 'a' } as any]);
    facade.error.set('x');

    TestBed.inject(SessionScopeService).clear();

    expect(facade.products()).toEqual([]);
    expect(facade.error()).toBeNull();
  });
});
