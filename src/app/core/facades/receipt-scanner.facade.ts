import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { ShoppingListFacade } from './shopping-list.facade';

export interface ScannedItem {
  id: string;
  name: string;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class ReceiptScannerFacade {
  private supabase = inject(SupabaseService);
  private shoppingFacade = inject(ShoppingListFacade);

  readonly isScanning = signal(false);
  readonly isSaving = signal(false);
  readonly scannedItems = signal<ScannedItem[]>([]);
  readonly error = signal<string | null>(null);

  /**
   * Simula el escaneo OCR de una imagen de boleta.
   */
  async processReceiptImage(file: File): Promise<void> {
    this.isScanning.set(true);
    this.error.set(null);
    this.scannedItems.set([]);

    try {
      // 1. Convertir la imagen a Base64
      const base64 = await this.fileToBase64(file);
      // Quitar el prefijo "data:image/jpeg;base64," para mandar solo el payload
      const base64Data = base64.split(',')[1];

      // 2. Llamar a la Edge Function
      const { data, error } = await this.supabase.client.functions.invoke('process-receipt', {
        body: { imageBase64: base64Data, mimeType: file.type }
      });

      if (error) {
        throw new Error(error.message || 'Error en el servidor de OCR');
      }

      // La Edge Function devuelve un JSON: { items: [ { name: string, price: number } ] }
      const items = data?.items || [];
      
      const mappedItems: ScannedItem[] = items.map((item: any) => ({
        id: crypto.randomUUID(),
        name: item.name || 'Producto Desconocido',
        price: item.price || 0
      }));

      this.scannedItems.set(mappedItems);
    } catch (e) {
      this.error.set('Hubo un error al leer la boleta. Asegúrate de tener conexión y la imagen sea clara.');
      console.error('Error OCR:', e);
    } finally {
      this.isScanning.set(false);
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Confirma los precios. Actualiza o crea productos en la base de datos
   * y guarda el last_price.
   */
  async confirmAndSavePrices(items: ScannedItem[]): Promise<void> {
    if (items.length === 0) return;
    
    this.isSaving.set(true);
    this.error.set(null);

    try {
      // 1. Obtener la familia actual del usuario
      const { data: member } = await this.supabase.client
        .from('family_members')
        .select('family_id')
        .limit(1)
        .maybeSingle();
      
      if (!member?.family_id) {
        throw new Error('No se encontró familia para asociar los productos');
      }

      const familyId = member.family_id;

      // 2. Por cada item, intentar hacer upsert (o buscar por nombre)
      // En un caso real haríamos un fuzzy match, aquí simplificamos buscando exacto
      for (const item of items) {
        // Buscar si existe un producto con nombre similar
        const { data: existingProduct } = await this.supabase.client
          .from('products')
          .select('id')
          .eq('family_id', familyId)
          .ilike('name', item.name)
          .maybeSingle();

        if (existingProduct) {
          // Actualizar last_price
          await this.supabase.client
            .from('products')
            .update({ last_price: item.price })
            .eq('id', existingProduct.id);
        } else {
          // Crear nuevo producto con last_price
          await this.supabase.client
            .from('products')
            .insert({ 
              name: item.name, 
              family_id: familyId, 
              last_price: item.price 
            });
        }
      }

      this.scannedItems.set([]); // Limpiar después de guardar
    } catch (e) {
      this.error.set('Error al guardar los precios.');
      console.error(e);
      throw e; // Lanzar para que la UI sepa que falló
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
}
