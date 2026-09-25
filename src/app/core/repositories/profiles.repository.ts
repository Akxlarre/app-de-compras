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
}
