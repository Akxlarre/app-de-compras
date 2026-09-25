import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductsFacade } from './products.facade';
import { ShoppingListFacade } from './shopping-list.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';

/** Query builder encadenable de Supabase: cada método devuelve el builder y `await` resuelve `result`. */
function queryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: any = {};
  for (const m of ['select', 'update', 'eq', 'order', 'limit', 'maybeSingle']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: result.data ?? null, error: result.error ?? null });
  return builder;
}

const NOW = new Date('2026-09-25T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('ProductsFacade', () => {
  let facade: ProductsFacade;
  let from: ReturnType<typeof vi.fn>;
  let shopping: { createList: any; addItem: any; data: any };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    from = vi.fn();
    shopping = {
      createList: vi.fn().mockResolvedValue(undefined),
      addItem: vi.fn(),
      data: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProductsFacade,
        { provide: SupabaseService, useValue: { client: { from } } },
        { provide: ShoppingListFacade, useValue: shopping },
      ],
    });
    facade = TestBed.inject(ProductsFacade);
  });

  afterEach(() => vi.useRealTimers());

  describe('loadProducts', () => {
    it('calcula daysSinceUpdate y recomienda los de más de 7 días', async () => {
      from.mockReturnValueOnce(queryBuilder({ data: { family_id: 'fam-1' } })).mockReturnValueOnce(
        queryBuilder({
          data: [
            { id: 'a', name: 'Arroz', updated_at: daysAgo(10) },
            { id: 'b', name: 'Pan', updated_at: daysAgo(2) },
            { id: 'c', name: 'Sal', created_at: daysAgo(30) },
          ],
        })
      );

      await facade.loadProducts();

      const byId = Object.fromEntries(facade.products().map((p) => [p.id, p.daysSinceUpdate]));
      expect(byId).toEqual({ a: 10, b: 2, c: 30 });
      expect(facade.recommendedProducts().map((p) => p.id)).toEqual(['a', 'c']);
      expect(facade.isLoading()).toBe(false);
    });

    it('setea error si el usuario no tiene familia', async () => {
      from.mockReturnValueOnce(queryBuilder({ data: null }));

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

    it('actualiza last_price y resetea daysSinceUpdate en el estado local', async () => {
      const qb = queryBuilder({});
      from.mockReturnValue(qb);

      await facade.updatePrice('a', 1990);

      expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({ last_price: 1990 }));
      expect(facade.products()[0]).toMatchObject({ last_price: 1990, daysSinceUpdate: 0 });
    });

    it('no toca el estado local si la BD falla', async () => {
      from.mockReturnValue(queryBuilder({ error: { message: 'rls' } }));

      await facade.updatePrice('a', 1990);

      expect(facade.products()[0].daysSinceUpdate).toBe(12);
    });
  });

  describe('generateSmartList', () => {
    it('no crea lista si no hay recomendados', async () => {
      facade.products.set([{ id: 'b', daysSinceUpdate: 1 } as any]);

      await facade.generateSmartList();

      expect(shopping.createList).not.toHaveBeenCalled();
    });

    it('crea "Compra Inteligente" y agrega cada recomendado', async () => {
      facade.products.set([
        { id: 'a', daysSinceUpdate: 9 } as any,
        { id: 'b', daysSinceUpdate: 1 } as any,
        { id: 'c', daysSinceUpdate: 20 } as any,
      ]);
      shopping.data.mockReturnValue({ id: 'list-1' });

      await facade.generateSmartList();

      expect(shopping.createList).toHaveBeenCalledWith('Compra Inteligente');
      expect(shopping.addItem.mock.calls).toEqual([
        ['list-1', 'a', 1],
        ['list-1', 'c', 1],
      ]);
    });
  });
});
