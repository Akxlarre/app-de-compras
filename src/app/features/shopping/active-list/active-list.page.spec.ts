import { TestBed } from '@angular/core/testing';
import { ActiveListPage } from './active-list.page';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { ConfirmationService } from 'primeng/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChangeDetectorRef, signal } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { FamilyFacade } from '@core/facades/family.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';

describe('ActiveListPage', () => {
  let component: ActiveListPage;
  let mockFacade: any;
  let alertController: { create: ReturnType<typeof vi.fn> };
  let familyFacade: any;
  let closeFacade: { start: ReturnType<typeof vi.fn> };
  let nav: { navigateForward: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    alertController = {
      create: vi
        .fn()
        .mockResolvedValue({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }),
    };
    closeFacade = { start: vi.fn() };
    nav = { navigateForward: vi.fn() };
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
        { provide: NavController, useValue: nav },
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

    it('"Sin boleta" empieza el cierre y navega a la pantalla de cierre', async () => {
      mockFacade.data.set(conPendiente);
      const done = component.completeList('list-1');

      await press(0, /sin boleta/i);
      await press(1, /descartar/i);
      await done;

      expect(closeFacade.start).toHaveBeenCalledWith(conPendiente, false, 'manual');
      expect(nav.navigateForward).toHaveBeenCalledWith('/app/close');
      expect(mockFacade.completeList).not.toHaveBeenCalled();
    });

    it('"Escanear boleta" sin pendientes no pregunta por ellos', async () => {
      mockFacade.data.set({ id: 'list-1', list_items: [{ id: '1', is_checked: true }] });
      const done = component.completeList('list-1');

      await press(0, /escanear/i);
      await done;

      expect(alertController.create).toHaveBeenCalledTimes(1);
      expect(closeFacade.start).toHaveBeenCalledWith(expect.anything(), false, 'receipt');
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

    it('si me pasan a otra familia, recarga los datos de la familia', () => {
      TestBed.tick();
      expect(familyFacade.loadMyFamily).not.toHaveBeenCalled();

      mockFacade.familyChanged.set(1);
      TestBed.tick();

      expect(familyFacade.loadMyFamily).toHaveBeenCalledTimes(1);
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
