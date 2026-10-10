import { TestBed } from '@angular/core/testing';
import { ActiveListPage, LONG_PRESS_MS, PRICE_PROMPT_MS } from './active-list.page';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { ConfirmationService } from 'primeng/api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef, signal } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FamilyFacade } from '@core/facades/family.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import { RestockFacade } from '@core/facades/restock.facade';
import { ShareService } from '@core/services/share.service';
import { WakeLockService } from '@core/services/wake-lock.service';
import { ToastService } from '@core/services/ui/toast.service';

describe('ActiveListPage', () => {
  let component: ActiveListPage;
  let mockFacade: any;
  let alertController: { create: ReturnType<typeof vi.fn> };
  let familyFacade: any;
  let restock: any;
  let closeFacade: { start: ReturnType<typeof vi.fn> };
  let nav: { navigateForward: ReturnType<typeof vi.fn> };
  let share: { openWhatsApp: ReturnType<typeof vi.fn> };
  let wake: { keepScreenOn: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  let toast: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    alertController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn(),
        onDidDismiss: () => new Promise(() => {}),
        querySelector: vi.fn(),
      }),
    };
    closeFacade = { start: vi.fn() };
    nav = { navigateForward: vi.fn() };
    share = { openWhatsApp: vi.fn().mockResolvedValue('opened') };
    wake = { keepScreenOn: vi.fn().mockResolvedValue(undefined), release: vi.fn() };
    toast = { info: vi.fn(), error: vi.fn() };
    // Mock del Facade y su Signal 'data'
    mockFacade = {
      data: signal(null),
      isLoading: signal(false),
      error: signal(null),
      initialize: vi.fn(),
      loadTemplates: vi.fn(),
      dispose: vi.fn(),
      toggleItemCheck: vi.fn(),
      deleteItem: vi.fn(),
      completeList: vi.fn(),
      startListFrom: vi.fn().mockResolvedValue(true),
      cloneListItems: vi.fn(),
      lastCompletedList: signal(null),
      templates: signal([]),
      updateItemQuantity: vi.fn(),
      isOnline: signal(true),
      pendingChanges: signal(0),
      familyChanged: signal(0),
      hasChecked: signal(false),
      clearList: vi.fn().mockResolvedValue(true),
      createList: vi.fn(),
      saveAsTemplate: vi.fn().mockResolvedValue(true),
      addItem: vi.fn().mockResolvedValue(undefined),
      addProducts: vi.fn().mockResolvedValue(true),
      renameTemplate: vi.fn().mockResolvedValue(true),
      deleteTemplate: vi.fn().mockResolvedValue(true),
    };
    restock = {
      data: signal(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      snooze: vi.fn().mockResolvedValue(true),
    };
    familyFacade = {
      currentFamily: signal(null),
      hasOtherMembers: signal(true),
      memberNames: signal(
        new Map([
          ['u1', 'Tú'],
          ['u2', 'beto'],
        ])
      ),
      loadMyFamily: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ActiveListPage,
        { provide: ShoppingListFacade, useValue: mockFacade },
        { provide: FamilyFacade, useValue: familyFacade },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } },
        { provide: AlertController, useValue: alertController },
        { provide: PurchaseCloseFacade, useValue: closeFacade },
        { provide: RestockFacade, useValue: restock },
        { provide: NavController, useValue: nav },
        { provide: ShareService, useValue: share },
        { provide: WakeLockService, useValue: wake },
        { provide: ToastService, useValue: toast },
        // La página se instancia como provider (sin render), así que no hay CDR de vista.
        { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      ],
    });

    component = TestBed.inject(ActiveListPage);
  });

  it('should calculate KPIs correctly via Computed Signals', () => {
    // Escenario 1: Sin data
    expect(component.listSummary()).toEqual({
      total: 0,
      checked: 0,
      pending: 0,
      estimatedCost: 0,
      cartCost: 0,
    });

    // Escenario 2: Lista con ítems mixtos y precios
    mockFacade.data.set({
      id: 'list-1',
      list_items: [
        { id: '1', is_checked: false, quantity: 2, product: { last_price: 1000 } },
        { id: '2', is_checked: true, quantity: 1, product: { last_price: 500 } },
        { id: '3', is_checked: false, quantity: 3, product: null }, // Producto sin precio guardado
      ],
    });

    const kpis = component.listSummary();

    expect(kpis.total).toBe(3); // 3 tipos de productos
    expect(kpis.checked).toBe(1); // 1 tickeado
    expect(kpis.pending).toBe(2); // 2 pendientes

    // Costo estimado: (2 * 1000) + (1 * 500) + (3 * 0) = 2500
    expect(kpis.estimatedCost).toBe(2500);
  });

  describe('lista para el súper (spec 0019)', () => {
    const item = (id: string, category: string | null, over: object = {}) => ({
      id,
      created_at: `2026-10-10T10:0${id}:00Z`,
      is_checked: false,
      quantity: 1,
      product: { id: `p${id}`, name: `P${id}`, category, last_price: 1000 },
      ...over,
    });

    afterEach(() => localStorage.removeItem('shop.list.view.v1'));

    beforeEach(() => {
      mockFacade.editItem = vi.fn().mockResolvedValue(undefined);
      mockFacade.data.set({
        id: 'list-1',
        list_items: [
          item('1', 'Limpieza'),
          item('2', 'Frutas y verduras', { is_checked: true }),
          item('3', 'Frutas y verduras'),
        ],
      });
    });

    it('por pasillo: encabezados en el orden del súper y marcados al final (D3, AC2)', () => {
      expect(component.byAisle()).toBe(true);
      expect(component.rows().map((r) => r.aisle ?? r.item!.id)).toEqual([
        'Frutas y verduras',
        '3',
        '2',
        'Limpieza',
        '1',
      ]);
      expect(component.rows()[0].pending).toBe(1);
    });

    it('"Como la agregué" quita los encabezados y se recuerda en el teléfono', () => {
      component.setView(false);
      expect(component.rows().map((r) => r.item!.id)).toEqual(['1', '3', '2']);
      expect(localStorage.getItem('shop.list.view.v1')).toBe('added');
    });

    it('el total estimado usa el precio anotado al marcar (D5, AC4)', () => {
      mockFacade.data.set({
        id: 'list-1',
        list_items: [
          item('1', null, { quantity: 1.5, unit: 'kg', unit_price: 2000 }),
          item('2', null),
        ],
      });
      expect(component.listSummary().estimatedCost).toBe(4000);
      expect(component.priceUnit(mockFacade.data().list_items[0])).toBe('/kg');
    });

    it('al marcar pregunta el precio unos segundos y lo guarda si se escribe (D5)', () => {
      vi.useFakeTimers();
      component.toggleItem('1', false);
      expect(component.pricePrompt()).toMatchObject({ id: '1', name: 'P1' });

      component.savePrompt('$1.990');
      expect(mockFacade.editItem).toHaveBeenCalledWith('1', { unit_price: 1990 });
      expect(component.pricePrompt()).toBeNull();

      component.toggleItem('3', false);
      vi.advanceTimersByTime(PRICE_PROMPT_MS);
      expect(component.pricePrompt()).toBeNull(); // se ignora sin bloquear
      vi.useRealTimers();
    });

    it('mientras se escribe el precio no se cierra; vacío no guarda nada', () => {
      vi.useFakeTimers();
      component.toggleItem('1', false);
      component.holdPrompt();
      vi.advanceTimersByTime(PRICE_PROMPT_MS * 2);
      expect(component.pricePrompt()).not.toBeNull();
      component.savePrompt('');
      expect(mockFacade.editItem).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('no pregunta si ya tiene precio anotado, ni al desmarcar', () => {
      mockFacade.data.set({ id: 'list-1', list_items: [item('1', null, { unit_price: 900 })] });
      component.toggleItem('1', false);
      expect(component.pricePrompt()).toBeNull();
      component.toggleItem('1', true);
      expect(component.pricePrompt()).toBeNull();
    });

    it('el detalle del ítem guarda unidad, cantidad y precio (D4, AC3)', () => {
      component.openDetail(mockFacade.data().list_items[0]);
      expect(component.detail()).toEqual({
        id: '1',
        productId: 'p1',
        name: 'P1',
        quantity: 1,
        unit: 'un',
        unitPrice: null,
        notes: null,
        addedBy: null,
      });

      component.saveDetail({ itemId: '1', patch: { unit: 'kg', quantity: 1.5 } });
      expect(mockFacade.editItem).toHaveBeenCalledWith('1', { unit: 'kg', quantity: 1.5 });
      expect(component.detail()).toBeNull();
    });
  });

  describe('nota y detalle del ítem (spec 0021)', () => {
    const press = (x = 10, y = 10) => ({ clientX: x, clientY: y } as PointerEvent);
    const item = {
      id: 'i1',
      created_at: '2026-10-10T10:00:00Z',
      is_checked: false,
      quantity: 1,
      notes: 'sin lactosa',
      product: { id: 'p1', name: 'Leche', category: 'Lácteos y huevos' },
    };

    beforeEach(() => {
      vi.useFakeTimers();
      mockFacade.data.set({ id: 'list-1', list_items: [item] });
    });
    afterEach(() => vi.useRealTimers());

    it('la pulsación larga abre el detalle con la nota y no marca (D3, AC4)', () => {
      component.startPress(item as any, press());
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(component.detail()).toMatchObject({ id: 'i1', notes: 'sin lactosa', productId: 'p1' });

      component.tapItem('i1', false); // el click que llega al soltar
      expect(mockFacade.toggleItemCheck).not.toHaveBeenCalled();

      component.tapItem('i1', false); // el siguiente toque sí marca
      expect(mockFacade.toggleItemCheck).toHaveBeenCalledWith('i1', false);
    });

    it('un toque corto marca; moverse cancela la pulsación larga', () => {
      component.startPress(item as any, press());
      vi.advanceTimersByTime(200);
      component.cancelPress();
      component.tapItem('i1', false);
      expect(mockFacade.toggleItemCheck).toHaveBeenCalledWith('i1', false);
      expect(component.detail()).toBeNull();

      component.startPress(item as any, press(10, 10));
      component.movePress(press(40, 10)); // deslizar para borrar
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(component.detail()).toBeNull();
    });

    it('"Ver ficha del producto" cierra el detalle y abre la ficha (D4, AC5)', () => {
      component.openDetail(item as any);
      component.openProduct('p1');
      expect(component.detail()).toBeNull();
      expect(nav.navigateForward).toHaveBeenCalledWith('/app/products/p1');
    });
  });

  describe('quién marcó', () => {
    it('muestra el nombre de quien marcó cuando la familia tiene más de un miembro', () => {
      expect(component.checkedByName({ is_checked: true, checked_by: 'u2' } as any)).toBe('beto');
      expect(component.checkedByName({ is_checked: true, checked_by: 'u1' } as any)).toBe('Tú');
    });

    it('no muestra nada si el ítem no está marcado o no se sabe quién fue', () => {
      expect(component.checkedByName({ is_checked: false, checked_by: 'u2' } as any)).toBeNull();
      expect(component.checkedByName({ is_checked: true } as any)).toBeNull();
      expect(component.checkedByName({ is_checked: true, checked_by: 'u9' } as any)).toBeNull();
    });

    it('en una familia de una persona no muestra nombres', () => {
      familyFacade.hasOtherMembers.set(false);
      expect(component.checkedByName({ is_checked: true, checked_by: 'u1' } as any)).toBeNull();
    });

    it('al entrar carga la familia si todavía no está', () => {
      component.ngOnInit();
      expect(familyFacade.loadMyFamily).toHaveBeenCalled();
    });
  });

  describe('en el súper (spec 0025)', () => {
    const it2 = (id: string, category: string, is_checked: boolean, price = 1000) => ({
      id,
      created_at: `2026-10-10T10:0${id}:00Z`,
      is_checked,
      quantity: 1,
      product: { id: `p${id}`, name: `P${id}`, category, last_price: price },
    });
    beforeEach(() => {
      mockFacade.setBudget = vi.fn().mockResolvedValue(true);
      mockFacade.data.set({
        id: 'list-1',
        budget: null,
        list_items: [
          it2('1', 'Despensa', false, 2000),
          it2('2', 'Despensa', true, 1500),
          it2('3', 'Panadería', true, 1000),
        ],
      });
    });

    it('modo súper: solo pendientes; "En el carro" muestra lo marcado; pantalla encendida (D1)', async () => {
      component.enterSuperMode();
      expect(wake.keepScreenOn).toHaveBeenCalled();
      expect(component.rows().map((r) => r.key)).toEqual(['aisle:Despensa', '1']);
      expect(component.cartCount()).toBe(2);

      component.showCart.set(true);
      expect(component.rows().map((r) => r.key)).toEqual(['aisle:Despensa', '1', 'cart', '2', '3']);

      component.exitSuperMode();
      expect(component.superMode()).toBe(false);
      expect(component.showCart()).toBe(false);
      expect(wake.release).toHaveBeenCalled();
    });

    it('dejar la pestaña sale del modo súper (D1)', () => {
      component.enterSuperMode();
      component.ionViewWillLeave();
      expect(component.superMode()).toBe(false);
    });

    it('presupuesto: estimado de $Y, y en modo súper el carro (D2)', () => {
      expect(component.budgetView()).toBeNull();
      mockFacade.data.update((l: any) => ({ ...l, budget: 4000 }));
      expect(component.budgetView()).toEqual({
        label: 'Total estimado',
        amount: 4500,
        budget: 4000,
        percent: 100,
        over: 500,
      });
      component.enterSuperMode();
      expect(component.budgetView()).toMatchObject({
        label: 'En el carro',
        amount: 2500,
        over: null,
      });
    });

    it('el monto del presupuesto acepta "$60.000"; vacío lo quita (D2)', () => {
      expect(component.parseBudget('$60.000')).toBe(60000);
      expect(component.parseBudget(' 45000 ')).toBe(45000);
      expect(component.parseBudget('')).toBeNull();
      expect(component.parseBudget('0')).toBeUndefined();
      expect(component.parseBudget('mucho')).toBeUndefined();
    });
  });

  describe('lista compartida (spec 0024)', () => {
    it('"Pedido por" en pendientes que agregó otro miembro (D1)', () => {
      expect(component.addedByLabel({ is_checked: false, added_by: 'u2' } as any)).toBe(
        'Pedido por beto'
      );
      expect(component.addedByLabel({ is_checked: false, added_by: 'u1' } as any)).toBeNull();
      expect(component.addedByLabel({ is_checked: true, added_by: 'u2' } as any)).toBeNull();
      expect(component.addedByLabel({ is_checked: false } as any)).toBeNull();
      familyFacade.hasOtherMembers.set(false);
      expect(component.addedByLabel({ is_checked: false, added_by: 'u2' } as any)).toBeNull();
    });

    it('el detalle dice quién lo agregó (D1)', () => {
      const item = (added_by?: string) =>
        ({ id: 'i', is_checked: false, quantity: 1, added_by, product: { name: 'Leche' } } as any);
      component.openDetail(item('u2'));
      expect(component.detail()?.addedBy).toBe('Lo agregó beto');
      component.openDetail(item('u1'));
      expect(component.detail()?.addedBy).toBe('Lo agregaste tú');
      component.openDetail(item());
      expect(component.detail()?.addedBy).toBeNull();
    });

    it('"Compartir" manda los pendientes a WhatsApp; si se copió, avisa (D2)', async () => {
      mockFacade.data.set({
        id: 'list-1',
        list_items: [
          {
            id: '1',
            created_at: '2026-10-10T10:00:00Z',
            is_checked: false,
            quantity: 2,
            product: { name: 'Leche', category: 'Lácteos y huevos' },
          },
        ],
      });
      expect(component.shareText()).toBe('*Lista de compras*\n_Lácteos y huevos_\n• Leche × 2');

      await component.share();
      expect(share.openWhatsApp).toHaveBeenCalledWith(component.shareText());
      expect(toast.info).not.toHaveBeenCalled();

      share.openWhatsApp.mockResolvedValue('copied');
      await component.share();
      expect(toast.info).toHaveBeenCalledWith(
        'Lista copiada',
        'Pégala en WhatsApp o donde quieras.'
      );
    });
  });

  describe('finalizar compra', () => {
    const conPendiente = {
      id: 'list-1',
      list_items: [
        { id: '1', is_checked: true, quantity: 1 },
        { id: '2', is_checked: false, quantity: 1 },
      ],
    };
    const alertAt = (n: number) => alertController.create.mock.calls[n][0];
    const press = async (n: number, text: RegExp) => {
      await vi.waitFor(() => expect(alertController.create.mock.calls.length).toBeGreaterThan(n));
      const b = (alertAt(n).buttons as any[]).find((x) => text.test(x.text));
      b.handler();
      return b;
    };

    it('ofrece tres caminos: escanear boleta, sin boleta y ahora no', async () => {
      mockFacade.data.set(conPendiente);
      void component.completeList('list-1');
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalled());

      const texts = (alertAt(0).buttons as any[]).map((b) => b.text);
      expect(texts).toEqual(['Escanear boleta', 'Sin boleta', 'Ahora no', 'Cancelar']);
    });

    it('"Ahora no" con pendientes: pregunta qué hacer con ellos y cierra como hoy', async () => {
      mockFacade.data.set(conPendiente);
      const done = component.completeList('list-1');

      await press(0, /ahora no/i);
      await press(1, /pasar/i);
      await done;

      expect(alertAt(1).message).toContain('1 pendiente');
      expect(mockFacade.completeList).toHaveBeenCalledWith('list-1', true);
    });

    it('"Sin boleta" va directo al cierre: los pendientes se eligen allí, no se pregunta dos veces (Q29)', async () => {
      mockFacade.data.set(conPendiente);
      const done = component.completeList('list-1');

      await press(0, /sin boleta/i);
      await done;

      expect(alertController.create).toHaveBeenCalledTimes(1);
      expect(closeFacade.start).toHaveBeenCalledWith(conPendiente, true, 'manual');
      expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
      expect(mockFacade.completeList).not.toHaveBeenCalled();
    });

    it('"Escanear boleta" tampoco pregunta por pendientes', async () => {
      mockFacade.data.set(conPendiente);
      const done = component.completeList('list-1');

      await press(0, /escanear/i);
      await done;

      expect(alertController.create).toHaveBeenCalledTimes(1);
      expect(closeFacade.start).toHaveBeenCalledWith(conPendiente, true, 'receipt');
    });

    it('cancelar no cierra nada', async () => {
      mockFacade.data.set(conPendiente);
      const done = component.completeList('list-1');

      const b = await press(0, /cancelar/i);
      await done;

      expect(b.role).toBe('cancel');
      expect(mockFacade.completeList).not.toHaveBeenCalled();
      expect(closeFacade.start).not.toHaveBeenCalled();
    });
  });

  describe('integridad (spec 0011)', () => {
    const click = { stopPropagation: vi.fn() } as unknown as Event;

    it('los botones de cantidad mandan el incremento, no el total', () => {
      component.updateQuantity('i1', 3, 1, click);
      component.updateQuantity('i1', 3, -1, click);

      expect(mockFacade.updateItemQuantity).toHaveBeenNthCalledWith(1, 'i1', 1);
      expect(mockFacade.updateItemQuantity).toHaveBeenNthCalledWith(2, 'i1', -1);
    });

    it('no baja de 1', () => {
      component.updateQuantity('i1', 1, -1, click);
      expect(mockFacade.updateItemQuantity).not.toHaveBeenCalled();
    });

    it('"Vaciar lista" pide confirmación y vacía (spec 0012)', async () => {
      const done = component.clearList();
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalled());
      const opts = alertController.create.mock.calls[0][0];
      expect(opts.header).toBe('¿Vaciar la lista?');
      (opts.buttons as any[]).find((b) => b.text === 'Vaciar').handler();
      await done;

      expect(mockFacade.clearList).toHaveBeenCalled();
    });

    it('"Vaciar lista" cancelado no vacía', async () => {
      const done = component.clearList();
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalled());
      (alertController.create.mock.calls[0][0].buttons as any[])
        .find((b) => b.text === 'Cancelar')
        .handler();
      await done;

      expect(mockFacade.clearList).not.toHaveBeenCalled();
    });

    it('una lista nueva se llama "Lista de compras"', async () => {
      await component.createNewList();
      expect(mockFacade.createList).toHaveBeenCalledWith('Lista de compras');
    });

    it('si me pasan a otra familia, recarga los datos de la familia', () => {
      TestBed.tick();
      expect(familyFacade.loadMyFamily).not.toHaveBeenCalled();

      mockFacade.familyChanged.set(1);
      TestBed.tick();

      expect(familyFacade.loadMyFamily).toHaveBeenCalledTimes(1);
    });
  });

  describe('plantillas y pista de borrar (spec 0013)', () => {
    const opts = (n: number) => alertController.create.mock.calls[n][0];
    const button = (n: number, text: string) =>
      (opts(n).buttons as any[]).find((b) => b.text === text);
    const tpl = { id: 't1', name: 'Asado', list_items: [] } as any;

    beforeEach(() => {
      mockFacade.data.set({ id: 'list-1', list_items: [{ id: 'i1' }] });
      mockFacade.templates.set([tpl, { id: 't2', name: 'Mensual', list_items: [] }]);
    });

    it('guardar plantilla: sin nombre la alerta queda abierta; con nombre guarda (Q30)', async () => {
      await component.saveTemplate();
      const save = button(0, 'Guardar');

      expect(save.handler({ name: '  ' })).toBe(false);
      expect(save.handler({ name: ' Asado ' })).toBe(true);
      expect(mockFacade.saveAsTemplate).toHaveBeenLastCalledWith('list-1', 'Asado');
    });

    it('renombrar una plantilla desde "⋯" (Q28)', async () => {
      const done = component.manageTemplate(tpl);
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalledTimes(1));
      button(0, 'Renombrar').handler();
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalledTimes(2));
      await done;

      expect(opts(1).inputs[0].value).toBe('Asado');
      button(1, 'Guardar').handler({ name: 'Asado domingo' });
      expect(mockFacade.renameTemplate).toHaveBeenCalledWith('t1', 'Asado domingo');
    });

    it('borrar una plantilla pide confirmación (Q28)', async () => {
      const done = component.manageTemplate(tpl);
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalledTimes(1));
      button(0, 'Borrar').handler();
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalledTimes(2));
      expect(opts(1).header).toBe('¿Borrar la plantilla?');
      button(1, 'Borrar').handler();
      await done;

      expect(mockFacade.deleteTemplate).toHaveBeenCalledWith('t1');
    });

    it('agregar una plantilla a la lista en curso suma sus productos (Q28)', async () => {
      const done = component.addTemplateToList();
      await vi.waitFor(() => expect(alertController.create).toHaveBeenCalled());
      expect((opts(0).buttons as any[]).map((b) => b.text)).toEqual([
        'Asado',
        'Mensual',
        'Cancelar',
      ]);
      button(0, 'Mensual').handler();
      await done;

      expect(mockFacade.cloneListItems).toHaveBeenCalledWith('t2', 'list-1');
    });

    it('la pista "desliza para quitar" se va después de quitar un producto (Q27)', () => {
      localStorage.removeItem('shop.hint.swipe-delete.v1');
      TestBed.resetTestingModule();
      expect(component.swipeHintSeen()).toBe(false);

      component.deleteItem('i1');

      expect(mockFacade.deleteItem).toHaveBeenCalledWith('i1');
      expect(component.swipeHintSeen()).toBe(true);
      expect(localStorage.getItem('shop.hint.swipe-delete.v1')).toBe('1');
    });
  });

  describe('te puede faltar (spec 0014)', () => {
    const old = new Date(Date.now() - 20 * 86_400_000).toISOString();
    beforeEach(() => {
      restock.data.set({
        products: [
          { id: 'p1', name: 'Leche', last_purchased_at: old },
          { id: 'p2', name: 'Pan', last_purchased_at: old },
        ],
        stats: [],
      });
      mockFacade.data.set({ id: 'list-1', list_items: [{ id: 'i1', product: { id: 'p2' } }] });
    });

    it('sugiere lo que toca reponer y no está en la lista', () => {
      expect(component.suggestions().map((s) => s.product.id)).toEqual(['p1']);
    });

    it('al entrar carga las sugerencias', () => {
      component.ngOnInit();
      expect(restock.initialize).toHaveBeenCalled();
    });

    it('+ agrega a la lista; "Agregar todas" agrega varias', () => {
      component.addSuggested('p1');
      expect(mockFacade.addItem).toHaveBeenCalledWith('list-1', 'p1');

      component.addAllSuggested(['p1', 'p3']);
      expect(mockFacade.addProducts).toHaveBeenCalledWith(['p1', 'p3']);
    });

    it('"Todavía tengo" pospone un intervalo', () => {
      const s = component.suggestions()[0];
      component.snoozeSuggestion(s);

      const [id, until] = restock.snooze.mock.calls[0];
      expect(id).toBe('p1');
      const days = (new Date(until).getTime() - Date.now()) / 86_400_000;
      expect(Math.round(days)).toBe(s.intervalDays);
    });
  });

  describe('atajos para empezar una lista (spec 0010)', () => {
    it('sin lista activa, un atajo crea la lista con los ítems elegidos', async () => {
      mockFacade.data.set(null);
      await component.startFrom('ultima');
      expect(mockFacade.startListFrom).toHaveBeenCalledWith('ultima');
      expect(mockFacade.cloneListItems).not.toHaveBeenCalled();
    });

    it('con una lista vacía, el atajo copia los ítems en esa lista', async () => {
      mockFacade.data.set({ id: 'list-1', list_items: [] });
      await component.startFrom('plantilla');
      expect(mockFacade.cloneListItems).toHaveBeenCalledWith('plantilla', 'list-1');
      expect(mockFacade.startListFrom).not.toHaveBeenCalled();
    });

    it('hay atajos si existe una compra anterior o alguna plantilla', () => {
      expect(component.hasShortcuts()).toBe(false);
      mockFacade.templates.set([{ id: 't1', list_items: [] }]);
      expect(component.hasShortcuts()).toBe(true);
      mockFacade.templates.set([]);
      mockFacade.lastCompletedList.set({ id: 'c1', list_items: [] });
      expect(component.hasShortcuts()).toBe(true);
    });
  });
});
