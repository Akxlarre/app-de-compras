import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PurchaseCloseFacade } from './purchase-close.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { ShoppingListsRepository } from '../repositories/shopping-lists.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { ToastService } from '../services/ui/toast.service';
import type { ActiveShoppingList } from '@core/models/shopping-list.model';

const list = {
  id: 'l1',
  family_id: 'fam-1',
  name: 'Semana',
  status: 'active',
  created_at: '',
  list_items: [
    {
      id: 'i-leche',
      list_id: 'l1',
      quantity: 2,
      is_checked: true,
      created_at: '',
      product: { id: 'p-leche', name: 'Leche', last_price: 1000 },
    },
    {
      id: 'i-pan',
      list_id: 'l1',
      quantity: 1,
      is_checked: true,
      created_at: '',
      product: { id: 'p-pan', name: 'Pan' },
    },
    {
      id: 'i-arroz',
      list_id: 'l1',
      quantity: 1,
      is_checked: false,
      created_at: '',
      product: { id: 'p-arroz', name: 'Arroz', last_price: 1200 },
    },
  ],
} as unknown as ActiveShoppingList;

const line = (over: object) => ({
  raw_text: 'X',
  kind: 'product',
  name: null,
  matched_list_item: null,
  quantity: 1,
  unit: 'un',
  unit_price: 1000,
  line_total: 1000,
  applies_to: null,
  legible: true,
  ...over,
});

describe('PurchaseCloseFacade', () => {
  let facade: PurchaseCloseFacade;
  let lists: Record<string, ReturnType<typeof vi.fn>>;
  let receipts: Record<string, ReturnType<typeof vi.fn>>;
  let products: { findByFamily: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  const file = new File(['foto'], 'boleta.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    lists = {
      closeManual: vi.fn().mockResolvedValue(null),
      setPurchaseTotal: vi.fn().mockResolvedValue(undefined),
    };
    receipts = {
      extractReceipt: vi.fn(),
      findAliases: vi.fn().mockResolvedValue([]),
      uploadImage: vi.fn().mockResolvedValue('fam-1/x.jpg'),
      applyReceipt: vi.fn().mockResolvedValue('r1'),
      attachReceipt: vi.fn().mockResolvedValue('r2'),
      createReceiptPurchase: vi.fn().mockResolvedValue('r3'),
    };
    products = {
      findByFamily: vi.fn().mockResolvedValue([
        { id: 'p-leche', name: 'Leche' },
        { id: 'p-cafe', name: 'Café molido' },
      ]),
    };
    toast = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        PurchaseCloseFacade,
        {
          provide: FamilyRepository,
          useValue: { getOrCreateFamilyId: vi.fn().mockResolvedValue('fam-1') },
        },
        { provide: ShoppingListsRepository, useValue: lists },
        { provide: ReceiptsRepository, useValue: receipts },
        { provide: ProductsRepository, useValue: products },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(PurchaseCloseFacade);
  });

  describe('sin boleta', () => {
    beforeEach(() => facade.start(list, true, 'manual'));

    it('precarga el último precio de lo marcado (sin precio queda vacío)', () => {
      expect(facade.checkedItems().map((i) => i.id)).toEqual(['i-leche', 'i-pan']);
      expect(facade.manualPrices()).toEqual({ 'i-leche': 1000, 'i-pan': null });
      expect(facade.manualSum()).toBe(2000);
    });

    it('confirma con los precios editados y el total', async () => {
      facade.setManualPrice('i-pan', 900);
      facade.manualTotal.set(3100);

      expect(await facade.confirmManual()).toBe(true);

      expect(lists.closeManual).toHaveBeenCalledWith(
        'l1',
        true,
        [
          { itemId: 'i-leche', unitPrice: 1000 },
          { itemId: 'i-pan', unitPrice: 900 },
        ],
        3100
      );
      expect(toast.success).toHaveBeenCalled();
    });

    it('sin total manda null (queda estimated)', async () => {
      await facade.confirmManual();
      expect(lists.closeManual).toHaveBeenCalledWith(
        'l1',
        true,
        [{ itemId: 'i-leche', unitPrice: 1000 }],
        null
      );
    });

    it('si falla avisa y devuelve false', async () => {
      lists.closeManual.mockRejectedValue(new Error('x'));
      expect(await facade.confirmManual()).toBe(false);
      expect(facade.isSaving()).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('con boleta', () => {
    const ocr = {
      store: 'Líder',
      date: '2026-09-29',
      total: 6190,
      lines: [
        line({ raw_text: 'LECHE ENTERA', quantity: 2, unit_price: 1100, line_total: 2200 }),
        line({ raw_text: 'CAFE MOLIDO JV', unit_price: 3990, line_total: 3990 }),
      ],
    };

    beforeEach(async () => {
      facade.start(list, false, 'receipt');
      receipts['extractReceipt'].mockResolvedValue(ocr);
      await facade.scan([file]);
    });

    it('lee la boleta con lo marcado de contexto y concilia con lista, catálogo y alias', () => {
      expect(receipts['extractReceipt']).toHaveBeenCalledWith(
        [{ base64: btoa('foto'), mimeType: 'image/jpeg' }],
        ['Leche', 'Pan']
      );
      expect(receipts['findAliases']).toHaveBeenCalledWith('fam-1');
      const d = facade.decisions();
      expect(d[0].target).toMatchObject({ kind: 'item', itemId: 'i-leche' });
      expect(d[1]).toMatchObject({ status: 'candidate', target: null });
      expect(facade.missing()).toEqual([
        { item: { itemId: 'i-pan', productId: 'p-pan', name: 'Pan', quantity: 1 }, bought: true },
      ]);
      expect(facade.canConfirm()).toBe(false);
      expect(facade.isScanning()).toBe(false);
    });

    it('elegir un candidato permite confirmar; sube la foto y aplica la boleta', async () => {
      facade.chooseCandidate(1, facade.decisions()[1].candidates[0]);
      facade.setMissingBought('i-pan', false);
      expect(facade.canConfirm()).toBe(true);

      expect(await facade.confirmReceipt()).toBe(true);

      expect(receipts['uploadImage']).toHaveBeenCalledWith('fam-1', file);
      expect(receipts['applyReceipt']).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: 'l1',
          carryPending: false,
          total: 6190,
          imagePath: 'fam-1/x.jpg',
          items: [
            {
              itemId: 'i-leche',
              unitPrice: 1100,
              quantity: 2,
              rawText: 'LECHE ENTERA',
              saveAlias: true,
            },
          ],
          extras: [
            {
              productId: 'p-cafe',
              rawText: 'CAFE MOLIDO JV',
              name: 'Café molido',
              unitPrice: 3990,
              quantity: 1,
            },
          ],
          uncheckItemIds: ['i-pan'],
        })
      );
    });

    it('"otro": una línea nueva que se guarda en el catálogo con su nombre', async () => {
      facade.chooseCandidate(1, 'new');
      facade.updateDecision(1, { saveToCatalog: true, name: 'Café JV' });

      await facade.confirmReceipt();

      expect(receipts['applyReceipt'].mock.calls[0][0].extras).toEqual([
        {
          productId: null,
          rawText: 'CAFE MOLIDO JV',
          name: 'Café JV',
          unitPrice: 3990,
          quantity: 1,
        },
      ]);
    });

    it('si la foto no sube, la compra igual se cierra (sin foto)', async () => {
      receipts['uploadImage'].mockRejectedValue(new Error('403'));
      facade.chooseCandidate(1, 'new');

      expect(await facade.confirmReceipt()).toBe(true);
      expect(receipts['applyReceipt'].mock.calls[0][0].imagePath).toBeNull();
    });

    it('si falla aplicar la boleta avisa y devuelve false', async () => {
      receipts['applyReceipt'].mockRejectedValue(new Error('list_not_active'));
      facade.chooseCandidate(1, 'new');

      expect(await facade.confirmReceipt()).toBe(false);
      expect(toast.error).toHaveBeenCalled();
      expect(facade.isSaving()).toBe(false);
    });
  });

  describe('compra ya cerrada (Historial, spec 0009)', () => {
    const cerrada = { ...list, status: 'completed' } as ActiveShoppingList;
    const ocr = {
      store: 'Líder',
      date: '2026-09-27',
      total: 2200,
      lines: [line({ raw_text: 'LECHE ENTERA', quantity: 2, unit_price: 1100, line_total: 2200 })],
    };

    it('"Agregar boleta": concilia con lo comprado y usa attach_receipt (sin mover pendientes)', async () => {
      facade.start(cerrada, false, 'receipt', 'completed');
      receipts['extractReceipt'].mockResolvedValue(ocr);
      await facade.scan([file]);

      expect(facade.kind()).toBe('completed');
      expect(facade.decisions()[0].target).toMatchObject({ kind: 'item', itemId: 'i-leche' });

      expect(await facade.confirmReceipt()).toBe(true);

      expect(receipts['attachReceipt']).toHaveBeenCalledWith(
        expect.objectContaining({ listId: 'l1', total: 2200, imagePath: 'fam-1/x.jpg' })
      );
      expect(receipts['applyReceipt']).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Boleta agregada', expect.any(String));
    });

    it('"Ingresar total": pide un total y usa set_purchase_total con los precios editados', async () => {
      facade.start(cerrada, false, 'manual', 'completed');
      facade.setManualPrice('i-pan', 900);

      expect(facade.canConfirmManual()).toBe(false);
      expect(await facade.confirmManual()).toBe(false);
      expect(lists['setPurchaseTotal']).not.toHaveBeenCalled();

      facade.manualTotal.set(5000);
      expect(facade.canConfirmManual()).toBe(true);
      expect(await facade.confirmManual()).toBe(true);

      expect(lists['setPurchaseTotal']).toHaveBeenCalledWith('l1', 5000, [
        { itemId: 'i-leche', unitPrice: 1000 },
        { itemId: 'i-pan', unitPrice: 900 },
      ]);
      expect(lists['closeManual']).not.toHaveBeenCalled();
    });
  });

  describe('compra sin lista (spec 0009)', () => {
    const ocr = {
      store: 'Jumbo',
      date: '2026-09-27',
      total: 5190,
      lines: [
        line({ raw_text: 'LECHE', name: 'Leche', unit_price: 1000, line_total: 1000 }),
        line({ raw_text: 'CAFE JV', name: 'Café JV', unit_price: 3990, line_total: 3990 }),
        line({ raw_text: 'BOLSA BASURA', name: 'Bolsa basura', unit_price: 200, line_total: 200 }),
      ],
    };

    beforeEach(async () => {
      receipts['findAliases'].mockResolvedValue([{ rawText: 'CAFE JV', productId: 'p-cafe' }]);
      facade.startNew();
      receipts['extractReceipt'].mockResolvedValue(ocr);
      await facade.scan([file]);
    });

    it('empieza en modo boleta, sin lista, y concilia contra catálogo y alias', () => {
      expect(facade.kind()).toBe('new');
      expect(facade.mode()).toBe('receipt');
      expect(receipts['extractReceipt']).toHaveBeenCalledWith(expect.anything(), []);
      const [leche, cafe, bolsa] = facade.decisions();
      expect(leche).toMatchObject({ status: 'candidate', target: null });
      expect(cafe.target).toEqual({ kind: 'product', productId: 'p-cafe', name: 'Café molido' });
      expect(bolsa.target).toEqual({ kind: 'new' });
      expect(facade.missing()).toEqual([]);
    });

    it('lo nuevo entra al catálogo por defecto (si no, la compra quedaría vacía)', () => {
      expect(facade.decisions()[2].saveToCatalog).toBe(true);
    });

    it('confirma con create_receipt_purchase y no toca la lista activa', async () => {
      facade.chooseCandidate(0, facade.decisions()[0].candidates[0]);

      expect(await facade.confirmReceipt()).toBe(true);

      const input = receipts['createReceiptPurchase'].mock.calls[0][0];
      expect(input.extras).toEqual([
        { productId: 'p-leche', rawText: 'LECHE', name: 'Leche', unitPrice: 1000, quantity: 1 },
        { productId: 'p-cafe', rawText: 'CAFE JV', name: 'Café molido', unitPrice: 3990, quantity: 1 },
        { productId: null, rawText: 'BOLSA BASURA', name: 'Bolsa basura', unitPrice: 200, quantity: 1 },
      ]);
      expect(input.total).toBe(5190);
      expect(receipts['applyReceipt']).not.toHaveBeenCalled();
      expect(receipts['attachReceipt']).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Compra registrada', expect.any(String));
    });

    it('elegir "Otro" en un "¿Es este?" también lo guarda en el catálogo', () => {
      facade.chooseCandidate(0, 'new');
      expect(facade.decisions()[0].saveToCatalog).toBe(true);
    });
  });

  it('si el OCR falla deja el error para reintentar', async () => {
    facade.start(list, false, 'receipt');
    receipts['extractReceipt'].mockRejectedValue(new Error('500'));

    await facade.scan([file]);

    expect(facade.error()).toContain('No pudimos leer la boleta');
    expect(facade.decisions()).toEqual([]);
    expect(facade.isScanning()).toBe(false);
  });

  it('cierre de sesión: descarta el cierre en curso', () => {
    facade.start(list, true, 'manual');
    TestBed.inject(SessionScopeService).clear();
    expect(facade.list()).toBeNull();
    expect(facade.mode()).toBeNull();
  });
});
