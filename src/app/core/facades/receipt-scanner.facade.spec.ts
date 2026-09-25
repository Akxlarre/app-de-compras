import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReceiptScannerFacade } from './receipt-scanner.facade';
import { ShoppingListFacade } from './shopping-list.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';

/** Query builder encadenable de Supabase: cada método devuelve el builder y `await` resuelve `result`. */
function queryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder: any = {};
  for (const m of ['select', 'insert', 'update', 'eq', 'ilike', 'limit', 'maybeSingle']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: result.data ?? null, error: result.error ?? null });
  return builder;
}

describe('ReceiptScannerFacade', () => {
  let facade: ReceiptScannerFacade;
  let from: ReturnType<typeof vi.fn>;
  let invoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    from = vi.fn();
    invoke = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ReceiptScannerFacade,
        { provide: SupabaseService, useValue: { client: { from, functions: { invoke } } } },
        { provide: ShoppingListFacade, useValue: {} },
      ],
    });
    facade = TestBed.inject(ReceiptScannerFacade);
  });

  describe('processReceiptImage', () => {
    const file = new File(['fake-image'], 'boleta.jpg', { type: 'image/jpeg' });

    it('envía la imagen en base64 (sin prefijo data:) y mapea los ítems', async () => {
      invoke.mockResolvedValue({
        data: {
          items: [
            { name: 'Leche', price: 1200 },
            { name: '', price: null },
          ],
        },
        error: null,
      });

      await facade.processReceiptImage(file);

      const [fnName, { body }] = invoke.mock.calls[0];
      expect(fnName).toBe('process-receipt');
      expect(body.mimeType).toBe('image/jpeg');
      expect(body.imageBase64).toBe(btoa('fake-image'));

      const items = facade.scannedItems();
      expect(items.map(({ name, price }) => ({ name, price }))).toEqual([
        { name: 'Leche', price: 1200 },
        { name: 'Producto Desconocido', price: 0 },
      ]);
      expect(new Set(items.map((i) => i.id)).size).toBe(2);
      expect(facade.isScanning()).toBe(false);
    });

    it('setea error y deja la lista vacía si la Edge Function falla', async () => {
      invoke.mockResolvedValue({ data: null, error: { message: '500' } });

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
      expect(from).not.toHaveBeenCalled();
    });

    it('actualiza last_price si el producto existe y lo crea si no', async () => {
      const updateQb = queryBuilder({});
      const insertQb = queryBuilder({});
      from
        .mockReturnValueOnce(queryBuilder({ data: { family_id: 'fam-1' } })) // familia
        .mockReturnValueOnce(queryBuilder({ data: { id: 'p-leche' } })) // busca Leche
        .mockReturnValueOnce(updateQb)
        .mockReturnValueOnce(queryBuilder({ data: null })) // busca Pan
        .mockReturnValueOnce(insertQb);
      facade.scannedItems.set(items);

      await facade.confirmAndSavePrices(items);

      expect(updateQb.update).toHaveBeenCalledWith({ last_price: 1200 });
      expect(updateQb.eq).toHaveBeenCalledWith('id', 'p-leche');
      expect(insertQb.insert).toHaveBeenCalledWith({
        name: 'Pan',
        family_id: 'fam-1',
        last_price: 900,
      });
      expect(facade.scannedItems()).toEqual([]);
      expect(facade.isSaving()).toBe(false);
    });

    it('rechaza y setea error si el usuario no tiene familia', async () => {
      from.mockReturnValueOnce(queryBuilder({ data: null }));

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
