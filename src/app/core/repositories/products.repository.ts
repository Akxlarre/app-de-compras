import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { Product } from '@core/models/product.model';

export interface NewProduct {
  name: string;
  familyId: string;
  lastPrice?: number;
}

/** Acceso tipado al catálogo `products`. Lanza el error de Supabase. */
@Injectable({ providedIn: 'root' })
export class ProductsRepository {
  private readonly supabase = inject(SupabaseService);

  async findByFamily(familyId: string, limit?: number): Promise<Product[]> {
    let query = this.supabase.client
      .from('products')
      .select('*')
      .eq('family_id', familyId)
      .order('name');
    if (limit !== undefined) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data as Product[] | null) ?? [];
  }

  /** Búsqueda por nombre parcial (RLS limita a mi familia). */
  async searchByName(term: string, limit: number): Promise<Product[]> {
    const { data, error } = await this.supabase.client
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

    const { data, error } = await this.supabase.client
      .from('products')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  }

  /** Id del producto con ese nombre exacto (sin distinguir mayúsculas), o null. */
  async findIdByName(familyId: string, name: string): Promise<string | null> {
    const { data, error } = await this.supabase.client
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
    const { error } = await this.supabase.client
      .from('products')
      .update({ last_price: price, updated_at: new Date().toISOString() })
      .eq('id', productId);
    if (error) throw error;
  }
}
