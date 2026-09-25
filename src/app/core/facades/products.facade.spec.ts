import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductsFacade } from './products.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';

const NOW = new Date('2026-09-25T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('ProductsFacade', () => {
  let facade: ProductsFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let catalog: { findByFamily: ReturnType<typeof vi.fn>; updatePrice: ReturnType<typeof vi.fn> };
  let lists: { create: ReturnType<typeof vi.fn> };
  let items: { addMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    catalog = { findByFamily: vi.fn(), updatePrice: vi.fn().mockResolvedValue(undefined) };
    lists = { create: vi.fn().mockResolvedValue({ id: 'list-1' }) };
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
    it('calcula daysSinceUpdate y recomienda los de más de 7 días', async () => {
      catalog.findByFamily.mockResolvedValue([
        { id: 'a', name: 'Arroz', updated_at: daysAgo(10) },
        { id: 'b', name: 'Pan', updated_at: daysAgo(2) },
        { id: 'c', name: 'Sal', created_at: daysAgo(30) },
      ]);

      await facade.loadProducts();

      expect(catalog.findByFamily).toHaveBeenCalledWith('fam-1');
      const byId = Object.fromEntries(facade.products().map((p) => [p.id, p.daysSinceUpdate]));
      expect(byId).toEqual({ a: 10, b: 2, c: 30 });
      expect(facade.recommendedProducts().map((p) => p.id)).toEqual(['a', 'c']);
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
      facade.products.set([{ id: 'a', name: 'Arroz', daysSinceUpdate: 12 } as any]);
    });

    it('persiste y resetea daysSinceUpdate en el estado local', async () => {
      await facade.updatePrice('a', 1990);

      expect(catalog.updatePrice).toHaveBeenCalledWith('a', 1990);
      expect(facade.products()[0]).toMatchObject({ last_price: 1990, daysSinceUpdate: 0 });
    });

    it('no toca el estado local si la BD falla', async () => {
      catalog.updatePrice.mockRejectedValue(new Error('rls'));

      await facade.updatePrice('a', 1990);

      expect(facade.products()[0].daysSinceUpdate).toBe(12);
    });
  });

  describe('generateSmartList', () => {
    it('no crea lista si no hay recomendados', async () => {
      facade.products.set([{ id: 'b', daysSinceUpdate: 1 } as any]);

      await facade.generateSmartList();

      expect(lists.create).not.toHaveBeenCalled();
    });

    it('crea "Compra Inteligente" activa con los recomendados en un solo insert', async () => {
      facade.products.set([
        { id: 'a', daysSinceUpdate: 9 } as any,
        { id: 'b', daysSinceUpdate: 1 } as any,
        { id: 'c', daysSinceUpdate: 20 } as any,
      ]);

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
});
