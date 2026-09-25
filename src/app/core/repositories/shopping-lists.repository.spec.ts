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
    mock.client.from.mockReturnValue(q);

    expect(await repo.findLatestActive()).toEqual(list);
    expect(mock.client.from).toHaveBeenCalledWith('shopping_lists');
    expect(q.select).toHaveBeenCalledWith(WITH_ITEMS);
    expect(q.eq).toHaveBeenCalledWith('status', 'active');
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it('findLatestActive devuelve null si no hay lista activa', async () => {
    mock.client.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findLatestActive()).toBeNull();
  });

  it('findLastCompleted filtra por familia y ordena por completed_at', async () => {
    const q = queryMock({ data: { id: 'l0' } });
    mock.client.from.mockReturnValue(q);

    expect(await repo.findLastCompleted('fam-1')).toEqual({ id: 'l0' });
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'completed');
    expect(q.order).toHaveBeenCalledWith('completed_at', { ascending: false, nullsFirst: false });
  });

  it('findTemplates filtra por status template', async () => {
    const q = queryMock({ data: [{ id: 't1' }] });
    mock.client.from.mockReturnValue(q);

    expect(await repo.findTemplates('fam-1')).toEqual([{ id: 't1' }]);
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'template');
  });

  it('findTemplates devuelve [] si no hay datos', async () => {
    mock.client.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findTemplates('fam-1')).toEqual([]);
  });

  it('create inserta y devuelve la fila creada', async () => {
    const q = queryMock({ data: { id: 'l2', name: 'Asado' } });
    mock.client.from.mockReturnValue(q);

    const created = await repo.create({ name: 'Asado', familyId: 'fam-1', status: 'template' });

    expect(q.insert).toHaveBeenCalledWith({
      name: 'Asado',
      family_id: 'fam-1',
      status: 'template',
    });
    expect(q.single).toHaveBeenCalled();
    expect(created).toEqual({ id: 'l2', name: 'Asado' });
  });

  it('complete marca completed con fecha', async () => {
    const q = queryMock();
    mock.client.from.mockReturnValue(q);

    await repo.complete('l1');

    expect(q.update).toHaveBeenCalledWith({
      status: 'completed',
      completed_at: expect.any(String),
    });
    expect(q.eq).toHaveBeenCalledWith('id', 'l1');
  });

  it('lanza el error de Supabase', async () => {
    const error = { message: 'boom' };
    mock.client.from.mockReturnValue(queryMock({ error }));
    await expect(repo.complete('l1')).rejects.toBe(error);
  });
});
