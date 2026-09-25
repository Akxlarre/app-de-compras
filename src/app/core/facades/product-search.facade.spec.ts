import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductSearchFacade } from './product-search.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';

/** Query builder encadenable de Supabase: cada método devuelve el builder y `await` resuelve `result`. */
function queryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: any = {};
  for (const m of ['select', 'insert', 'eq', 'ilike', 'order', 'limit', 'single']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: result.data ?? null, error: result.error ?? null });
  return builder;
}

describe('ProductSearchFacade', () => {
  let facade: ProductSearchFacade;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    from = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ProductSearchFacade,
        { provide: SupabaseService, useValue: { client: { from } } },
      ],
    });
    facade = TestBed.inject(ProductSearchFacade);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('search', () => {
    it('no consulta con menos de 2 caracteres y limpia resultados', async () => {
      facade.searchResults.set([{ id: '1', name: 'Pan', category: null, family_id: 'f' }]);

      await facade.search(' a ');

      expect(from).not.toHaveBeenCalled();
      expect(facade.searchResults()).toEqual([]);
    });

    it('busca por nombre con ilike sobre el término recortado', async () => {
      const qb = queryBuilder({ data: [{ id: '1', name: 'Leche' }] });
      from.mockReturnValue(qb);

      await facade.search('  lec ');

      expect(from).toHaveBeenCalledWith('products');
      expect(qb.ilike).toHaveBeenCalledWith('name', '%lec%');
      expect(facade.searchResults()).toEqual([{ id: '1', name: 'Leche' }]);
      expect(facade.isSearching()).toBe(false);
    });

    it('setea error si la consulta falla', async () => {
      from.mockReturnValue(queryBuilder({ error: { message: 'boom' } }));

      await facade.search('leche');

      expect(facade.error()).toBe('Error al buscar productos');
      expect(facade.isSearching()).toBe(false);
    });
  });

  describe('loadEssentials', () => {
    it('carga hasta 8 productos de la familia y cachea en la sesión', async () => {
      const qb = queryBuilder({ data: [{ id: '1', name: 'Arroz' }] });
      from.mockReturnValue(qb);

      await facade.loadEssentials('fam-1');
      await facade.loadEssentials('fam-1');

      expect(from).toHaveBeenCalledTimes(1);
      expect(qb.eq).toHaveBeenCalledWith('family_id', 'fam-1');
      expect(qb.limit).toHaveBeenCalledWith(8);
      expect(facade.essentials()).toHaveLength(1);
    });
  });

  describe('createProduct', () => {
    it('inserta con nombre recortado y devuelve el producto', async () => {
      const created = { id: 'p1', name: 'Huevos', family_id: 'fam-1', category: null };
      const qb = queryBuilder({ data: created });
      from.mockReturnValue(qb);

      const result = await facade.createProduct('  Huevos ', 'fam-1');

      expect(qb.insert).toHaveBeenCalledWith({ name: 'Huevos', family_id: 'fam-1' });
      expect(result).toEqual(created);
    });

    it('devuelve null y setea error si falla', async () => {
      from.mockReturnValue(queryBuilder({ error: { message: 'dup' } }));

      const result = await facade.createProduct('Huevos', 'fam-1');

      expect(result).toBeNull();
      expect(facade.error()).toBe('Error al crear producto');
      expect(facade.isSearching()).toBe(false);
    });
  });
});
