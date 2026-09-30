import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ListItemsRepository } from './list-items.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { MutationError } from '@core/utils/mutation-error.utils';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('ListItemsRepository', () => {
  let repo: ListItemsRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ListItemsRepository);
  });

  const codeOf = async (p: Promise<unknown>) => {
    const e = await p.then(
      () => null,
      (err) => err
    );
    expect(e).toBeInstanceOf(MutationError);
    return (e as MutationError).code;
  };

  it('add usa la RPC add_list_item (suma si ya está) y devuelve la fila', async () => {
    mock.shop.rpc.mockResolvedValue({ data: { id: 'i1', quantity: 3 }, error: null });

    expect(await repo.add('l1', 'p1', 2)).toEqual({ id: 'i1', quantity: 3 });
    expect(mock.shop.rpc).toHaveBeenCalledWith('add_list_item', {
      p_list_id: 'l1',
      p_product_id: 'p1',
      p_quantity: 2,
    });
  });

  it('addMany usa add_list_items, omite productos borrados y no llama si no hay nada', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });

    await repo.addMany('l1', [{ product_id: null, quantity: 1 }]);
    expect(mock.shop.rpc).not.toHaveBeenCalled();

    await repo.addMany('l1', [
      { product_id: 'p1', quantity: 2 },
      { product_id: null, quantity: 1 },
    ]);
    expect(mock.shop.rpc).toHaveBeenCalledWith('add_list_items', {
      p_list_id: 'l1',
      p_items: [{ product_id: 'p1', quantity: 2 }],
    });
  });

  it('findByList devuelve product_id y quantity', async () => {
    const q = queryMock({ data: [{ product_id: 'p1', quantity: 3 }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findByList('l1')).toEqual([{ product_id: 'p1', quantity: 3 }]);
    expect(q.select).toHaveBeenCalledWith('product_id, quantity');
    expect(q.eq).toHaveBeenCalledWith('list_id', 'l1');
  });

  it('changeQuantity manda el incremento y devuelve la cantidad final', async () => {
    mock.shop.rpc.mockResolvedValue({ data: '4.00', error: null });

    expect(await repo.changeQuantity('i1', 1)).toBe(4);
    expect(mock.shop.rpc).toHaveBeenCalledWith('change_item_quantity', {
      p_item_id: 'i1',
      p_delta: 1,
    });
  });

  it('setChecked actualiza por id y pide la fila afectada', async () => {
    const q = queryMock({ data: [{ id: 'i1' }] });
    mock.shop.from.mockReturnValue(q);

    await repo.setChecked('i1', true);

    expect(q.update).toHaveBeenCalledWith({ is_checked: true });
    expect(q.eq).toHaveBeenCalledWith('id', 'i1');
    expect(q.select).toHaveBeenCalledWith('id');
  });

  it('remove borra por id', async () => {
    const q = queryMock({ data: [{ id: 'i1' }] });
    mock.shop.from.mockReturnValue(q);

    await repo.remove('i1');

    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('id', 'i1');
  });

  // AC5: RLS bloquea sin error; 0 filas afectadas es un error.
  it.each([
    ['setChecked', (r: ListItemsRepository) => r.setChecked('i1', true)],
    ['remove', (r: ListItemsRepository) => r.remove('i1')],
  ])('%s que no afecta filas lanza not_found', async (_, act) => {
    mock.shop.from.mockReturnValue(queryMock({ data: [] }));
    expect(await codeOf(act(repo))).toBe('not_found');
  });

  it.each([
    ['add', (r: ListItemsRepository) => r.add('l1', 'p1', 1), 'list_not_found', 'not_found'],
    ['add', (r: ListItemsRepository) => r.add('l1', 'p1', 1), 'list_not_active', 'list_not_active'],
    [
      'changeQuantity',
      (r: ListItemsRepository) => r.changeQuantity('i1', 1),
      'item_not_found',
      'not_found',
    ],
    [
      'addMany',
      (r: ListItemsRepository) => r.addMany('l1', [{ product_id: 'p', quantity: 1 }]),
      'list_not_active',
      'list_not_active',
    ],
  ])('%s traduce %s de la RPC', async (_, act, message, code) => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message } });
    expect(await codeOf(act(repo))).toBe(code);
  });

  it('un fallo de red es offline', async () => {
    mock.shop.from.mockReturnValue(
      queryMock({ error: { code: '', message: 'TypeError: Failed to fetch' } })
    );
    expect(await codeOf(repo.setChecked('i1', true))).toBe('offline');
  });

  it('los demás errores de Supabase pasan tal cual', async () => {
    const error = { code: '42501', message: 'rls' };
    mock.shop.from.mockReturnValue(queryMock({ error }));
    await expect(repo.remove('i1')).rejects.toBe(error);
  });

  it('watchList escucha cambios de la lista y la baja remueve el canal', () => {
    const onChange = vi.fn();

    const stop = repo.watchList('l1', onChange);

    expect(mock.client.channel).toHaveBeenCalledWith('list_items_changes_l1');
    const [event, filter, handler] = mock.channel.on.mock.calls[0];
    expect(event).toBe('postgres_changes');
    expect(filter).toEqual({
      event: '*',
      schema: 'shop',
      table: 'list_items',
      filter: 'list_id=eq.l1',
    });
    expect(mock.channel.subscribe).toHaveBeenCalled();

    handler({});
    expect(onChange).toHaveBeenCalledTimes(1);

    stop();
    expect(mock.client.removeChannel).toHaveBeenCalledWith(mock.channel);
  });
});
