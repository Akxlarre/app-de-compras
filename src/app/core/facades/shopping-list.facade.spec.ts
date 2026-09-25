import { TestBed } from '@angular/core/testing';
import { ShoppingListFacade } from './shopping-list.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ShoppingListFacade', () => {
  let facade: ShoppingListFacade;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    TestBed.configureTestingModule({
      providers: [
        ShoppingListFacade,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    facade = TestBed.inject(ShoppingListFacade);
  });

  it('should create', () => {
    expect(facade).toBeTruthy();
  });

  it('should toggle item check optimistically', async () => {
    // Preparar estado inicial
    facade['_data'].set({
      id: 'list-1',
      name: 'Lista Test',
      status: 'active',
      list_items: [
        { id: 'item-1', is_checked: false, quantity: 1, product: { name: 'Manzanas' } } as any
      ]
    });

    // Mock DB resolve success
    mockSupabase.client.eq.mockResolvedValueOnce({ error: null });

    // Ejecutar
    await facade.toggleItemCheck('item-1', false);

    // Verificar optimistic update: is_checked debe ser true
    const currentData = facade.data();
    expect(currentData?.list_items[0].is_checked).toBe(true);
    
    // Verificar que se llamó a la base de datos
    expect(mockSupabase.client.update).toHaveBeenCalledWith({ is_checked: true });
  });

  it('should delete item optimistically', async () => {
    // Preparar estado inicial
    facade['_data'].set({
      id: 'list-1',
      name: 'Lista Test',
      status: 'active',
      list_items: [
        { id: 'item-1', is_checked: false, quantity: 1 } as any,
        { id: 'item-2', is_checked: true, quantity: 2 } as any
      ]
    });

    mockSupabase.client.eq.mockResolvedValueOnce({ error: null });

    // Ejecutar
    await facade.deleteItem('item-1');

    // Verificar optimistic update: item-1 ya no está
    const currentData = facade.data();
    expect(currentData?.list_items.length).toBe(1);
    expect(currentData?.list_items[0].id).toBe('item-2');
  });
});
