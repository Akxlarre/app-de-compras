import { Injectable, inject, signal } from '@angular/core';
import { FamilyRepository } from '../repositories/family.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { ReceiptsRepository } from '../repositories/receipts.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

export interface ScannedItem {
  id: string;
  name: string;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class ReceiptScannerFacade {
  private readonly family = inject(FamilyRepository);
  private readonly products = inject(ProductsRepository);
  private readonly receipts = inject(ReceiptsRepository);

  readonly isScanning = signal(false);
  readonly isSaving = signal(false);
  readonly scannedItems = signal<ScannedItem[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  /**
   * Lee una boleta con OCR (Edge Function) y deja los ítems para que el usuario los revise.
   */
  async processReceiptImage(file: File): Promise<void> {
    this.isScanning.set(true);
    this.error.set(null);
    this.scannedItems.set([]);

    try {
      // Quitar el prefijo "data:image/jpeg;base64," para mandar solo el payload
      const base64Data = (await this.fileToBase64(file)).split(',')[1];
      const items = await this.receipts.extractItems(base64Data, file.type);

      this.scannedItems.set(
        items.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name || 'Producto Desconocido',
          price: item.price || 0,
        }))
      );
    } catch (e) {
      this.error.set(
        'Hubo un error al leer la boleta. Asegúrate de tener conexión y la imagen sea clara.'
      );
      console.error('Error OCR:', e);
    } finally {
      this.isScanning.set(false);
    }
  }

  /**
   * Confirma los precios: actualiza `last_price` de los productos conocidos (por nombre)
   * y crea los que no existen. Lanza para que la UI sepa que falló.
   */
  async confirmAndSavePrices(items: ScannedItem[]): Promise<void> {
    if (items.length === 0) return;

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const familyId = await this.family.getOrCreateFamilyId();

      // Coincidencia exacta por nombre (sin mayúsculas). Fuzzy match queda para más adelante.
      for (const item of items) {
        const productId = await this.products.findIdByName(familyId, item.name);
        if (productId) {
          await this.products.updatePrice(productId, item.price);
        } else {
          await this.products.create({ name: item.name, familyId, lastPrice: item.price });
        }
      }

      this.scannedItems.set([]); // Limpiar después de guardar
    } catch (e) {
      this.error.set('Error al guardar los precios.');
      console.error(e);
      throw e;
    } finally {
      this.isSaving.set(false);
    }
  }

  reset() {
    this.scannedItems.set([]);
    this.error.set(null);
    this.isScanning.set(false);
    this.isSaving.set(false);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
}
