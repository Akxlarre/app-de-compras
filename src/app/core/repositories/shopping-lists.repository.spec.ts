import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ShoppingListsRepository } from './shopping-lists.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { MutationError } from '@core/utils/mutation-error.utils';
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

  it('complete traduce list_not_active a MutationError', async () => {
    mock.shop.rpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'list_not_active' },
    });
    await expect(repo.complete('l1', true)).rejects.toEqual(new MutationError('list_not_active'));
  });

  it('startActive usa start_active_list y dice si la creó', async () => {
    const q = queryMock({ data: { id: 'l1', created: false } });
    mock.shop.rpc.mockReturnValue(q);

    expect(await repo.startActive('Compra de la Semana')).toEqual({ id: 'l1', created: false });
    expect(mock.shop.rpc).toHaveBeenCalledWith('start_active_list', {
      p_name: 'Compra de la Semana',
    });
    expect(q.single).toHaveBeenCalled();
  });

  it('deletePurchase usa delete_purchase y devuelve la ruta de la foto (spec 0012)', async () => {
    mock.shop.rpc.mockResolvedValue({ data: 'fam/b.jpg', error: null });

    expect(await repo.deletePurchase('l1')).toBe('fam/b.jpg');
    expect(mock.shop.rpc).toHaveBeenCalledWith('delete_purchase', { p_list_id: 'l1' });
  });

  it('deletePurchase sin boleta devuelve null', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });
    expect(await repo.deletePurchase('l1')).toBeNull();
  });

  it('renamePurchase usa rename_purchase y traduce invalid_name', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });
    await repo.renamePurchase('l1', 'Asado');
    expect(mock.shop.rpc).toHaveBeenCalledWith('rename_purchase', {
      p_list_id: 'l1',
      p_name: 'Asado',
    });

    mock.shop.rpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'invalid_name' },
    });
    await expect(repo.renamePurchase('l1', '')).rejects.toEqual(new MutationError('invalid_name'));
  });

  describe('plantillas (spec 0013, Q28)', () => {
    it('renameTemplate actualiza solo una plantilla y pide la fila afectada', async () => {
      const q = queryMock({ data: [{ id: 't1' }] });
      mock.shop.from.mockReturnValue(q);

      await repo.renameTemplate('t1', 'Asado');

      expect(mock.shop.from).toHaveBeenCalledWith('shopping_lists');
      expect(q.update).toHaveBeenCalledWith({ name: 'Asado' });
      expect(q.eq).toHaveBeenCalledWith('id', 't1');
      expect(q.eq).toHaveBeenCalledWith('status', 'template');
      expect(q.select).toHaveBeenCalledWith('id');
    });

    it('deleteTemplate borra solo una plantilla (nunca una compra ni la activa)', async () => {
      const q = queryMock({ data: [{ id: 't1' }] });
      mock.shop.from.mockReturnValue(q);

      await repo.deleteTemplate('t1');

      expect(q.delete).toHaveBeenCalled();
      expect(q.eq).toHaveBeenCalledWith('id', 't1');
      expect(q.eq).toHaveBeenCalledWith('status', 'template');
    });

    it.each([
      ['renameTemplate', (r: ShoppingListsRepository) => r.renameTemplate('t1', 'X')],
      ['deleteTemplate', (r: ShoppingListsRepository) => r.deleteTemplate('t1')],
    ])('%s que no afecta filas lanza not_found', async (_, act) => {
      mock.shop.from.mockReturnValue(queryMock({ data: [] }));
      await expect(act(repo)).rejects.toEqual(new MutationError('not_found'));
    });
  });

  it('complete traduce nothing_checked', async () => {
    mock.shop.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'nothing_checked' },
    });
    await expect(repo.complete('l1', true)).rejects.toEqual(new MutationError('nothing_checked'));
  });

  it('startActive sin red lanza offline', async () => {
    mock.shop.rpc.mockReturnValue(
      queryMock({ error: { code: '', message: 'TypeError: Failed to fetch' } })
    );
    await expect(repo.startActive('x')).rejects.toEqual(new MutationError('offline'));
  });

  it('findCompleted trae las compras finalizadas de la familia, más recientes primero', async () => {
    const q = queryMock({ data: [{ id: 'l0' }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findCompleted('fam-1', 20)).toEqual([{ id: 'l0' }]);
    // Trae también la boleta de cada compra (spec 0009): total real, comercio y foto; y todas sus
    // líneas (spec 0015, G2).
    expect(q.select).toHaveBeenCalledWith(
      `${WITH_ITEMS}, receipts(id, image_url, store, total_amount), purchase_lines(receipt_id, line_index, raw_text, name, kind, quantity, unit_price, amount, product:products(id, name))`
    );
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'completed');
    expect(q.order).toHaveBeenCalledWith('completed_at', { ascending: false, nullsFirst: false });
    expect(q.limit).toHaveBeenCalledWith(20);
  });

  it('setPurchaseTotal ingresa el total y los precios de una compra ya cerrada', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });

    await repo.setPurchaseTotal('l1', 5000, [{ itemId: 'i1', unitPrice: 700 }]);

    expect(mock.shop.rpc).toHaveBeenCalledWith('set_purchase_total', {
      p_list_id: 'l1',
      p_total: 5000,
      p_prices: [{ item_id: 'i1', unit_price: 700 }],
    });
  });

  it('setPurchaseTotal lanza el error de Supabase', async () => {
    const error = { message: 'has_receipt' };
    mock.shop.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.setPurchaseTotal('l1', 1, [])).rejects.toBe(error);
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
