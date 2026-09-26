import { TestBed } from '@angular/core/testing';
import { ActiveListPage } from './active-list.page';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { ConfirmationService } from 'primeng/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChangeDetectorRef, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { FamilyFacade } from '@core/facades/family.facade';

describe('ActiveListPage', () => {
  let component: ActiveListPage;
  let mockFacade: any;
  let alertController: { create: ReturnType<typeof vi.fn> };
  let familyFacade: any;

  beforeEach(() => {
    alertController = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };
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
    const alertButtons = () => alertController.create.mock.calls[0][0].buttons as any[];
    const button = (text: RegExp) => alertButtons().find((b) => text.test(b.text));

    it('con pendientes ofrece pasarlos a la próxima lista o descartarlos', async () => {
      mockFacade.data.set({
        id: 'list-1',
        list_items: [
          { id: '1', is_checked: true, quantity: 1 },
          { id: '2', is_checked: false, quantity: 1 },
        ],
      });

      await component.completeList('list-1');

      expect(alertController.create.mock.calls[0][0].message).toContain('1 pendiente');
      await button(/pasar/i).handler();
      expect(mockFacade.completeList).toHaveBeenLastCalledWith('list-1', true);

      await button(/descartar/i).handler();
      expect(mockFacade.completeList).toHaveBeenLastCalledWith('list-1', false);

      expect(button(/cancelar/i).role).toBe('cancel');
    });

    it('sin pendientes pide una confirmación simple', async () => {
      mockFacade.data.set({ id: 'list-1', list_items: [{ id: '1', is_checked: true }] });

      await component.completeList('list-1');

      expect(alertButtons()).toHaveLength(2);
      expect(button(/pasar|descartar/i)).toBeUndefined();
      await button(/finalizar/i).handler();
      expect(mockFacade.completeList).toHaveBeenCalledWith('list-1', false);
    });
  });
});
