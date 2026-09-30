import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductSearchComponent } from './product-search.component';
import { ProductSearchFacade } from '@core/facades/product-search.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';

describe('ProductSearchComponent (spec 0013)', () => {
  let component: ProductSearchComponent;
  let search: Record<string, any>;
  let lists: Record<string, any>;
  const list = signal<any>({
    id: 'L1',
    family_id: 'F1',
    list_items: [{ id: 'i1', product_id: 'p1', product: { id: 'p1' }, quantity: 2 }],
  });

  beforeEach(() => {
    search = {
      searchResults: signal([]),
      essentials: signal([]),
      essentialsLoading: signal(false),
      isSearching: signal(false),
      error: signal(null),
      loadEssentials: vi.fn(),
      search: vi.fn(),
      clear: vi.fn(),
      createProduct: vi.fn(),
    };
    lists = {
      data: list,
      addItem: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn(),
      updateItemQuantity: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ProductSearchComponent],
      providers: [
        { provide: ProductSearchFacade, useValue: search },
        { provide: ShoppingListFacade, useValue: lists },
      ],
    });
    component = TestBed.createComponent(ProductSearchComponent).componentInstance;
  });

  it('dice cuántos hay en la lista de un producto que ya está, y nada si no está (Q4, Q11)', () => {
    expect(component.inListQuantity('p1')).toBe(2);
    expect(component.inListQuantity('p9')).toBeNull();
  });

  it('+ sobre un producto que ya está suma uno (la BD suma), nunca borra', async () => {
    await component.selectProduct({ id: 'p1', name: 'Leche' } as any);

    expect(lists.addItem).toHaveBeenCalledWith('L1', 'p1');
    expect(lists.deleteItem).not.toHaveBeenCalled();
  });

  it('"Crear y añadir" deja el buscador abierto, con el campo vacío (Q9)', async () => {
    const closed = vi.fn();
    component.visibleChange.subscribe(closed);
    search['createProduct'].mockResolvedValue({ id: 'p2', name: 'Huevos' });
    component.searchTerm.set('Huevos');

    await component.createNewProduct();

    expect(search['createProduct']).toHaveBeenCalledWith('Huevos', 'F1');
    expect(lists.addItem).toHaveBeenCalledWith('L1', 'p2');
    expect(closed).not.toHaveBeenCalled();
    expect(component.searchTerm()).toBe('');
    expect(search['clear']).toHaveBeenCalled();
  });

  it('si no se pudo crear, conserva lo escrito', async () => {
    search['createProduct'].mockResolvedValue(null);
    component.searchTerm.set('Huevos');

    await component.createNewProduct();

    expect(lists.addItem).not.toHaveBeenCalled();
    expect(component.searchTerm()).toBe('Huevos');
  });
});
