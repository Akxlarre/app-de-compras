import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductsFacade } from './products.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

const NOW = new Date('2026-09-25T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('ProductsFacade', () => {
  let facade: ProductsFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let catalog: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    catalog = {
      findByFamily: vi.fn(),
      findIdByName: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'p-new', name: 'Sal de mar' }),
    };

    TestBed.configureTestingModule({
      providers: [
        ProductsFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ProductsRepository, useValue: catalog },
      ],
    });
    facade = TestBed.inject(ProductsFacade);
  });

  afterEach(() => vi.useRealTimers());

  describe('loadProducts', () => {
    it('calcula daysSincePurchase desde la última compra (no desde el cambio de precio)', async () => {
      catalog.findByFamily.mockResolvedValue([
        { id: 'a', name: 'Arroz', last_purchased_at: daysAgo(10), updated_at: daysAgo(0) },
        { id: 'b', name: 'Pan', last_purchased_at: daysAgo(2), updated_at: daysAgo(40) },
        { id: 'c', name: 'Sal', last_purchased_at: null, created_at: daysAgo(30) },
      ]);

      await facade.loadProducts();

      expect(catalog.findByFamily).toHaveBeenCalledWith('fam-1', undefined, { archived: false });
      const byId = Object.fromEntries(facade.products().map((p) => [p.id, p.daysSincePurchase]));
      expect(byId).toEqual({ a: 10, b: 2, c: null });
      expect(facade.isLoading()).toBe(false);
    });

    it('setea error si falla la carga', async () => {
      family.getOrCreateFamilyId.mockRejectedValue(new Error('not_authenticated'));

      await facade.loadProducts();

      expect(facade.error()).toBe('Error al cargar productos');
      expect(facade.products()).toEqual([]);
      expect(facade.isLoading()).toBe(false);
    });
  });

  describe('Catálogo (spec 0017)', () => {
    beforeEach(async () => {
      catalog.findByFamily.mockResolvedValue([
        { id: 'a', name: 'Arroz', last_purchased_at: null },
        { id: 'b', name: 'Café molido', last_purchased_at: null },
        { id: 'c', name: 'Champiñones', last_purchased_at: null },
      ]);
      await facade.loadProducts();
    });

    it('filtra mientras se escribe, sin tildes ni mayúsculas (AC9)', () => {
      facade.query.set('CHAMPI');
      expect(facade.filtered().map((p) => p.id)).toEqual(['c']);
      facade.query.set('');
      expect(facade.filtered()).toHaveLength(3);
    });

    it('"Archivados" carga solo los archivados (AC7)', async () => {
      await facade.showArchived(true);
      expect(catalog.findByFamily).toHaveBeenLastCalledWith('fam-1', undefined, { archived: true });
      expect(facade.archived()).toBe(true);
    });

    it('al volver a la pestaña refresca sin mostrar el skeleton', async () => {
      const loading: boolean[] = [];
      catalog.findByFamily.mockImplementation(async () => {
        loading.push(facade.isLoading());
        return [];
      });
      await facade.loadProducts();
      expect(loading).toEqual([false]);
    });

    it('crear devuelve el id del nuevo producto', async () => {
      expect(await facade.create('  Sal de mar ')).toBe('p-new');
      expect(catalog.create).toHaveBeenCalledWith({ name: 'Sal de mar', familyId: 'fam-1' });
    });

    it('crear uno que ya existe devuelve el existente sin duplicar', async () => {
      catalog.findIdByName.mockResolvedValue('a');
      expect(await facade.create('arroz')).toBe('a');
      expect(catalog.create).not.toHaveBeenCalled();
    });

    it('crear sin nombre no hace nada', async () => {
      expect(await facade.create('   ')).toBeNull();
    });
  });

  it('cierre de sesión: vacía el catálogo', () => {
    facade.products.set([{ id: 'a' } as any]);
    facade.error.set('x');

    TestBed.inject(SessionScopeService).clear();

    expect(facade.products()).toEqual([]);
    expect(facade.error()).toBeNull();
  });
});
