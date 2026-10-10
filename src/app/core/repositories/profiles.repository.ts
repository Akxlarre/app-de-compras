import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

/** Columnas de `public.profiles` que consume la app. */
export interface ProfileRow {
  id: string;
  email: string | null;
  role_id: number | null;
}

/** Acceso tipado a `profiles`. Lanza el error de Supabase; el facade decide cómo mostrarlo. */
@Injectable({ providedIn: 'root' })
export class ProfilesRepository {
  private readonly supabase = inject(SupabaseService);

  async findById(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, email, role_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  }

  /**
   * Nombre propio (spec 0018): lo que ven los demás miembros de la familia. Va por la RPC
   * `set_my_display_name` porque la policy de UPDATE de `profiles` es recursiva (42P17).
   */
  async updateDisplayName(name: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('set_my_display_name', { p_name: name });
    if (error) throw error;
  }
}
