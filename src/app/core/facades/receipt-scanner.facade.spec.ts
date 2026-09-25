import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReceiptScannerFacade } from './receipt-scanner.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';

describe('ReceiptScannerFacade', () => {
  let facade: ReceiptScannerFacade;
  let family: { getOrCreateFamilyId: ReturnType<typeof vi.fn> };
  let products: Record<string, ReturnType<typeof vi.fn>>;
  let receipts: { extractItems: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    family = { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') };
    products = {
      findIdByName: vi.fn(),
      updatePrice: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: 'p-new' }),
    };
    receipts = { extractItems: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ReceiptScannerFacade,
        { provide: FamilyRepository, useValue: family },
        { provide: ProductsRepository, useValue: products },
        { provide: ReceiptsRepository, useValue: receipts },
      ],
    });
    facade = TestBed.inject(ReceiptScannerFacade);
  });

  describe('processReceiptImage', () => {
    const file = new File(['fake-image'], 'boleta.jpg', { type: 'image/jpeg' });

    it('envía la imagen en base64 (sin prefijo data:) y normaliza los ítems', async () => {
      receipts.extractItems.mockResolvedValue([
        { name: 'Leche', price: 1200 },
        { name: '', price: null },
      ]);

      await facade.processReceiptImage(file);

      expect(receipts.extractItems).toHaveBeenCalledWith(btoa('fake-image'), 'image/jpeg');
      const items = facade.scannedItems();
      expect(items.map(({ name, price }) => ({ name, price }))).toEqual([
        { name: 'Leche', price: 1200 },
        { name: 'Producto Desconocido', price: 0 },
      ]);
      expect(new Set(items.map((i) => i.id)).size).toBe(2);
      expect(facade.isScanning()).toBe(false);
    });

    it('setea error y deja la lista vacía si el OCR falla', async () => {
      receipts.extractItems.mockRejectedValue(new Error('500'));

      await facade.processReceiptImage(file);

      expect(facade.error()).toContain('error al leer la boleta');
      expect(facade.scannedItems()).toEqual([]);
      expect(facade.isScanning()).toBe(false);
    });
  });

  describe('confirmAndSavePrices', () => {
    const items = [
      { id: '1', name: 'Leche', price: 1200 },
      { id: '2', name: 'Pan', price: 900 },
    ];

    it('no hace nada con una lista vacía', async () => {
      await facade.confirmAndSavePrices([]);
      expect(family.getOrCreateFamilyId).not.toHaveBeenCalled();
    });

    it('actualiza el precio si el producto existe y lo crea si no', async () => {
      products['findIdByName'].mockImplementation(async (_: string, name: string) =>
        name === 'Leche' ? 'p-leche' : null
      );
      facade.scannedItems.set(items);

      await facade.confirmAndSavePrices(items);

      expect(products['findIdByName']).toHaveBeenCalledWith('fam-1', 'Leche');
      expect(products['updatePrice']).toHaveBeenCalledWith('p-leche', 1200);
      expect(products['create']).toHaveBeenCalledWith({
        name: 'Pan',
        familyId: 'fam-1',
        lastPrice: 900,
      });
      expect(facade.scannedItems()).toEqual([]);
      expect(facade.isSaving()).toBe(false);
    });

    it('rechaza y setea error si falla la persistencia', async () => {
      family.getOrCreateFamilyId.mockRejectedValue(new Error('not_authenticated'));

      await expect(facade.confirmAndSavePrices(items)).rejects.toThrow();

      expect(facade.error()).toBe('Error al guardar los precios.');
      expect(facade.isSaving()).toBe(false);
    });
  });

  it('reset limpia todo el estado', () => {
    facade.scannedItems.set([{ id: '1', name: 'x', price: 1 }]);
    facade.error.set('e');
    facade.isScanning.set(true);
    facade.isSaving.set(true);

    facade.reset();

    expect(facade.scannedItems()).toEqual([]);
    expect(facade.error()).toBeNull();
    expect(facade.isScanning()).toBe(false);
    expect(facade.isSaving()).toBe(false);
  });
});
