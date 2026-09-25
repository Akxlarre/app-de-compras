import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ListItemsRepository } from './list-items.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
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

  it('add inserta el ítem', async () => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);

    await repo.add('l1', 'p1', 2);

    expect(mock.shop.from).toHaveBeenCalledWith('list_items');
    expect(q.insert).toHaveBeenCalledWith({ list_id: 'l1', product_id: 'p1', quantity: 2 });
  });

  it('addMany inserta en lote y no consulta si la lista está vacía', async () => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);
    const items = [{ list_id: 'l1', product_id: 'p1', quantity: 1 }];

    await repo.addMany([]);
    expect(mock.shop.from).not.toHaveBeenCalled();

    await repo.addMany(items);
    expect(q.insert).toHaveBeenCalledWith(items);
  });

  it('findByList devuelve product_id y quantity', async () => {
    const q = queryMock({ data: [{ product_id: 'p1', quantity: 3 }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findByList('l1')).toEqual([{ product_id: 'p1', quantity: 3 }]);
    expect(q.select).toHaveBeenCalledWith('product_id, quantity');
    expect(q.eq).toHaveBeenCalledWith('list_id', 'l1');
  });

  it.each([
    ['updateQuantity', (r: ListItemsRepository) => r.updateQuantity('i1', 4), { quantity: 4 }],
    ['setChecked', (r: ListItemsRepository) => r.setChecked('i1', true), { is_checked: true }],
  ])('%s actualiza por id', async (_, act, patch) => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);

    await act(repo);

    expect(q.update).toHaveBeenCalledWith(patch);
    expect(q.eq).toHaveBeenCalledWith('id', 'i1');
  });

  it('remove borra por id', async () => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);

    await repo.remove('i1');

    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('id', 'i1');
  });

  it('lanza el error de Supabase', async () => {
    const error = { message: 'rls' };
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
