import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ShoppingListsRepository } from './shopping-lists.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

const WITH_ITEMS = '*, list_items(*, product:products(id, name, category, last_price))';

describe('ShoppingListsRepository', () => {
  let repo: ShoppingListsRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ShoppingListsRepository);
  });

  it('findLatestActive trae la lista activa más reciente con sus ítems', async () => {
    const list = { id: 'l1', list_items: [] };
    const q = queryMock({ data: list });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findLatestActive()).toEqual(list);
    expect(mock.shop.from).toHaveBeenCalledWith('shopping_lists');
    expect(q.select).toHaveBeenCalledWith(WITH_ITEMS);
    expect(q.eq).toHaveBeenCalledWith('status', 'active');
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it('findLatestActive devuelve null si no hay lista activa', async () => {
    mock.shop.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findLatestActive()).toBeNull();
  });

  it('findLastCompleted filtra por familia y ordena por completed_at', async () => {
    const q = queryMock({ data: { id: 'l0' } });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findLastCompleted('fam-1')).toEqual({ id: 'l0' });
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'completed');
    expect(q.order).toHaveBeenCalledWith('completed_at', { ascending: false, nullsFirst: false });
  });

  it('findTemplates filtra por status template', async () => {
    const q = queryMock({ data: [{ id: 't1' }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findTemplates('fam-1')).toEqual([{ id: 't1' }]);
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'template');
  });

  it('findTemplates devuelve [] si no hay datos', async () => {
    mock.shop.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findTemplates('fam-1')).toEqual([]);
  });

  it('create inserta y devuelve la fila creada', async () => {
    const q = queryMock({ data: { id: 'l2', name: 'Asado' } });
    mock.shop.from.mockReturnValue(q);

    const created = await repo.create({ name: 'Asado', familyId: 'fam-1', status: 'template' });

    expect(q.insert).toHaveBeenCalledWith({
      name: 'Asado',
      family_id: 'fam-1',
      status: 'template',
    });
    expect(q.single).toHaveBeenCalled();
    expect(created).toEqual({ id: 'l2', name: 'Asado' });
  });

  it('complete finaliza con la RPC complete_list y devuelve la lista de los pendientes', async () => {
    mock.shop.rpc.mockResolvedValue({ data: 'l9', error: null });

    expect(await repo.complete('l1', true)).toBe('l9');
    expect(mock.shop.rpc).toHaveBeenCalledWith('complete_list', {
      p_list_id: 'l1',
      p_carry_pending: true,
    });
  });

  it('complete descartando pendientes devuelve null', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });

    expect(await repo.complete('l1', false)).toBeNull();
    expect(mock.shop.rpc).toHaveBeenCalledWith('complete_list', {
      p_list_id: 'l1',
      p_carry_pending: false,
    });
  });

  it('closeManual cierra sin boleta con los precios confirmados y el total', async () => {
    mock.shop.rpc.mockResolvedValue({ data: 'l9', error: null });

    const next = await repo.closeManual('l1', true, [{ itemId: 'i1', unitPrice: 1100 }], 5000);

    expect(next).toBe('l9');
    expect(mock.shop.rpc).toHaveBeenCalledWith('close_list_manual', {
      p_list_id: 'l1',
      p_carry_pending: true,
      p_prices: [{ item_id: 'i1', unit_price: 1100 }],
      p_total: 5000,
    });
  });

  it('closeManual sin total manda null', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });

    expect(await repo.closeManual('l1', false, [], null)).toBeNull();
    expect(mock.shop.rpc).toHaveBeenCalledWith(
      'close_list_manual',
      expect.objectContaining({ p_prices: [], p_total: null })
    );
  });

  it('closeManual lanza el error de Supabase', async () => {
    const error = { message: 'invalid_total' };
    mock.shop.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.closeManual('l1', true, [], -1)).rejects.toBe(error);
  });

  it('complete lanza el error de Supabase', async () => {
    const error = { message: 'list_not_active' };
    mock.shop.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.complete('l1', true)).rejects.toBe(error);
  });

  it('findCompleted trae las compras finalizadas de la familia, más recientes primero', async () => {
    const q = queryMock({ data: [{ id: 'l0' }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findCompleted('fam-1', 20)).toEqual([{ id: 'l0' }]);
    expect(q.select).toHaveBeenCalledWith(
      '*, list_items(*, product:products(id, name, category, last_price))'
    );
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'completed');
    expect(q.order).toHaveBeenCalledWith('completed_at', { ascending: false, nullsFirst: false });
    expect(q.limit).toHaveBeenCalledWith(20);
  });

  it('findCompleted devuelve [] si no hay datos', async () => {
    mock.shop.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findCompleted('fam-1')).toEqual([]);
  });

  it('lanza el error de Supabase', async () => {
    const error = { message: 'boom' };
    mock.shop.from.mockReturnValue(queryMock({ error }));
    await expect(repo.findCompleted('fam-1')).rejects.toBe(error);
  });
});
