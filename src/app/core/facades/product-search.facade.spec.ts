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

  describe('loadEssentials (spec 0013, Q17/Q39)', () => {
    it('la primera carga muestra estado de carga y trae hasta 8 productos', async () => {
      let resolve!: (v: unknown) => void;
      catalog.findByFamily.mockReturnValue(new Promise((r) => (resolve = r)));

      const done = facade.loadEssentials('fam-1');
      expect(facade.essentialsLoading()).toBe(true);
      resolve([{ id: '1', name: 'Arroz' }]);
      await done;

      expect(facade.essentialsLoading()).toBe(false);
      expect(catalog.findByFamily).toHaveBeenCalledWith('fam-1', 8);
      expect(facade.essentials()).toHaveLength(1);
    });

    it('al reabrir muestra lo guardado y refresca sin estado de carga (otro miembro creó productos)', async () => {
      catalog.findByFamily.mockResolvedValueOnce([{ id: '1', name: 'Arroz' }]);
      await facade.loadEssentials('fam-1');

      catalog.findByFamily.mockResolvedValueOnce([
        { id: '1', name: 'Arroz' },
        { id: '2', name: 'Pan' },
      ]);
      const again = facade.loadEssentials('fam-1');
      expect(facade.essentialsLoading()).toBe(false);
      expect(facade.essentials()).toHaveLength(1);
      await again;

      expect(facade.essentials()).toHaveLength(2);
    });

    it('si falla, deja de cargar y conserva lo que había', async () => {
      catalog.findByFamily.mockResolvedValueOnce([{ id: '1', name: 'Arroz' }]);
      await facade.loadEssentials('fam-1');
      catalog.findByFamily.mockRejectedValueOnce(new Error('red'));

      await facade.loadEssentials('fam-1');

      expect(facade.essentialsLoading()).toBe(false);
      expect(facade.essentials()).toEqual([{ id: '1', name: 'Arroz' }]);
    });
  });

  describe('createProduct', () => {
    it('crea con nombre recortado y devuelve el producto', async () => {
      const created = { id: 'p1', name: 'Huevos' };
      catalog.create.mockResolvedValue(created);

      expect(await facade.createProduct('  Huevos ', 'fam-1')).toEqual(created);
      expect(catalog.create).toHaveBeenCalledWith({ name: 'Huevos', familyId: 'fam-1' });
    });

    it('el producto nuevo aparece primero en "Tus esenciales" (Q17)', async () => {
      catalog.findByFamily.mockResolvedValue([{ id: '1', name: 'Arroz' }]);
      await facade.loadEssentials('fam-1');
      catalog.create.mockResolvedValue({ id: 'p1', name: 'Huevos' });

      await facade.createProduct('Huevos', 'fam-1');

      expect(facade.essentials().map((p) => p.id)).toEqual(['p1', '1']);
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
    const next = facade.loadEssentials('fam-C');
    expect(facade.essentialsLoading()).toBe(true); // otra sesión: vuelve a mostrar carga
    await next;
    expect(catalog.findByFamily).toHaveBeenLastCalledWith('fam-C', 8);
  });
});
