import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { Aisle, Product } from '@core/models/product.model';
import type { ProductPurchaseRow } from '@core/models/product-sheet.model';
import type { StorePriceRow } from '@core/models/price-insights.model';
import type { RestockStat } from '@core/models/restock.model';
import { MutationError, toMutationError } from '@core/utils/mutation-error.utils';

export interface NewProduct {
  name: string;
  familyId: string;
  lastPrice?: number;
}

/** Acceso tipado al catálogo `shop.products`. Lanza el error de Supabase. */
@Injectable({ providedIn: 'root' })
export class ProductsRepository {
  private readonly supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client.schema('shop');
  }

  /** Catálogo de la familia, sin archivados (o solo los archivados con `archived`, spec 0017). */
  async findByFamily(
    familyId: string,
    limit?: number,
    { archived = false }: { archived?: boolean } = {}
  ): Promise<Product[]> {
    let query = this.db.from('products').select('*').eq('family_id', familyId);
    query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
    query = query.order('name');
    if (limit !== undefined) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data as Product[] | null) ?? [];
  }

  /** Búsqueda por nombre parcial (RLS limita a mi familia). */
  async searchByName(term: string, limit: number): Promise<Product[]> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .ilike('name', `%${term}%`)
      .is('archived_at', null)
      .order('name')
      .limit(limit);
    if (error) throw error;
    return (data as Product[] | null) ?? [];
  }

  async create(input: NewProduct): Promise<Product> {
    const row: Record<string, unknown> = { name: input.name, family_id: input.familyId };
    if (input.lastPrice !== undefined) row['last_price'] = input.lastPrice;

    const { data, error } = await this.db.from('products').insert(row).select().single();
    if (error) throw error;
    return data as Product;
  }

  /** Id del producto con ese nombre exacto (sin distinguir mayúsculas), o null. */
  async findIdByName(familyId: string, name: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('products')
      .select('id')
      .eq('family_id', familyId)
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as { id: string } | null)?.id ?? null;
  }

  async updatePrice(productId: string, price: number): Promise<void> {
    const { error } = await this.db
      .from('products')
      .update({ last_price: price, updated_at: new Date().toISOString() })
      .eq('id', productId);
    if (error) throw error;
  }

  /** Pasillo elegido en la ficha (spec 0019 D2): vale para siempre. */
  async updateAisle(productId: string, aisle: Aisle): Promise<void> {
    const { error } = await this.db
      .from('products')
      .update({ category: aisle, updated_at: new Date().toISOString() })
      .eq('id', productId);
    if (error) throw error;
  }

  /** Compras por producto: cuántas, cada cuánto (mediana) y la última (RPC, spec 0014). */
  async findRestockStats(): Promise<RestockStat[]> {
    const { data, error } = await this.db.rpc('restock_stats');
    if (error) throw toMutationError(error);
    return (data as RestockStat[] | null) ?? [];
  }

  /** "Todavía tengo": no sugerir el producto hasta `until` (para toda la familia). */
  async snoozeRestock(productId: string, until: string): Promise<void> {
    const { data, error } = await this.db
      .from('products')
      .update({ restock_snoozed_until: until })
      .eq('id', productId)
      .select('id');
    if (error) throw toMutationError(error);
    if (!Array.isArray(data) || data.length === 0) throw new MutationError('not_found');
  }

  // ── Ficha de producto (spec 0017) ──

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.db.from('products').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Product | null) ?? null;
  }

  /** Lo marcado de este producto en compras cerradas, con la fecha y las tiendas de sus boletas. */
  async findPurchases(productId: string): Promise<ProductPurchaseRow[]> {
    const { data, error } = await this.db
      .from('list_items')
      .select('quantity, unit_price, list:shopping_lists!inner(id, completed_at, receipts(store))')
      .eq('product_id', productId)
      .eq('is_checked', true)
      .eq('list.status', 'completed');
    if (error) throw error;
    // `list` es a-uno (list_items → shopping_lists): PostgREST lo trae como objeto, no arreglo.
    return (data as unknown as ProductPurchaseRow[] | null) ?? [];
  }

  /** Líneas de boleta del producto con su tienda y fecha (precio por tienda, spec 0020 D1). */
  async findStorePrices(productId: string): Promise<StorePriceRow[]> {
    const { data, error } = await this.db
      .from('purchase_lines')
      .select(
        'unit_price, quantity, amount, receipt:receipts(store, purchased_at), list:shopping_lists(completed_at)'
      )
      .eq('product_id', productId)
      .eq('kind', 'product');
    if (error) throw error;
    // `receipt` y `list` son a-uno: PostgREST los trae como objeto.
    return (data as unknown as StorePriceRow[] | null) ?? [];
  }

  async rename(id: string, name: string): Promise<void> {
    await this.patch(id, { name });
  }

  async archive(id: string): Promise<void> {
    await this.patch(id, { archived_at: new Date().toISOString() });
  }

  async unarchive(id: string): Promise<void> {
    await this.patch(id, { archived_at: null });
  }

  /** Borra un producto (la app solo lo ofrece sin compras: D3). */
  async remove(id: string): Promise<void> {
    const { data, error } = await this.db.from('products').delete().eq('id', id).select('id');
    if (error) throw toMutationError(error);
    if (!Array.isArray(data) || data.length === 0) throw new MutationError('not_found');
  }

  /** Junta `from` en `into` (RPC `merge_products`); devuelve cuántas compras se movieron. */
  async merge(from: string, into: string): Promise<number> {
    const { data, error } = await this.db.rpc('merge_products', { p_from: from, p_into: into });
    if (error) throw toMutationError(error);
    return Number(data ?? 0);
  }

  private async patch(id: string, changes: Record<string, unknown>): Promise<void> {
    const { data, error } = await this.db
      .from('products')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');
    if (error) throw toMutationError(error);
    if (!Array.isArray(data) || data.length === 0) throw new MutationError('not_found');
  }
}
