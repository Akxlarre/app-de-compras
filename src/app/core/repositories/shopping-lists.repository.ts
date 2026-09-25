import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type {
  ActiveShoppingList,
  ShoppingList,
  ShoppingListStatus,
} from '@core/models/shopping-list.model';

/** Lista con ítems y el producto embebido de cada ítem. */
const WITH_ITEMS = '*, list_items(*, product:products(id, name, category, last_price))';

export interface NewShoppingList {
  name: string;
  familyId: string;
  status: ShoppingListStatus;
}

/** Acceso tipado a `shop.shopping_lists`. Lanza el error de Supabase. */
@Injectable({ providedIn: 'root' })
export class ShoppingListsRepository {
  private readonly supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client.schema('shop');
  }

  /** La lista activa más reciente (RLS limita a mi familia). */
  async findLatestActive(): Promise<ActiveShoppingList | null> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as ActiveShoppingList | null) ?? null;
  }

  async findLastCompleted(familyId: string): Promise<ActiveShoppingList | null> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('family_id', familyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as ActiveShoppingList | null) ?? null;
  }

  async findTemplates(familyId: string): Promise<ActiveShoppingList[]> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .select(WITH_ITEMS)
      .eq('family_id', familyId)
      .eq('status', 'template')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ActiveShoppingList[] | null) ?? [];
  }

  async create(input: NewShoppingList): Promise<ShoppingList> {
    const { data, error } = await this.db
      .from('shopping_lists')
      .insert({ name: input.name, family_id: input.familyId, status: input.status })
      .select()
      .single();
    if (error) throw error;
    return data as ShoppingList;
  }

  async complete(listId: string): Promise<void> {
    const { error } = await this.db
      .from('shopping_lists')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', listId);
    if (error) throw error;
  }
}
