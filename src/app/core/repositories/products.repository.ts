import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { Product } from '@core/models/product.model';
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

  async findByFamily(familyId: string, limit?: number): Promise<Product[]> {
    let query = this.db.from('products').select('*').eq('family_id', familyId).order('name');
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
}
