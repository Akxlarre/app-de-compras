import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';

export interface FamilyInfo {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class FamilyFacade {
  private supabase = inject(SupabaseService);

  readonly currentFamily = signal<FamilyInfo | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async loadMyFamily(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data: member } = await this.supabase.client
        .from('family_members')
        .select('family_id, families(id, name)')
        .limit(1)
        .maybeSingle();

      if (member?.families) {
        this.currentFamily.set((Array.isArray(member.families) ? member.families[0] : member.families) as unknown as FamilyInfo);
      } else {
        this.currentFamily.set(null);
      }
    } catch (e) {
      this.error.set('Error cargando datos de familia');
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinFamily(familyId: string): Promise<boolean> {
    this.isLoading.set(true);
    try {
      const { data: userData } = await this.supabase.getUser();
      if (!userData.user) throw new Error('No auth');

      const { error } = await this.supabase.client
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: userData.user.id,
          role: 'member' // un nuevo miembro unido por id
        });

      if (error) throw error;
      
      await this.loadMyFamily();
      return true;
    } catch (e) {
      console.error(e);
      this.error.set('Código inválido o ya estás en esta familia');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }
}
