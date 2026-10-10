import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PurchaseHistoryFacade } from './purchase-history.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { ToastService } from '../services/ui/toast.service';
import { FileExportService } from '../services/file-export.service';

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
  let lists: Record<string, ReturnType<typeof vi.fn>>;
  let receipts: Record<string, ReturnType<typeof vi.fn>>;
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  let files: { saveCsv: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    receipts = { getSignedUrl: vi.fn(), removeImage: vi.fn().mockResolvedValue(undefined) };
    toast = { error: vi.fn(), warning: vi.fn(), success: vi.fn() };
    files = { saveCsv: vi.fn().mockResolvedValue(undefined) };
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
      deletePurchase: vi.fn().mockResolvedValue(null),
      renamePurchase: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        PurchaseHistoryFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ShoppingListsRepository, useValue: lists },
        { provide: ReceiptsRepository, useValue: receipts },
        { provide: ToastService, useValue: toast },
        { provide: FileExportService, useValue: files },
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

    expect(facade.selected().current).toEqual({ total: 2000, count: 1, estimatedCount: 1 });
  });

  describe('meses (spec 0016 D4)', () => {
    it('parte en el mes actual con las compras de ese mes y la diferencia con el anterior', async () => {
      await facade.initialize();

      expect(facade.month()).toEqual(new Date(2026, 8, 1));
      expect(facade.visible().map((p) => p.id)).toEqual(['a']);
      expect(facade.selected().diff).toBe(-2000);
      expect(facade.canGoNext()).toBe(false);
    });

    it('va al mes anterior y vuelve, sin pasar del mes actual', async () => {
      await facade.initialize();

      facade.prevMonth();
      expect(facade.month()).toEqual(new Date(2026, 7, 1));
      expect(facade.visible().map((p) => p.id)).toEqual(['b']);
      expect(facade.selected().current.total).toBe(4000);
      expect(facade.canGoNext()).toBe(true);

      facade.nextMonth();
      facade.nextMonth();
      expect(facade.month()).toEqual(new Date(2026, 8, 1));
    });

    it('gráfico de 6 meses hasta el actual, promedio, top y tiendas del mes elegido (spec 0020)', async () => {
      await facade.initialize();

      expect(facade.chart().map((m) => [m.month.getMonth(), m.total])).toEqual([
        [3, 0],
        [4, 0],
        [5, 0],
        [6, 0],
        [7, 4000],
        [8, 2000],
      ]);
      expect(facade.average()).toBe(2000);
      expect(facade.top()).toEqual([{ name: 'Pan', total: 2000 }]);
      expect(facade.byStore()).toEqual([{ name: 'Sin boleta', total: 2000 }]);

      facade.goToMonth(new Date(2026, 7, 15));
      expect(facade.month()).toEqual(new Date(2026, 7, 1));
      expect(facade.top()).toEqual([{ name: 'Café', total: 4000 }]);
      // El gráfico sigue terminando en el mes actual.
      expect(facade.chart().at(-1)!.month).toEqual(new Date(2026, 8, 1));
    });

    it('no va a un mes futuro', async () => {
      await facade.initialize();
      facade.goToMonth(new Date(2026, 11, 1));
      expect(facade.month()).toEqual(new Date(2026, 8, 1));
    });

    it('byId encuentra una compra cargada', async () => {
      await facade.initialize();
      expect(facade.byId('b')?.total).toBe(4000);
      expect(facade.byId('zz')).toBeNull();
    });
  });

  it('el gasto es 0 antes de cargar', () => {
    expect(facade.selected().current).toEqual({ total: 0, count: 0, estimatedCount: 0 });
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

    expect(facade.selected().current).toEqual({ total: 2850, count: 2, estimatedCount: 1 });
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

  describe('exportar el mes (spec 0026)', () => {
    it('exporta solo las compras del mes elegido, con el nombre del mes', async () => {
      await facade.initialize();
      facade.prevMonth(); // agosto: solo la compra "b"

      expect(await facade.exportMonth()).toBe(true);

      const [name, csv] = files.saveCsv.mock.calls[0];
      expect(name).toBe('compras-2026-08.csv');
      expect(csv).toContain(';Café;1;4000;4000;4000');
      expect(csv).not.toContain('Pan');
    });

    it('si no se pudo, avisa y devuelve false', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      files.saveCsv.mockRejectedValue(new Error('No app'));
      await facade.initialize();

      expect(await facade.exportMonth()).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('nombre, borrar y renombrar (spec 0012)', () => {
    beforeEach(async () => {
      lists.findCompleted.mockResolvedValue([
        {
          ...completed('a', new Date(2026, 8, 20), [
            {
              id: '1',
              is_checked: true,
              quantity: 2,
              unit_price: 1000,
              product: { id: 'p1', name: 'Pan' },
            },
          ]),
          name: 'Lista de compras',
          receipts: { id: 'r1', image_url: 'fam/r1.jpg', store: null },
        },
        {
          ...completed('b', new Date(2026, 8, 21), [
            {
              id: '2',
              is_checked: true,
              quantity: 1,
              unit_price: 500,
              product: { id: 'p2', name: 'Sal' },
            },
          ]),
          name: 'Asado',
        },
      ]);
      await facade.initialize();
    });

    it('el título de una compra con nombre automático es su fecha; uno propio se respeta', () => {
      expect(facade.data()?.map((p) => p.title)).toEqual(['Compra del dom 20 sep', 'Asado']);
    });

    it('deletePurchase la saca al instante (y del mes) y borra la foto de la boleta', async () => {
      lists.deletePurchase.mockResolvedValue('fam/r1.jpg');

      expect(await facade.deletePurchase('a')).toBe(true);

      expect(lists.deletePurchase).toHaveBeenCalledWith('a');
      expect(facade.data()?.map((p) => p.id)).toEqual(['b']);
      expect(facade.selected().current).toEqual({ total: 500, count: 1, estimatedCount: 1 });
      expect(receipts.removeImage).toHaveBeenCalledWith('fam/r1.jpg');
    });

    it('deletePurchase: si la BD falla, la compra vuelve y se avisa', async () => {
      lists.deletePurchase.mockRejectedValue(new Error('boom'));

      expect(await facade.deletePurchase('a')).toBe(false);

      expect(facade.data()?.map((p) => p.id)).toEqual(['a', 'b']);
      expect(toast.error).toHaveBeenCalled();
      expect(receipts.removeImage).not.toHaveBeenCalled();
    });

    it('deletePurchase: si falla borrar la foto, la compra igual queda borrada', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      lists.deletePurchase.mockResolvedValue('fam/r1.jpg');
      receipts.removeImage.mockRejectedValue(new Error('storage'));

      expect(await facade.deletePurchase('a')).toBe(true);
      expect(facade.data()?.map((p) => p.id)).toEqual(['b']);
    });

    it('renamePurchase cambia el nombre y el título', async () => {
      expect(await facade.renamePurchase('a', '  Once  ')).toBe(true);

      expect(lists.renamePurchase).toHaveBeenCalledWith('a', 'Once');
      expect(facade.data()?.[0]).toMatchObject({ name: 'Once', title: 'Once' });
    });

    it('renamePurchase rechaza vacío o más de 60 caracteres sin llamar a la BD', async () => {
      expect(await facade.renamePurchase('a', '   ')).toBe(false);
      expect(await facade.renamePurchase('a', 'x'.repeat(61))).toBe(false);

      expect(lists.renamePurchase).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledTimes(2);
    });
  });

  it('cierre de sesión: vacía el historial', async () => {
    await facade.initialize();

    TestBed.inject(SessionScopeService).clear();

    expect(facade.data()).toBeNull();
  });
});
