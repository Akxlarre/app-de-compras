import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductSearchFacade } from './product-search.facade';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

describe('ProductSearchFacade', () => {
  let facade: ProductSearchFacade;
  let catalog: Record<'findByFamily' | 'searchByName' | 'create', ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    catalog = { findByFamily: vi.fn(), searchByName: vi.fn(), create: vi.fn() };
    TestBed.configureTestingModule({
      providers: [ProductSearchFacade, { provide: ProductsRepository, useValue: catalog }],
    });
    facade = TestBed.inject(ProductSearchFacade);
  });

  describe('search', () => {
    it('no consulta con menos de 2 caracteres y limpia resultados', async () => {
      facade.searchResults.set([{ id: '1', name: 'Pan' } as any]);

      await facade.search(' a ');

      expect(catalog.searchByName).not.toHaveBeenCalled();
      expect(facade.searchResults()).toEqual([]);
    });

    it('busca con el término recortado y hasta 20 resultados', async () => {
      catalog.searchByName.mockResolvedValue([{ id: '1', name: 'Leche' }]);

      await facade.search('  lec ');

      expect(catalog.searchByName).toHaveBeenCalledWith('lec', 20);
      expect(facade.searchResults()).toEqual([{ id: '1', name: 'Leche' }]);
      expect(facade.isSearching()).toBe(false);
    });

    it('setea error si la búsqueda falla', async () => {
      catalog.searchByName.mockRejectedValue(new Error('boom'));

      await facade.search('leche');

      expect(facade.error()).toBe('Error al buscar productos');
      expect(facade.isSearching()).toBe(false);
    });
  });

  it('loadEssentials carga hasta 8 productos y cachea en la sesión', async () => {
    catalog.findByFamily.mockResolvedValue([{ id: '1', name: 'Arroz' }]);

    await facade.loadEssentials('fam-1');
    await facade.loadEssentials('fam-1');

    expect(catalog.findByFamily).toHaveBeenCalledTimes(1);
    expect(catalog.findByFamily).toHaveBeenCalledWith('fam-1', 8);
    expect(facade.essentials()).toHaveLength(1);
  });

  describe('createProduct', () => {
    it('crea con nombre recortado y devuelve el producto', async () => {
      const created = { id: 'p1', name: 'Huevos' };
      catalog.create.mockResolvedValue(created);

      expect(await facade.createProduct('  Huevos ', 'fam-1')).toEqual(created);
      expect(catalog.create).toHaveBeenCalledWith({ name: 'Huevos', familyId: 'fam-1' });
    });

    it('devuelve null y setea error si falla', async () => {
      catalog.create.mockRejectedValue(new Error('dup'));

      expect(await facade.createProduct('Huevos', 'fam-1')).toBeNull();
      expect(facade.error()).toBe('Error al crear producto');
      expect(facade.isSearching()).toBe(false);
    });
  });

  it('cierre de sesión: olvida esenciales y resultados, y la próxima sesión los vuelve a pedir', async () => {
    catalog.findByFamily.mockResolvedValue([{ id: '1', name: 'Pan' }]);
    await facade.loadEssentials('fam-A');
    facade.searchResults.set([{ id: '1', name: 'Pan' } as any]);

    TestBed.inject(SessionScopeService).clear();

    expect(facade.essentials()).toEqual([]);
    expect(facade.searchResults()).toEqual([]);
    await facade.loadEssentials('fam-C');
    expect(catalog.findByFamily).toHaveBeenLastCalledWith('fam-C', 8);
  });
});
