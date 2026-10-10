import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShoppingListFacade } from './shopping-list.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ListItemsRepository } from '../repositories/list-items.repository';
import { ToastService } from '../services/ui/toast.service';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { NetworkStatusService } from '../services/infrastructure/network-status.service';
import { OfflineStoreService } from '../services/infrastructure/offline-store.service';
import { MutationError } from '../utils/mutation-error.utils';
import type { QueuedChange } from '../models/offline-queue.model';

const list = (items: any[] = [], familyId = 'fam-1') =>
  ({
    id: 'list-1',
    family_id: familyId,
    name: 'Semana',
    status: 'active',
    list_items: items,
  } as any);

const offlineError = new MutationError('offline');

describe('ShoppingListFacade', () => {
  let facade: ShoppingListFacade;
  let family: Record<string, ReturnType<typeof vi.fn>>;
  let lists: Record<string, ReturnType<typeof vi.fn>>;
  let items: Record<string, ReturnType<typeof vi.fn>>;
  let stopWatching: ReturnType<typeof vi.fn>;
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  let online: ReturnType<typeof signal<boolean>>;
  let network: { online: any; reportNetworkFailure: any; reportSuccess: any };
  let stored: { queue: QueuedChange[]; snapshot: any };
  let store: Record<string, ReturnType<typeof vi.fn>>;

  function create(): ShoppingListFacade {
    TestBed.configureTestingModule({
      providers: [
        ShoppingListFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ShoppingListsRepository, useValue: lists },
        { provide: ListItemsRepository, useValue: items },
        { provide: ToastService, useValue: toast },
        { provide: NetworkStatusService, useValue: network },
        { provide: OfflineStoreService, useValue: store },
      ],
    });
    return TestBed.inject(ShoppingListFacade);
  }

  beforeEach(() => {
    stopWatching = vi.fn();
    toast = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(), action: vi.fn() };
    family = {
      getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1'),
      findMine: vi.fn().mockResolvedValue({ id: 'fam-1', name: 'Los Pérez' }),
    };
    lists = {
      findLatestActive: vi.fn().mockResolvedValue(list()),
      findLastCompleted: vi.fn().mockResolvedValue(null),
      findTemplates: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'new-list' }),
      startActive: vi.fn().mockResolvedValue({ id: 'nueva', created: true }),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    items = {
      add: vi.fn().mockResolvedValue({ id: 'x', quantity: 1 }),
      addMany: vi.fn().mockResolvedValue(undefined),
      findByList: vi.fn().mockResolvedValue([]),
      changeQuantity: vi.fn().mockResolvedValue(1),
      setChecked: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      watchList: vi.fn(() => stopWatching),
    };
    online = signal(true);
    network = {
      online: online.asReadonly(),
      reportNetworkFailure: vi.fn(() => online.set(false)),
      reportSuccess: vi.fn(() => online.set(true)),
    };
    stored = { queue: [], snapshot: null };
    store = {
      loadQueue: vi.fn(() => stored.queue),
      saveQueue: vi.fn((q: QueuedChange[]) => (stored.queue = q)),
      loadSnapshot: vi.fn(() => stored.snapshot),
      saveSnapshot: vi.fn((l: any) => (stored.snapshot = l)),
      clear: vi.fn(),
    };
    facade = create();
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

    it('muestra la lista sin esperar el nombre de la familia (spec 0013, Q5)', async () => {
      family['findMine'].mockReturnValue(new Promise(() => {})); // nunca responde

      await facade.initialize();

      expect(facade.data()?.id).toBe('list-1');
    });

    it('guarda una foto de la lista para abrirla sin red', async () => {
      await facade.initialize();
      expect(store['saveSnapshot']).toHaveBeenCalledWith(list());
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

    it('toggleItemCheck revierte si el servidor lo rechaza', async () => {
      items['setChecked'].mockRejectedValue(new Error('rls'));

      await facade.toggleItemCheck('item-1', false);

      expect(facade.data()?.list_items[0].is_checked).toBe(false);
      expect(toast['error']).toHaveBeenCalled();
    });

    it('deleteItem quita el ítem al instante', async () => {
      await facade.deleteItem('item-1');

      expect(facade.data()?.list_items.map((i) => i.id)).toEqual(['item-2']);
      expect(items['remove']).toHaveBeenCalledWith('item-1');
    });

    describe('deshacer al quitar (spec 0013, Q27)', () => {
      beforeEach(() => {
        facade['_data'].set(
          list([
            { id: 'item-1', is_checked: false, quantity: 3, product: { id: 'p1', name: 'Leche' } },
            { id: 'item-2', is_checked: true, quantity: 2, product: { id: 'p2', name: 'Pan' } },
          ])
        );
      });

      it('avisa "Quitaste X" con "Deshacer"', async () => {
        await facade.deleteItem('item-1');

        expect(toast['action']).toHaveBeenCalledWith(
          'Quitaste Leche',
          'Deshacer',
          expect.any(Function)
        );
      });

      it('Deshacer lo vuelve a agregar con su cantidad', async () => {
        await facade.deleteItem('item-1');
        const undo = toast['action'].mock.calls[0][2];

        await undo();

        expect(items['add']).toHaveBeenCalledWith('list-1', 'p1', 3);
        expect(items['setChecked']).not.toHaveBeenCalled();
      });

      it('si estaba marcado, vuelve marcado', async () => {
        items['add'].mockResolvedValue({ id: 'nuevo', quantity: 2 });
        await facade.deleteItem('item-2');

        await toast['action'].mock.calls[0][2]();

        expect(items['add']).toHaveBeenCalledWith('list-1', 'p2', 2);
        expect(items['setChecked']).toHaveBeenCalledWith('nuevo', true);
      });

      it('si el borrado falla no ofrece deshacer', async () => {
        items['remove'].mockRejectedValue(new Error('rls'));

        await facade.deleteItem('item-1');

        expect(toast['action']).not.toHaveBeenCalled();
      });
    });

    it('updateItemQuantity manda el incremento y fija la cantidad que devuelve la BD (AC2)', async () => {
      items['changeQuantity'].mockResolvedValue(4); // otro miembro sumó 1 a la vez

      await facade.updateItemQuantity('item-2', 1);

      expect(items['changeQuantity']).toHaveBeenCalledWith('item-2', 1);
      expect(facade.data()?.list_items[1].quantity).toBe(4);
    });

    describe('unidad, cantidad y precio (spec 0019)', () => {
      it('editItem cambia al instante y lo guarda', async () => {
        await facade.editItem('item-1', { unit: 'kg', quantity: 1.5 });

        expect(facade.data()?.list_items[0]).toMatchObject({ unit: 'kg', quantity: 1.5 });
        expect(items['update']).toHaveBeenCalledWith('item-1', { unit: 'kg', quantity: 1.5 });
      });

      it('editItem vuelve a lo anterior si el servidor lo rechaza', async () => {
        items['update'].mockRejectedValue(new Error('rls'));

        await facade.editItem('item-1', { unit_price: 1990 });

        expect(facade.data()?.list_items[0].unit_price).toBeUndefined();
        expect(toast['error']).toHaveBeenCalled();
      });

      it('sin red queda en la cola y se envía al volver', async () => {
        online.set(false);
        await facade.editItem('item-2', { unit_price: 2490 });

        expect(items['update']).not.toHaveBeenCalled();
        expect(facade.data()?.list_items[1].unit_price).toBe(2490);
        expect(stored.queue).toEqual([
          { kind: 'patch', itemId: 'item-2', patch: { unit_price: 2490 } },
        ]);

        online.set(true);
        await facade.flushQueue();
        expect(items['update']).toHaveBeenCalledWith('item-2', { unit_price: 2490 });
        expect(stored.queue).toEqual([]);
      });

      it('la nota también va a la cola sin red y vuelve a null al borrarla (spec 0021 AC3)', async () => {
        online.set(false);
        await facade.editItem('item-1', { notes: 'sin lactosa' });
        expect(facade.data()?.list_items[0].notes).toBe('sin lactosa');
        await facade.editItem('item-1', { notes: null });
        expect(stored.queue).toEqual([{ kind: 'patch', itemId: 'item-1', patch: { notes: null } }]);

        online.set(true);
        await facade.flushQueue();
        expect(items['update']).toHaveBeenCalledWith('item-1', { notes: null });
      });

      it('un ítem que ya no está no hace nada', async () => {
        await facade.editItem('zz', { unit_price: 1 });
        expect(items['update']).not.toHaveBeenCalled();
      });
    });

    it('updateItemQuantity no baja de 1', async () => {
      await facade.updateItemQuantity('item-1', -1);

      expect(items['changeQuantity']).not.toHaveBeenCalled();
      expect(facade.data()?.list_items[0].quantity).toBe(1);
    });

    it('updateItemQuantity revierte si falla y avisa sin tapar la lista', async () => {
      items['changeQuantity'].mockRejectedValue(new Error('boom'));

      await facade.updateItemQuantity('item-2', 3);

      expect(facade.data()?.list_items[1].quantity).toBe(2);
      expect(facade.error()).toBeNull();
      expect(toast['error']).toHaveBeenCalled();
    });

    it.each([
      [
        'toggleItemCheck',
        (f: ShoppingListFacade) => f.toggleItemCheck('item-1', false),
        'setChecked',
      ],
      ['deleteItem', (f: ShoppingListFacade) => f.deleteItem('item-1'), 'remove'],
      ['addItem (nuevo)', (f: ShoppingListFacade) => f.addItem('list-1', 'p3'), 'add'],
    ])('%s: si falla, la lista sigue visible y se avisa con toast', async (_, act, repoMethod) => {
      items[repoMethod].mockRejectedValue(new Error('rls'));

      await act(facade);

      expect(facade.error()).toBeNull();
      expect(facade.data()).not.toBeNull();
      expect(toast['error']).toHaveBeenCalled();
    });

    it('addItem de un producto que ya está: suma al instante y deja la cantidad de la BD (AC1)', async () => {
      items['add'].mockResolvedValue({ id: 'item-2', quantity: 5 });

      await facade.addItem('list-1', 'p2', 3);

      expect(items['add']).toHaveBeenCalledWith('list-1', 'p2', 3);
      expect(facade.data()?.list_items).toHaveLength(2);
      expect(facade.data()?.list_items[1].quantity).toBe(5);
    });

    it('addItem dos veces seguidas (doble toque) llama dos veces a la BD, que las junta', async () => {
      await Promise.all([facade.addItem('list-1', 'p3'), facade.addItem('list-1', 'p3')]);

      expect(items['add']).toHaveBeenCalledTimes(2);
      expect(items['add']).toHaveBeenCalledWith('list-1', 'p3', 1);
    });
  });

  describe('errores tipados (AC5, AC6)', () => {
    beforeEach(async () => {
      lists['findLatestActive'].mockResolvedValue(
        list([{ id: 'item-1', is_checked: false, quantity: 1, product: { id: 'p1' } }])
      );
      await facade.initialize();
    });

    it('not_found de un ítem borrado por otro: revierte, avisa y refresca', async () => {
      items['setChecked'].mockRejectedValue(new MutationError('not_found'));
      lists['findLatestActive'].mockResolvedValue(list([]));

      await facade.toggleItemCheck('item-1', false);

      expect(toast['warning']).toHaveBeenCalledWith(
        'Ese producto ya no está en la lista',
        expect.any(String)
      );
      expect(facade.data()?.list_items).toEqual([]);
    });

    it('not_found porque me quitaron de la familia: avisa "Ya no eres parte de «X»" una vez y pasa a mi familia', async () => {
      items['setChecked'].mockRejectedValue(new MutationError('not_found'));
      family['getOrCreateFamilyId'].mockResolvedValue('fam-propia');
      lists['findLatestActive'].mockResolvedValue(null);

      await facade.toggleItemCheck('item-1', false);
      await facade.toggleItemCheck('item-1', false);

      const lost = toast['warning'].mock.calls.filter(([t]) => t.startsWith('Ya no eres parte'));
      expect(lost).toEqual([['Ya no eres parte de «Los Pérez»', expect.any(String)]]);
      expect(facade.familyChanged()).toBe(1);
      expect(facade.error()).toBe('NO_ACTIVE_LIST');
    });

    it('al refrescar (Realtime) descubre que lo quitaron: avisa y deja de mostrar la lista ajena', async () => {
      family['getOrCreateFamilyId'].mockResolvedValue('fam-propia');
      lists['findLatestActive'].mockResolvedValue(null);

      await items['watchList'].mock.calls[0][1]();
      await vi.waitFor(() => expect(facade.error()).toBe('NO_ACTIVE_LIST'));

      expect(toast['warning']).toHaveBeenCalledWith(
        'Ya no eres parte de «Los Pérez»',
        expect.any(String)
      );
    });

    it('list_not_active: la compra se cerró; avisa y recarga', async () => {
      items['changeQuantity'].mockRejectedValue(new MutationError('list_not_active'));
      lists['findLatestActive'].mockResolvedValue(null);

      await facade.updateItemQuantity('item-1', 1);

      expect(toast['warning']).toHaveBeenCalledWith('Esta compra ya se cerró', expect.any(String));
      expect(facade.error()).toBe('NO_ACTIVE_LIST');
    });
  });

  describe('sin conexión (AC7–AC10)', () => {
    beforeEach(async () => {
      lists['findLatestActive'].mockResolvedValue(
        list([
          { id: 'item-1', is_checked: false, quantity: 1, product: { id: 'p1' } },
          { id: 'item-2', is_checked: false, quantity: 2, product: { id: 'p2' } },
        ])
      );
      await facade.initialize();
      online.set(false);
      TestBed.tick();
    });

    it('marcar y cambiar cantidad se ven al instante y quedan en la cola persistida', async () => {
      await facade.toggleItemCheck('item-1', false);
      await facade.updateItemQuantity('item-2', 1);

      expect(facade.data()?.list_items[0].is_checked).toBe(true);
      expect(facade.data()?.list_items[1].quantity).toBe(3);
      expect(items['setChecked']).not.toHaveBeenCalled();
      expect(items['changeQuantity']).not.toHaveBeenCalled();
      expect(stored.queue).toEqual([
        { kind: 'check', itemId: 'item-1', checked: true },
        { kind: 'quantity', itemId: 'item-2', delta: 1 },
      ]);
      expect(facade.pendingChanges()).toBe(2);
    });

    it('un fallo de red a mitad de camino también encola y marca sin conexión', async () => {
      online.set(true);
      items['setChecked'].mockRejectedValue(offlineError);

      await facade.toggleItemCheck('item-1', false);

      expect(facade.data()?.list_items[0].is_checked).toBe(true);
      expect(stored.queue).toEqual([{ kind: 'check', itemId: 'item-1', checked: true }]);
      expect(facade.isOnline()).toBe(false);
    });

    it('al volver la red envía la cola en orden y refresca', async () => {
      await facade.toggleItemCheck('item-1', false);
      await facade.updateItemQuantity('item-2', 1);

      online.set(true);
      TestBed.tick();
      await vi.waitFor(() => expect(stored.queue).toEqual([]));

      expect(items['setChecked']).toHaveBeenCalledWith('item-1', true);
      expect(items['changeQuantity']).toHaveBeenCalledWith('item-2', 1);
      expect(items['setChecked'].mock.invocationCallOrder[0]).toBeLessThan(
        items['changeQuantity'].mock.invocationCallOrder[0]
      );
      expect(facade.pendingChanges()).toBe(0);
    });

    it('un cambio rechazado al sincronizar se descarta y se avisa una vez; los demás se aplican (AC9)', async () => {
      await facade.toggleItemCheck('item-1', false);
      await facade.updateItemQuantity('item-2', 1);
      items['setChecked'].mockRejectedValue(new MutationError('not_found'));

      await (online.set(true), facade.flushQueue());

      expect(items['changeQuantity']).toHaveBeenCalledWith('item-2', 1);
      expect(stored.queue).toEqual([]);
      expect(toast['warning']).toHaveBeenCalledTimes(1);
      expect(toast['warning']).toHaveBeenCalledWith(
        '1 cambio no se pudo guardar',
        expect.any(String)
      );
    });

    it('si se corta la red mientras envía, deja el resto en la cola', async () => {
      await facade.toggleItemCheck('item-1', false);
      await facade.updateItemQuantity('item-2', 1);
      items['changeQuantity'].mockRejectedValue(offlineError);

      await (online.set(true), facade.flushQueue());

      expect(stored.queue).toEqual([{ kind: 'quantity', itemId: 'item-2', delta: 1 }]);
      expect(toast['warning']).not.toHaveBeenCalled();
    });

    it('al reabrir la app sin red muestra la última lista con la cola aplicada (AC8)', async () => {
      stored.queue = [{ kind: 'check', itemId: 'item-2', checked: true }];
      stored.snapshot = list([{ id: 'item-2', is_checked: false, quantity: 2 }]);
      lists['findLatestActive'].mockRejectedValue(offlineError);
      TestBed.resetTestingModule();

      const reopened = create();
      await reopened.initialize();

      expect(reopened.error()).toBeNull();
      expect(reopened.data()?.list_items[0].is_checked).toBe(true);
      expect(reopened.pendingChanges()).toBe(1);
    });

    it.each([
      ['addItem', (f: ShoppingListFacade) => f.addItem('list-1', 'p3'), 'add'],
      ['deleteItem', (f: ShoppingListFacade) => f.deleteItem('item-1'), 'remove'],
      ['completeList', (f: ShoppingListFacade) => f.completeList('list-1', true), 'complete'],
      ['createList', (f: ShoppingListFacade) => f.createList('x'), 'startActive'],
      ['startListFrom', (f: ShoppingListFacade) => f.startListFrom('src'), 'startActive'],
    ])('%s no se hace sin red y avisa (AC10)', async (_, act, repoMethod) => {
      await act(facade);

      expect({ ...items, ...lists }[repoMethod]).not.toHaveBeenCalled();
      expect(toast['info']).toHaveBeenCalledWith('Sin conexión', expect.any(String));
      expect(facade.data()?.list_items).toHaveLength(2);
    });
  });

  describe('listas y plantillas', () => {
    it('createList crea (o reutiliza) la lista activa con start_active_list', async () => {
      await facade.createList('Lista de compras');

      expect(lists['startActive']).toHaveBeenCalledWith('Lista de compras');
      expect(lists['create']).not.toHaveBeenCalled();
    });

    it('createList desde "sin lista activa" muestra la lista nueva sin recargar', async () => {
      lists['findLatestActive'].mockResolvedValue(null);
      await facade.initialize();
      expect(facade.error()).toBe('NO_ACTIVE_LIST');

      lists['findLatestActive'].mockResolvedValue(list());
      await facade.createList('Lista de compras');

      expect(facade.error()).toBeNull();
      expect(facade.data()?.id).toBe('list-1');
    });

    it('createList: si falla, avisa con toast', async () => {
      lists['startActive'].mockRejectedValue(new Error('rls'));

      await facade.createList('Lista de compras');

      expect(toast['error']).toHaveBeenCalled();
    });

    it('completeList descartando pendientes: finaliza, avisa y queda sin lista activa', async () => {
      lists['complete'].mockResolvedValue(null);
      lists['findLatestActive'].mockResolvedValue(null);

      expect(await facade.completeList('list-1', false)).toBe(true);

      expect(lists['complete']).toHaveBeenCalledWith('list-1', false);
      expect(facade.error()).toBe('NO_ACTIVE_LIST');
      expect(toast['success']).toHaveBeenCalled();
    });

    it('completeList pasando pendientes: muestra la lista que los recibió', async () => {
      lists['complete'].mockResolvedValue('list-2');
      lists['findLatestActive'].mockResolvedValue({ ...list([{ id: 'p' }]), id: 'list-2' });

      expect(await facade.completeList('list-1', true)).toBe(true);

      expect(lists['complete']).toHaveBeenCalledWith('list-1', true);
      expect(facade.data()?.id).toBe('list-2');
      expect(items['watchList']).toHaveBeenCalledWith('list-2', expect.any(Function));
    });

    it('completeList recarga "Repetir última compra" con la compra recién finalizada', async () => {
      lists['complete'].mockResolvedValue(null);
      lists['findLatestActive'].mockResolvedValue(null);
      lists['findLastCompleted'].mockResolvedValue({
        ...list(),
        id: 'list-1',
        status: 'completed',
      });

      await facade.completeList('list-1', false);

      expect(facade.lastCompletedList()?.id).toBe('list-1');
    });

    it('completeList: si la RPC falla, avisa con toast y la lista sigue visible', async () => {
      facade['_data'].set(list([{ id: 'item-1' }]));
      lists['complete'].mockRejectedValue(new Error('boom'));

      expect(await facade.completeList('list-1', true)).toBe(false);

      expect(toast['error']).toHaveBeenCalled();
      expect(facade.data()?.id).toBe('list-1');
      expect(facade.error()).toBeNull();
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
      expect(items['addMany']).toHaveBeenCalledWith('tpl-1', [{ product_id: 'p1', quantity: 2 }]);
      expect(loadSpy).toHaveBeenCalled();
    });

    it('addProducts agrega varios a la lista activa de una vez (spec 0014)', async () => {
      facade['_data'].set(list([]));

      expect(await facade.addProducts(['p1', 'p2'])).toBe(true);

      expect(items['addMany']).toHaveBeenCalledWith('list-1', [
        { product_id: 'p1', quantity: 1 },
        { product_id: 'p2', quantity: 1 },
      ]);
    });

    it('addProducts sin lista o sin productos no hace nada', async () => {
      expect(await facade.addProducts(['p1'])).toBe(false);
      facade['_data'].set(list([]));
      expect(await facade.addProducts([])).toBe(false);
      expect(items['addMany']).not.toHaveBeenCalled();
    });

    describe('plantillas (spec 0013, Q28/Q30)', () => {
      beforeEach(() => {
        lists['renameTemplate'] = vi.fn().mockResolvedValue(undefined);
        lists['deleteTemplate'] = vi.fn().mockResolvedValue(undefined);
        facade.templates.set([
          { id: 'tpl-1', name: 'Asado', list_items: [] },
          { id: 'tpl-2', name: 'Mensual', list_items: [] },
        ] as any);
      });

      it('saveAsTemplate confirma con toast y recorta el nombre', async () => {
        lists['create'].mockResolvedValue({ id: 'tpl-9' });
        vi.spyOn(facade, 'loadTemplates').mockResolvedValue();

        expect(await facade.saveAsTemplate('list-1', '  Once  ')).toBe(true);

        expect(lists['create']).toHaveBeenCalledWith(expect.objectContaining({ name: 'Once' }));
        expect(toast['success']).toHaveBeenCalledWith('Plantilla guardada', expect.any(String));
      });

      it('saveAsTemplate sin nombre avisa y no crea nada', async () => {
        expect(await facade.saveAsTemplate('list-1', '   ')).toBe(false);

        expect(lists['create']).not.toHaveBeenCalled();
        expect(toast['warning']).toHaveBeenCalled();
      });

      it('renameTemplate cambia el nombre al instante y lo guarda', async () => {
        expect(await facade.renameTemplate('tpl-1', ' Asado domingo ')).toBe(true);

        expect(facade.templates()[0].name).toBe('Asado domingo');
        expect(lists['renameTemplate']).toHaveBeenCalledWith('tpl-1', 'Asado domingo');
      });

      it('renameTemplate con nombre vacío avisa y no toca nada', async () => {
        expect(await facade.renameTemplate('tpl-1', '')).toBe(false);

        expect(lists['renameTemplate']).not.toHaveBeenCalled();
        expect(toast['warning']).toHaveBeenCalled();
      });

      it('renameTemplate revierte si falla', async () => {
        lists['renameTemplate'].mockRejectedValue(new Error('rls'));

        expect(await facade.renameTemplate('tpl-1', 'Otra')).toBe(false);

        expect(facade.templates()[0].name).toBe('Asado');
        expect(toast['error']).toHaveBeenCalled();
      });

      it('deleteTemplate la quita al instante; si falla vuelve', async () => {
        expect(await facade.deleteTemplate('tpl-1')).toBe(true);
        expect(facade.templates().map((t) => t.id)).toEqual(['tpl-2']);
        expect(lists['deleteTemplate']).toHaveBeenCalledWith('tpl-1');

        lists['deleteTemplate'].mockRejectedValue(new Error('rls'));
        expect(await facade.deleteTemplate('tpl-2')).toBe(false);
        expect(facade.templates().map((t) => t.id)).toEqual(['tpl-2']);
      });
    });

    it('startListFrom: sin lista activa, crea la lista y copia los ítems de la compra elegida (0010)', async () => {
      lists['findLatestActive'].mockResolvedValue(null);
      await facade.initialize();
      items['findByList'].mockResolvedValue([{ product_id: 'p1', quantity: 2 }]);
      lists['findLatestActive'].mockResolvedValue(list());

      expect(await facade.startListFrom('ultima')).toBe(true);

      expect(lists['startActive']).toHaveBeenCalledWith('Lista de compras');
      expect(items['findByList']).toHaveBeenCalledWith('ultima');
      expect(items['addMany']).toHaveBeenCalledWith('nueva', [{ product_id: 'p1', quantity: 2 }]);
      expect(facade.error()).toBeNull();
      expect(facade.data()?.id).toBe('list-1');
    });

    describe('presupuesto (spec 0025 D2)', () => {
      beforeEach(async () => {
        lists['setBudget'] = vi.fn().mockResolvedValue(undefined);
        await facade.initialize();
      });

      it('lo fija al instante y lo guarda; null lo quita', async () => {
        expect(await facade.setBudget(60000)).toBe(true);
        expect(facade.data()?.budget).toBe(60000);
        expect(lists['setBudget']).toHaveBeenCalledWith('list-1', 60000);

        await facade.setBudget(null);
        expect(lists['setBudget']).toHaveBeenLastCalledWith('list-1', null);
        expect(facade.data()?.budget).toBeNull();
      });

      it('si falla, vuelve al anterior y avisa', async () => {
        lists['setBudget'].mockRejectedValue(new Error('rls'));
        expect(await facade.setBudget(60000)).toBe(false);
        expect(facade.data()?.budget ?? null).toBeNull();
        expect(toast['error']).toHaveBeenCalled();
      });
    });

    describe('addToList (spec 0023 D1)', () => {
      const bought = [
        { product_id: 'p1', quantity: 2 },
        { product_id: 'p2', quantity: 1 },
      ];

      it('agrega a la lista activa (o la que crea) y devuelve cuántos', async () => {
        lists['startActive'].mockResolvedValue({ id: 'list-1', created: false });
        expect(await facade.addToList(bought)).toBe(2);
        expect(items['addMany']).toHaveBeenCalledWith('list-1', bought);
        expect(facade.data()?.id).toBe('list-1');
      });

      it('sin productos no hace nada; si falla, avisa y devuelve null', async () => {
        expect(await facade.addToList([])).toBe(0);
        expect(lists['startActive']).not.toHaveBeenCalled();

        items['addMany'].mockRejectedValue(new Error('boom'));
        expect(await facade.addToList(bought)).toBeNull();
        expect(toast['error']).toHaveBeenCalled();
      });
    });

    it('startListFrom: si ya había lista activa (doble toque) no copia otra vez (AC3)', async () => {
      lists['startActive'].mockResolvedValue({ id: 'list-1', created: false });

      expect(await facade.startListFrom('ultima')).toBe(true);

      expect(items['addMany']).not.toHaveBeenCalled();
      expect(facade.data()?.id).toBe('list-1');
    });

    it('startListFrom: si falla copiar, avisa y deja la lista creada (vacía) visible', async () => {
      lists['findLatestActive'].mockResolvedValue(null);
      await facade.initialize();
      items['findByList'].mockRejectedValue(new Error('boom'));
      lists['findLatestActive'].mockResolvedValue(list());

      expect(await facade.startListFrom('ultima')).toBe(false);

      expect(toast['error']).toHaveBeenCalled();
      expect(facade.data()?.id).toBe('list-1');
    });

    it('startListFrom: si falla crear la lista, avisa y no intenta copiar', async () => {
      lists['startActive'].mockRejectedValue(new Error('rls'));

      expect(await facade.startListFrom('ultima')).toBe(false);

      expect(items['findByList']).not.toHaveBeenCalled();
      expect(toast['error']).toHaveBeenCalled();
    });

    it('cloneListItems no inserta si la lista origen está vacía', async () => {
      await facade.cloneListItems('src', 'dst');
      expect(items['addMany']).not.toHaveBeenCalled();
    });
  });

  describe('modelo de compra (spec 0012)', () => {
    beforeEach(async () => {
      lists['findLatestActive'].mockResolvedValue(
        list([
          { id: 'item-1', is_checked: false, quantity: 1, product: { id: 'p1' } },
          { id: 'item-2', is_checked: false, quantity: 2, product: { id: 'p2' } },
        ])
      );
      await facade.initialize();
      items['clearList'] = vi.fn().mockResolvedValue(undefined);
    });

    it('hasChecked sigue lo marcado', async () => {
      expect(facade.hasChecked()).toBe(false);
      await facade.toggleItemCheck('item-1', false);
      expect(facade.hasChecked()).toBe(true);
    });

    it('clearList vacía la lista al instante y en la BD', async () => {
      expect(await facade.clearList()).toBe(true);

      expect(items['clearList']).toHaveBeenCalledWith('list-1');
      expect(facade.data()?.list_items).toEqual([]);
    });

    it('clearList: si falla, vuelve la lista y avisa', async () => {
      items['clearList'].mockRejectedValue(new Error('boom'));

      expect(await facade.clearList()).toBe(false);

      expect(facade.data()?.list_items).toHaveLength(2);
      expect(toast['error']).toHaveBeenCalled();
    });

    it('clearList no se hace sin red', async () => {
      online.set(false);
      expect(await facade.clearList()).toBe(false);
      expect(items['clearList']).not.toHaveBeenCalled();
    });

    it('completeList con nothing_checked (otro miembro desmarcó) avisa que hay que marcar', async () => {
      lists['complete'].mockRejectedValue(new MutationError('nothing_checked'));

      expect(await facade.completeList('list-1', true)).toBe(false);

      expect(toast['warning']).toHaveBeenCalledWith(
        'Marca lo que compraste para finalizar',
        expect.any(String)
      );
      expect(facade.data()?.id).toBe('list-1');
    });

    it('la lista nueva se llama "Lista de compras"', async () => {
      lists['findLatestActive'].mockResolvedValue(null);
      await facade.startListFrom('src');
      expect(lists['startActive']).toHaveBeenCalledWith('Lista de compras');
    });
  });

  describe('cierre de sesión', () => {
    it('vacía lista, plantillas, última compra y cola, y deja de observar Realtime', async () => {
      await facade.initialize();
      lists['findLastCompleted'].mockResolvedValue(list());
      lists['findTemplates'].mockResolvedValue([list()]);
      await facade.loadTemplates();
      online.set(false);
      facade['_data'].set(list([{ id: 'item-1', is_checked: false, quantity: 1 }]));
      await facade.toggleItemCheck('item-1', false);

      TestBed.inject(SessionScopeService).clear();

      expect(facade.data()).toBeNull();
      expect(facade.templates()).toEqual([]);
      expect(facade.lastCompletedList()).toBeNull();
      expect(facade.pendingChanges()).toBe(0);
      expect(stopWatching).toHaveBeenCalled();
    });
  });
});
