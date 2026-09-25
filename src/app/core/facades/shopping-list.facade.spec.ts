import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShoppingListFacade } from './shopping-list.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';

const list = (items: any[] = []) =>
  ({ id: 'list-1', name: 'Semana', status: 'active', list_items: items } as any);

describe('ShoppingListFacade', () => {
  let facade: ShoppingListFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let lists: Record<string, ReturnType<typeof vi.fn>>;
  let items: Record<string, ReturnType<typeof vi.fn>>;
  let stopWatching: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stopWatching = vi.fn();
    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    lists = {
      findLatestActive: vi.fn().mockResolvedValue(list()),
      findLastCompleted: vi.fn().mockResolvedValue(null),
      findTemplates: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'new-list' }),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    items = {
      add: vi.fn().mockResolvedValue(undefined),
      addMany: vi.fn().mockResolvedValue(undefined),
      findByList: vi.fn().mockResolvedValue([]),
      updateQuantity: vi.fn().mockResolvedValue(undefined),
      setChecked: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      watchList: vi.fn(() => stopWatching),
    };

    TestBed.configureTestingModule({
      providers: [
        ShoppingListFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ShoppingListsRepository, useValue: lists },
        { provide: ListItemsRepository, useValue: items },
      ],
    });
    facade = TestBed.inject(ShoppingListFacade);
  });

  describe('carga y Realtime', () => {
    it('carga la lista activa y la observa por Realtime una sola vez', async () => {
      await facade.initialize();
      await facade.initialize(); // SWR: refresca en background

      expect(facade.data()?.id).toBe('list-1');
      expect(items['watchList']).toHaveBeenCalledTimes(1);
      expect(items['watchList']).toHaveBeenCalledWith('list-1', expect.any(Function));
    });

    it('sin lista activa expone NO_ACTIVE_LIST', async () => {
      lists['findLatestActive'].mockResolvedValue(null);

      await facade.initialize();

      expect(facade.error()).toBe('NO_ACTIVE_LIST');
      expect(items['watchList']).not.toHaveBeenCalled();
    });

    it('un cambio remoto refresca la lista; dispose deja de observar', async () => {
      await facade.initialize();
      const onRemoteChange = items['watchList'].mock.calls[0][1];
      lists['findLatestActive'].mockResolvedValue(list([{ id: 'i9', quantity: 1 }]));

      await onRemoteChange();
      expect(facade.data()?.list_items).toHaveLength(1);

      facade.dispose();
      expect(stopWatching).toHaveBeenCalled();
    });
  });

  describe('mutaciones optimistas', () => {
    beforeEach(() => {
      facade['_data'].set(
        list([
          { id: 'item-1', is_checked: false, quantity: 1, product: { id: 'p1' } },
          { id: 'item-2', is_checked: true, quantity: 2, product: { id: 'p2' } },
        ])
      );
    });

    it('toggleItemCheck marca al instante y persiste', async () => {
      await facade.toggleItemCheck('item-1', false);

      expect(facade.data()?.list_items[0].is_checked).toBe(true);
      expect(items['setChecked']).toHaveBeenCalledWith('item-1', true);
    });

    it('toggleItemCheck vuelve al estado del servidor si falla', async () => {
      items['setChecked'].mockRejectedValue(new Error('rls'));
      lists['findLatestActive'].mockResolvedValue(list([{ id: 'item-1', is_checked: false }]));

      await facade.toggleItemCheck('item-1', false);

      expect(facade.data()?.list_items[0].is_checked).toBe(false);
    });

    it('deleteItem quita el ítem al instante', async () => {
      await facade.deleteItem('item-1');

      expect(facade.data()?.list_items.map((i) => i.id)).toEqual(['item-2']);
      expect(items['remove']).toHaveBeenCalledWith('item-1');
    });

    it('updateItemQuantity revierte la cantidad si falla', async () => {
      items['updateQuantity'].mockRejectedValue(new Error('network'));

      await facade.updateItemQuantity('item-2', 5);

      expect(facade.data()?.list_items[1].quantity).toBe(2);
      expect(facade.error()).toContain('conexión');
    });

    it('addItem suma cantidad si el producto ya está en la lista', async () => {
      await facade.addItem('list-1', 'p2', 3);

      expect(facade.data()?.list_items[1].quantity).toBe(5);
      expect(items['updateQuantity']).toHaveBeenCalledWith('item-2', 5);
      expect(items['add']).not.toHaveBeenCalled();
    });

    it('addItem inserta si el producto es nuevo', async () => {
      await facade.addItem('list-1', 'p3', 1);
      expect(items['add']).toHaveBeenCalledWith('list-1', 'p3', 1);
    });
  });

  describe('listas y plantillas', () => {
    it('createList crea una lista activa en la familia del usuario', async () => {
      await facade.createList('Compra de la Semana');

      expect(lists['create']).toHaveBeenCalledWith({
        name: 'Compra de la Semana',
        familyId: 'fam-1',
        status: 'active',
      });
    });

    it('completeList completa y recarga (queda sin lista activa)', async () => {
      lists['findLatestActive'].mockResolvedValue(null);

      await facade.completeList('list-1');

      expect(lists['complete']).toHaveBeenCalledWith('list-1');
      expect(facade.error()).toBe('NO_ACTIVE_LIST');
    });

    it('loadTemplates carga última compra y plantillas de la familia', async () => {
      lists['findLastCompleted'].mockResolvedValue(list());
      lists['findTemplates'].mockResolvedValue([{ id: 'tpl-1', name: 'Asado', list_items: [] }]);

      await facade.loadTemplates();

      expect(lists['findLastCompleted']).toHaveBeenCalledWith('fam-1');
      expect(lists['findTemplates']).toHaveBeenCalledWith('fam-1');
      expect(facade.lastCompletedList()?.id).toBe('list-1');
      expect(facade.templates()[0].name).toBe('Asado');
    });

    it('saveAsTemplate crea la plantilla, copia los ítems y recarga', async () => {
      lists['create'].mockResolvedValue({ id: 'tpl-1' });
      items['findByList'].mockResolvedValue([{ product_id: 'p1', quantity: 2 }]);
      const loadSpy = vi.spyOn(facade, 'loadTemplates').mockResolvedValue();

      await facade.saveAsTemplate('list-1', 'Asado');

      expect(lists['create']).toHaveBeenCalledWith({
        name: 'Asado',
        familyId: 'fam-1',
        status: 'template',
      });
      expect(items['findByList']).toHaveBeenCalledWith('list-1');
      expect(items['addMany']).toHaveBeenCalledWith([
        { list_id: 'tpl-1', product_id: 'p1', quantity: 2 },
      ]);
      expect(loadSpy).toHaveBeenCalled();
    });

    it('cloneListItems no inserta si la lista origen está vacía', async () => {
      await facade.cloneListItems('src', 'dst');
      expect(items['addMany']).not.toHaveBeenCalled();
    });
  });
});
