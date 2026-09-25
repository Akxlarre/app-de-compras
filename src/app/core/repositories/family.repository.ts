import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { FamilyInfo } from '@core/models/family.model';

/**
 * Familia del usuario. Único punto que resuelve "mi familia": las altas y uniones pasan por
 * RPCs SECURITY DEFINER porque RLS no permite INSERT directo en `families`/`family_members`.
 */
@Injectable({ providedIn: 'root' })
export class FamilyRepository {
  private readonly supabase = inject(SupabaseService);

  /** Id de la familia del usuario; si no tiene, la crea ("Mi Familia", rol owner). */
  async getOrCreateFamilyId(): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('get_or_create_family');
    if (error) throw error;
    return data as string;
  }

  /** Se une a otra familia por su código (id). Quita la membresía anterior. */
  async join(familyId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('join_family', {
      p_family_id: familyId.trim(),
    });
    if (error) throw error;
  }

  async findMine(): Promise<FamilyInfo | null> {
    const { data, error } = await this.supabase.client
      .from('family_members')
      .select('families(id, name)')
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    // PostgREST tipa la relación como arreglo aunque sea 1:1.
    const families = (data as { families?: FamilyInfo | FamilyInfo[] } | null)?.families;
    return (Array.isArray(families) ? families[0] : families) ?? null;
  }
}
