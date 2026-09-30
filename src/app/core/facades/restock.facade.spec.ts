import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RestockFacade } from './restock.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ToastService } from '../services/ui/toast.service';

describe('RestockFacade (spec 0014)', () => {
  let facade: RestockFacade;
  let catalog: Record<string, ReturnType<typeof vi.fn>>;
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  const products = [{ id: 'p1', name: 'Leche' }];
  const stats = [
    { product_id: 'p1', purchase_count: 3, median_interval_days: 10, last_purchased_at: 'x' },
  ];

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    catalog = {
      findByFamily: vi.fn().mockResolvedValue(products),
      findRestockStats: vi.fn().mockResolvedValue(stats),
      snoozeRestock: vi.fn().mockResolvedValue(undefined),
    };
    toast = { error: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        RestockFacade,
        { provide: FamilyRepository, useValue: { getOrCreateFamilyId: vi.fn().mockResolvedValue('F1') } },
        { provide: ProductsRepository, useValue: catalog },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(RestockFacade);
  });

  it('carga el catálogo de la familia y las estadísticas de compra', async () => {
    await facade.initialize();

    expect(catalog['findByFamily']).toHaveBeenCalledWith('F1');
    expect(facade.data()).toEqual({ products, stats });
  });

  it('"Todavía tengo" pospone al instante y lo guarda', async () => {
    await facade.initialize();

    await facade.snooze('p1', '2026-10-10T00:00:00.000Z');

    expect(facade.data()!.products[0].restock_snoozed_until).toBe('2026-10-10T00:00:00.000Z');
    expect(catalog['snoozeRestock']).toHaveBeenCalledWith('p1', '2026-10-10T00:00:00.000Z');
  });

  it('si no se pudo posponer, vuelve a aparecer y avisa', async () => {
    await facade.initialize();
    catalog['snoozeRestock'].mockRejectedValue(new Error('rls'));

    expect(await facade.snooze('p1', '2026-10-10T00:00:00.000Z')).toBe(false);

    expect(facade.data()!.products[0].restock_snoozed_until).toBeUndefined();
    expect(toast['error']).toHaveBeenCalled();
  });
});
