import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductSheetFacade } from './product-sheet.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ToastService } from '../services/ui/toast.service';

const arroz = { id: 'p1', family_id: 'fam-1', name: 'Arroz', last_price: 1290, archived_at: null };
const compra = (id: string, date: string, price: number) => ({
  quantity: 1,
  unit_price: price,
  list: { id, completed_at: date, receipts: [{ store: 'Aroca' }] },
});

describe('ProductSheetFacade (spec 0017)', () => {
  let facade: ProductSheetFacade;
  let products: Record<string, ReturnType<typeof vi.fn>>;
  let receipts: Record<string, ReturnType<typeof vi.fn>>;
  let toast: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    products = {
      findById: vi.fn().mockResolvedValue({ ...arroz }),
      findPurchases: vi
        .fn()
        .mockResolvedValue([
          compra('l1', '2026-09-20T12:00:00Z', 1100),
          compra('l2', '2026-10-05T12:00:00Z', 1290),
        ]),
      findRestockStats: vi
        .fn()
        .mockResolvedValue([{ product_id: 'p1', purchase_count: 2, median_interval_days: 15 }]),
      findIdByName: vi.fn().mockResolvedValue(null),
      findStorePrices: vi.fn().mockResolvedValue([
        {
          unit_price: 1290,
          quantity: 1,
          amount: 1290,
          receipt: { store: 'Aroca', purchased_at: '2026-10-05' },
          list: null,
        },
        {
          unit_price: 1190,
          quantity: 1,
          amount: 1190,
          receipt: { store: 'Líder', purchased_at: '2026-09-20' },
          list: null,
        },
      ]),
      rename: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      merge: vi.fn().mockResolvedValue(2),
      updatePrice: vi.fn().mockResolvedValue(undefined),
      updateAisle: vi.fn().mockResolvedValue(undefined),
      searchByName: vi.fn().mockResolvedValue([arroz, { id: 'p2', name: 'Arroz G1' }]),
    };
    receipts = {
      findAliasesOf: vi.fn().mockResolvedValue([{ rawText: 'ARROZ G1 1KG', productId: 'p1' }]),
      removeAlias: vi.fn().mockResolvedValue(undefined),
    };
    toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ProductSheetFacade,
        {
          provide: FamilyRepository,
          useValue: { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') },
        },
        { provide: ProductsRepository, useValue: products },
        { provide: ReceiptsRepository, useValue: receipts },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(ProductSheetFacade);
  });

  it('carga el producto, sus compras (la más reciente primero), alias y cada cuánto (AC2, AC4)', async () => {
    await facade.open('p1');

    const sheet = facade.data()!;
    expect(sheet.product.name).toBe('Arroz');
    expect(sheet.purchases.map((p) => p.listId)).toEqual(['l2', 'l1']);
    expect(sheet.frequency).toBe('Lo compras cada ~15 días · 2 compras');
    expect(sheet.aliases).toEqual([{ rawText: 'ARROZ G1 1KG', productId: 'p1' }]);
    expect(facade.hasPurchases()).toBe(true);
  });

  it('trae el precio por tienda y cuánto subió la última compra (spec 0020 D1, D2)', async () => {
    await facade.open('p1');
    const sheet = facade.data()!;
    expect(sheet.storePrices.map((p) => [p.store, p.unitPrice])).toEqual([
      ['Líder', 1190],
      ['Aroca', 1290],
    ]);
    // 1.100 (20/09) → 1.290 (05/10): subió 17%.
    expect(sheet.rise).toBe(17);
  });

  it('abrir otro producto no muestra el anterior', async () => {
    await facade.open('p1');
    products['findById'].mockResolvedValue({ ...arroz, id: 'p9', name: 'Sal' });
    const loading = facade.open('p9');
    expect(facade.data()).toBeNull();
    await loading;
    expect(facade.data()?.product.name).toBe('Sal');
  });

  it('un producto que no existe (o de otra familia) da "No encontramos este producto"', async () => {
    products['findById'].mockResolvedValue(null);
    await facade.open('zz');
    expect(facade.error()).toBe('No encontramos este producto.');
  });

  describe('renombrar (AC5)', () => {
    beforeEach(() => facade.open('p1'));

    it('valida 1 a 60 caracteres sin ir a la BD', async () => {
      expect(await facade.rename('   ')).toEqual({ ok: false });
      expect(await facade.rename('x'.repeat(61))).toEqual({ ok: false });
      expect(products['rename']).not.toHaveBeenCalled();
      expect(toast['warning']).toHaveBeenCalled();
    });

    it('si ya existe otro con ese nombre, no renombra y ofrece juntarlos', async () => {
      products['findIdByName'].mockResolvedValue('p2');
      expect(await facade.rename('Arroz G1')).toEqual({ ok: false, duplicateOf: 'p2' });
      expect(products['rename']).not.toHaveBeenCalled();
    });

    it('renombra y actualiza la ficha', async () => {
      expect(await facade.rename('  Arroz grado 1  ')).toEqual({ ok: true });
      expect(products['rename']).toHaveBeenCalledWith('p1', 'Arroz grado 1');
      expect(facade.data()?.product.name).toBe('Arroz grado 1');
    });
  });

  describe('borrar, archivar y juntar (AC6–AC8)', () => {
    beforeEach(() => facade.open('p1'));

    it('con compras no se borra (solo se archiva)', async () => {
      expect(await facade.remove()).toBe(false);
      expect(products['remove']).not.toHaveBeenCalled();
    });

    it('sin compras se borra', async () => {
      products['findPurchases'].mockResolvedValue([]);
      await facade.open('p1');
      facade.reset();
      await facade.open('p1');
      expect(await facade.remove()).toBe(true);
      expect(products['remove']).toHaveBeenCalledWith('p1');
    });

    it('archivar y reactivar cambian la ficha', async () => {
      expect(await facade.archive()).toBe(true);
      expect(facade.data()?.product.archived_at).toEqual(expect.any(String));
      expect(await facade.unarchive()).toBe(true);
      expect(facade.data()?.product.archived_at).toBeNull();
    });

    it('juntar llama a merge con este como el que se va y avisa cuántas compras pasaron', async () => {
      expect(await facade.mergeInto('p2', 'Arroz G1')).toBe(true);
      expect(products['merge']).toHaveBeenCalledWith('p1', 'p2');
      expect(toast['success']).toHaveBeenCalledWith(
        'Productos juntados',
        'Se juntaron 2 compras en «Arroz G1».'
      );
    });

    it('si juntar falla, avisa y no cambia nada', async () => {
      products['merge'].mockRejectedValue(new Error('boom'));
      expect(await facade.mergeInto('p2', 'Arroz G1')).toBe(false);
      expect(toast['error']).toHaveBeenCalled();
    });

    it('los candidatos para juntar no incluyen al producto actual', async () => {
      expect((await facade.mergeCandidates('arroz')).map((p) => p.id)).toEqual(['p2']);
    });
  });

  it('quitar un texto de boleta lo saca de la ficha (AC4)', async () => {
    await facade.open('p1');
    expect(await facade.removeAlias('ARROZ G1 1KG')).toBe(true);
    expect(receipts['removeAlias']).toHaveBeenCalledWith('fam-1', 'ARROZ G1 1KG');
    expect(facade.data()?.aliases).toEqual([]);
  });

  it('cambiar el pasillo lo guarda y actualiza la ficha (spec 0019 D2)', async () => {
    await facade.open('p1');
    expect(await facade.setAisle('Despensa')).toBe(true);
    expect(products['updateAisle']).toHaveBeenCalledWith('p1', 'Despensa');
    expect(facade.data()?.product.category).toBe('Despensa');

    products['updateAisle'].mockRejectedValue(new Error('boom'));
    expect(await facade.setAisle('Otros')).toBe(false);
    expect(facade.data()?.product.category).toBe('Despensa');
    expect(toast['error']).toHaveBeenCalled();
  });

  it('el precio estimado solo se escribe sin compras (AC11)', async () => {
    await facade.open('p1');
    expect(await facade.setEstimatedPrice(1500)).toBe(false);
    expect(products['updatePrice']).not.toHaveBeenCalled();

    products['findPurchases'].mockResolvedValue([]);
    facade.reset();
    await facade.open('p1');
    expect(await facade.setEstimatedPrice(1500)).toBe(true);
    expect(products['updatePrice']).toHaveBeenCalledWith('p1', 1500);
    expect(facade.data()?.product.last_price).toBe(1500);
  });
});
