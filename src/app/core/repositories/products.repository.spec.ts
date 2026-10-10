import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductsRepository } from './products.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { MutationError } from '@core/utils/mutation-error.utils';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('ProductsRepository', () => {
  let repo: ProductsRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ProductsRepository);
  });

  it('findByFamily filtra por familia, ordena por nombre y respeta el límite', async () => {
    const q = queryMock({ data: [{ id: 'p1' }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findByFamily('fam-1', 8)).toEqual([{ id: 'p1' }]);
    expect(mock.shop.from).toHaveBeenCalledWith('products');
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.order).toHaveBeenCalledWith('name');
    expect(q.limit).toHaveBeenCalledWith(8);
    // Los archivados no salen en el catálogo ni en los esenciales (spec 0017 D3).
    expect(q.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('findByFamily con archived trae solo los archivados', async () => {
    const q = queryMock({ data: [] });
    mock.shop.from.mockReturnValue(q);

    await repo.findByFamily('fam-1', undefined, { archived: true });

    expect(q.not).toHaveBeenCalledWith('archived_at', 'is', null);
    expect(q.is).not.toHaveBeenCalled();
  });

  it('findByFamily sin límite no llama a limit', async () => {
    const q = queryMock({ data: null });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findByFamily('fam-1')).toEqual([]);
    expect(q.limit).not.toHaveBeenCalled();
  });

  it('searchByName usa ilike con comodines', async () => {
    const q = queryMock({ data: [] });
    mock.shop.from.mockReturnValue(q);

    await repo.searchByName('lec', 20);

    expect(q.ilike).toHaveBeenCalledWith('name', '%lec%');
    expect(q.limit).toHaveBeenCalledWith(20);
    expect(q.is).toHaveBeenCalledWith('archived_at', null);
  });

  describe('ficha de producto (spec 0017)', () => {
    it('findById trae un producto', async () => {
      const q = queryMock({ data: { id: 'p1', name: 'Arroz' } });
      mock.shop.from.mockReturnValue(q);

      expect(await repo.findById('p1')).toEqual({ id: 'p1', name: 'Arroz' });
      expect(q.eq).toHaveBeenCalledWith('id', 'p1');
      expect(q.maybeSingle).toHaveBeenCalled();
    });

    it('findPurchases trae lo marcado en compras cerradas con fecha y tiendas', async () => {
      const row = {
        quantity: 2,
        unit_price: 1290,
        list: { id: 'l1', completed_at: '2026-10-05T12:00:00Z', receipts: [{ store: 'Aroca' }] },
      };
      const q = queryMock({ data: [row] });
      mock.shop.from.mockReturnValue(q);

      expect(await repo.findPurchases('p1')).toEqual([row]);
      expect(mock.shop.from).toHaveBeenCalledWith('list_items');
      expect(q.select).toHaveBeenCalledWith(
        'quantity, unit_price, list:shopping_lists!inner(id, completed_at, receipts(store))'
      );
      expect(q.eq).toHaveBeenCalledWith('product_id', 'p1');
      expect(q.eq).toHaveBeenCalledWith('is_checked', true);
      expect(q.eq).toHaveBeenCalledWith('list.status', 'completed');
    });

    it('rename, archive y unarchive actualizan el producto', async () => {
      const q = queryMock({ data: [{ id: 'p1' }] });
      mock.shop.from.mockReturnValue(q);

      await repo.rename('p1', 'Arroz');
      expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Arroz' }));
      await repo.archive('p1');
      expect(q.update).toHaveBeenCalledWith(
        expect.objectContaining({ archived_at: expect.any(String) })
      );
      await repo.unarchive('p1');
      expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ archived_at: null }));
    });

    it('remove borra y lanza not_found si RLS no dejó borrar nada', async () => {
      mock.shop.from.mockReturnValue(queryMock({ data: [] }));
      await expect(repo.remove('p1')).rejects.toBeInstanceOf(MutationError);
    });

    it('findStorePrices trae las líneas de boleta del producto con su tienda (spec 0020 D1)', async () => {
      const q = queryMock({ data: [{ unit_price: 1490 }] });
      mock.shop.from.mockReturnValue(q);

      expect(await repo.findStorePrices('p1')).toEqual([{ unit_price: 1490 }]);
      expect(mock.shop.from).toHaveBeenCalledWith('purchase_lines');
      expect(q.select).toHaveBeenCalledWith(
        'unit_price, quantity, amount, receipt:receipts(store, purchased_at), list:shopping_lists(completed_at)'
      );
      expect(q.eq).toHaveBeenCalledWith('product_id', 'p1');
      expect(q.eq).toHaveBeenCalledWith('kind', 'product');
    });

    it('merge llama a merge_products y devuelve las compras movidas', async () => {
      mock.shop.rpc.mockResolvedValue({ data: 3, error: null });

      expect(await repo.merge('p2', 'p1')).toBe(3);
      expect(mock.shop.rpc).toHaveBeenCalledWith('merge_products', { p_from: 'p2', p_into: 'p1' });
    });
  });

  it('create inserta (con precio opcional) y devuelve el producto', async () => {
    const q = queryMock({ data: { id: 'p9', name: 'Pan' } });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.create({ name: 'Pan', familyId: 'fam-1', lastPrice: 900 })).toEqual({
      id: 'p9',
      name: 'Pan',
    });
    expect(q.insert).toHaveBeenCalledWith({ name: 'Pan', family_id: 'fam-1', last_price: 900 });

    await repo.create({ name: 'Sal', familyId: 'fam-1' });
    expect(q.insert).toHaveBeenLastCalledWith({ name: 'Sal', family_id: 'fam-1' });
  });

  it('findIdByName busca sin distinguir mayúsculas dentro de la familia', async () => {
    const q = queryMock({ data: { id: 'p1' } });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findIdByName('fam-1', 'Leche')).toBe('p1');
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.ilike).toHaveBeenCalledWith('name', 'Leche');
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it('findIdByName devuelve null si no existe', async () => {
    mock.shop.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findIdByName('fam-1', 'x')).toBeNull();
  });

  it('updatePrice actualiza last_price y updated_at', async () => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);

    await repo.updatePrice('p1', 1990);

    expect(q.update).toHaveBeenCalledWith({ last_price: 1990, updated_at: expect.any(String) });
    expect(q.eq).toHaveBeenCalledWith('id', 'p1');
  });

  describe('reposición (spec 0014)', () => {
    it('findRestockStats usa la RPC restock_stats', async () => {
      const rows = [
        { product_id: 'p1', purchase_count: 3, median_interval_days: 10, last_purchased_at: 'x' },
      ];
      mock.shop.rpc.mockResolvedValue({ data: rows, error: null });

      expect(await repo.findRestockStats()).toEqual(rows);
      expect(mock.shop.rpc).toHaveBeenCalledWith('restock_stats');
    });

    it('snoozeRestock fija la fecha y pide la fila afectada', async () => {
      const q = queryMock({ data: [{ id: 'p1' }] });
      mock.shop.from.mockReturnValue(q);

      await repo.snoozeRestock('p1', '2026-10-10T00:00:00.000Z');

      expect(q.update).toHaveBeenCalledWith({ restock_snoozed_until: '2026-10-10T00:00:00.000Z' });
      expect(q.eq).toHaveBeenCalledWith('id', 'p1');
      expect(q.select).toHaveBeenCalledWith('id');
    });

    it('snoozeRestock que no afecta filas (otra familia, ya no existe) lanza not_found', async () => {
      mock.shop.from.mockReturnValue(queryMock({ data: [] }));
      await expect(repo.snoozeRestock('p1', 'x')).rejects.toEqual(new MutationError('not_found'));
    });
  });

  it('lanza el error de Supabase', async () => {
    const error = { message: 'boom' };
    mock.shop.from.mockReturnValue(queryMock({ error }));
    await expect(repo.searchByName('x', 1)).rejects.toBe(error);
  });
});
