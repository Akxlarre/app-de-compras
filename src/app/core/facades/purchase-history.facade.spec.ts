import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PurchaseHistoryFacade } from './purchase-history.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

const NOW = new Date(2026, 8, 25, 12, 0);

const completed = (id: string, completedAt: Date, items: any[]) => ({
  id,
  family_id: 'fam-1',
  name: `Compra ${id}`,
  status: 'completed',
  created_at: completedAt.toISOString(),
  completed_at: completedAt.toISOString(),
  list_items: items,
});

describe('PurchaseHistoryFacade', () => {
  let facade: PurchaseHistoryFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let lists: { findCompleted: ReturnType<typeof vi.fn> };
  let receipts: { getSignedUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    receipts = { getSignedUrl: vi.fn() };
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    lists = {
      findCompleted: vi
        .fn()
        .mockResolvedValue([
          completed('a', new Date(2026, 8, 20), [
            { id: '1', is_checked: true, quantity: 2, unit_price: 1000, product: { name: 'Pan' } },
          ]),
          completed('b', new Date(2026, 7, 28), [
            { id: '2', is_checked: true, quantity: 1, unit_price: 4000, product: { name: 'Café' } },
          ]),
        ]),
    };

    TestBed.configureTestingModule({
      providers: [
        PurchaseHistoryFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ShoppingListsRepository, useValue: lists },
        { provide: ReceiptsRepository, useValue: receipts },
      ],
    });
    facade = TestBed.inject(PurchaseHistoryFacade);
  });

  afterEach(() => vi.useRealTimers());

  it('carga las compras finalizadas de la familia ya resumidas', async () => {
    await facade.initialize();

    expect(lists.findCompleted).toHaveBeenCalledWith('fam-1');
    expect(facade.data()?.map((p) => [p.id, p.total, p.itemCount])).toEqual([
      ['a', 2000, 1],
      ['b', 4000, 1],
    ]);
  });

  it('thisMonth suma solo las compras del mes en curso', async () => {
    await facade.initialize();

    expect(facade.thisMonth()).toEqual({ total: 2000, count: 1, estimatedCount: 1 });
  });

  it('thisMonth es 0 antes de cargar', () => {
    expect(facade.thisMonth()).toEqual({ total: 0, count: 0, estimatedCount: 0 });
  });

  it('el gasto del mes usa el total de la boleta y cuenta las compras estimadas (spec 0009)', async () => {
    lists.findCompleted.mockResolvedValue([
      {
        ...completed('a', new Date(2026, 8, 20), [
          { id: '1', is_checked: true, quantity: 2, unit_price: 1000, product: { name: 'Pan' } },
        ]),
        total_paid: 2350,
        total_source: 'receipt',
        receipts: { id: 'r1', image_url: 'fam/r1.jpg', store: 'Líder' },
      },
      completed('c', new Date(2026, 8, 22), [
        { id: '3', is_checked: true, quantity: 1, unit_price: 500, product: { name: 'Sal' } },
      ]),
    ]);

    await facade.initialize();

    expect(facade.thisMonth()).toEqual({ total: 2850, count: 2, estimatedCount: 1 });
  });

  it('receiptUrl pide la URL firmada de la foto de la boleta', async () => {
    receipts.getSignedUrl.mockResolvedValue('https://x/firmada');

    expect(await facade.receiptUrl('fam/r1.jpg')).toBe('https://x/firmada');
    expect(receipts.getSignedUrl).toHaveBeenCalledWith('fam/r1.jpg');
  });

  it('receiptUrl devuelve null si no se puede abrir la foto (sin acceso o sin conexión)', async () => {
    receipts.getSignedUrl.mockRejectedValue(new Error('Object not found'));

    expect(await facade.receiptUrl('otra/r1.jpg')).toBeNull();
  });

  it('si falla la carga expone un error legible', async () => {
    lists.findCompleted.mockRejectedValue(new Error('Failed to fetch'));

    await facade.initialize();

    expect(facade.error()).toContain('conexión');
    expect(facade.data()).toBeNull();
  });

  it('cierre de sesión: vacía el historial', async () => {
    await facade.initialize();

    TestBed.inject(SessionScopeService).clear();

    expect(facade.data()).toBeNull();
  });
});
