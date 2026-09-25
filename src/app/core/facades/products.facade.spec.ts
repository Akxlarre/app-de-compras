import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductsFacade } from './products.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

const NOW = new Date('2026-09-25T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('ProductsFacade', () => {
  let facade: ProductsFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let catalog: { findByFamily: ReturnType<typeof vi.fn>; updatePrice: ReturnType<typeof vi.fn> };
  let lists: { create: ReturnType<typeof vi.fn>; findLatestActive: ReturnType<typeof vi.fn> };
  let items: { addMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    catalog = { findByFamily: vi.fn(), updatePrice: vi.fn().mockResolvedValue(undefined) };
    lists = {
      create: vi.fn().mockResolvedValue({ id: 'list-1' }),
      findLatestActive: vi.fn().mockResolvedValue(null),
    };
    items = { addMany: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        ProductsFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ProductsRepository, useValue: catalog },
        { provide: ShoppingListsRepository, useValue: lists },
        { provide: ListItemsRepository, useValue: items },
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

    it('recomienda reponer según la duración estimada; nunca comprado no se recomienda', async () => {
      catalog.findByFamily.mockResolvedValue([
        { id: 'a', name: 'Arroz', last_purchased_at: daysAgo(10) },
        { id: 'b', name: 'Pan', last_purchased_at: daysAgo(3), estimated_duration_days: 2 },
        { id: 'c', name: 'Aceite', last_purchased_at: daysAgo(10), estimated_duration_days: 45 },
        { id: 'd', name: 'Sal', last_purchased_at: null },
      ]);

      await facade.loadProducts();

      expect(facade.recommendedProducts().map((p) => p.id)).toEqual(['a', 'b']);
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

  describe('generateSmartList', () => {
    // Recomendado = comprado hace ≥ 7 días (sin duración estimada).
    const due = (id: string) => ({ id, last_purchased_at: daysAgo(9) } as any);
    const fresh = (id: string) => ({ id, last_purchased_at: daysAgo(1) } as any);

    it('no crea lista si no hay recomendados', async () => {
      facade.products.set([fresh('b')]);

      await facade.generateSmartList();

      expect(lists.create).not.toHaveBeenCalled();
    });

    it('con una lista activa, agrega solo los recomendados que faltan y no crea otra lista', async () => {
      lists.findLatestActive.mockResolvedValue({
        id: 'activa',
        list_items: [{ id: 'i1', product: { id: 'a' } }],
      });
      facade.products.set([due('a'), due('c')]);

      await facade.generateSmartList();

      expect(lists.create).not.toHaveBeenCalled();
      expect(items.addMany).toHaveBeenCalledWith([
        { list_id: 'activa', product_id: 'c', quantity: 1 },
      ]);
    });

    it('sin lista activa, crea "Compra Inteligente" con los recomendados en un solo insert', async () => {
      facade.products.set([due('a'), fresh('b'), due('c')]);

      await facade.generateSmartList();

      expect(lists.create).toHaveBeenCalledWith({
        name: 'Compra Inteligente',
        familyId: 'fam-1',
        status: 'active',
      });
      expect(items.addMany).toHaveBeenCalledWith([
        { list_id: 'list-1', product_id: 'a', quantity: 1 },
        { list_id: 'list-1', product_id: 'c', quantity: 1 },
      ]);
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
