import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type {
  FamilyInfo,
  FamilyMemberView,
  FamilyPreview,
  FamilyRole,
} from '@core/models/family.model';

interface MembershipRow {
  role: FamilyRole;
  families?: FamilyRow | FamilyRow[];
}
interface FamilyRow {
  id: string;
  name: string;
  invite_code: string;
}
interface MemberRow {
  user_id: string;
  name: string;
  role: FamilyRole;
  joined_at: string;
  is_me: boolean;
}

/**
 * Familia del usuario. Único punto que resuelve "mi familia": las altas, uniones y bajas pasan por
 * RPCs SECURITY DEFINER porque RLS no permite escribir `family_members` directo.
 */
@Injectable({ providedIn: 'root' })
export class FamilyRepository {
  private readonly supabase = inject(SupabaseService);

  /** Tablas y RPCs de compras viven en el schema `shop` (plataforma-db). */
  private get db() {
    return this.supabase.client.schema('shop');
  }

  /** Id de la familia del usuario; si no tiene, la crea ("Mi Familia", rol owner). */
  async getOrCreateFamilyId(): Promise<string> {
    const { data, error } = await this.db.rpc('get_or_create_family');
    if (error) throw error;
    return data as string;
  }

  async findMine(): Promise<FamilyInfo | null> {
    // RLS deja ver a todos los miembros de la familia: sin el filtro, `role` podría ser el de otro.
    const { data: auth } = await this.supabase.client.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) return null;

    const { data, error } = await this.db
      .from('family_members')
      .select('role, families(id, name, invite_code)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    const row = data as MembershipRow | null;
    // PostgREST tipa la relación como arreglo aunque sea 1:1.
    const family = Array.isArray(row?.families) ? row.families[0] : row?.families;
    if (!row || !family) return null;
    return { id: family.id, name: family.name, inviteCode: family.invite_code, myRole: row.role };
  }

  /** Nombre y tamaño de la familia de un código (normalizado); null si no existe. */
  async preview(code: string): Promise<FamilyPreview | null> {
    const { data, error } = await this.db.rpc('preview_family', { p_code: code });
    if (error) throw error;
    const row = (data as { name: string; member_count: number }[] | null)?.[0];
    return row ? { name: row.name, memberCount: row.member_count } : null;
  }

  /** Se une a la familia del código. Quita la membresía anterior. Lanza el error (con `code`). */
  async joinByCode(code: string): Promise<void> {
    const { error } = await this.db.rpc('join_family_by_code', { p_code: code });
    if (error) throw error;
  }

  async findMembers(): Promise<FamilyMemberView[]> {
    const { data, error } = await this.db.rpc('get_family_members');
    if (error) throw error;
    return ((data as MemberRow[] | null) ?? []).map((m) => ({
      userId: m.user_id,
      name: m.name,
      role: m.role,
      joinedAt: m.joined_at,
      isMe: m.is_me,
    }));
  }

  /** Solo el dueño. La BD rota el código de invitación. */
  async removeMember(userId: string): Promise<void> {
    const { error } = await this.db.rpc('remove_family_member', { p_user_id: userId });
    if (error) throw error;
  }

  async rename(familyId: string, name: string): Promise<void> {
    const { error } = await this.db.from('families').update({ name }).eq('id', familyId);
    if (error) throw error;
  }
}
