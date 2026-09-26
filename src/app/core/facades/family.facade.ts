import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  FamilyInfo,
  FamilyMemberView,
  FamilyPreview,
  JoinFamilyResult,
} from '../models/family.model';
import { FamilyRepository } from '../repositories/family.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { ToastService } from '../services/ui/toast.service';
import { normalizeInviteCode } from '../utils/family.utils';

export type {
  FamilyInfo,
  FamilyMemberView,
  FamilyPreview,
  JoinFamilyResult,
} from '../models/family.model';

/** Familia del usuario: datos, código de invitación, miembros y administración. */
@Injectable({ providedIn: 'root' })
export class FamilyFacade {
  private readonly family = inject(FamilyRepository);
  private readonly toast = inject(ToastService);

  readonly currentFamily = signal<FamilyInfo | null>(null);
  readonly members = signal<FamilyMemberView[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly isOwner = computed(() => this.currentFamily()?.myRole === 'owner');
  readonly hasOtherMembers = computed(() => this.members().some((m) => !m.isMe));
  /** userId → nombre para mostrar ("Tú" para el usuario actual). */
  readonly memberNames = computed(
    () => new Map(this.members().map((m) => [m.userId, m.isMe ? 'Tú' : m.name]))
  );

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  reset(): void {
    this.currentFamily.set(null);
    this.members.set([]);
    this.isLoading.set(false);
    this.error.set(null);
  }

  async loadMyFamily(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Quien fue quitado de su familia queda sin ninguna: se le crea una (como en el resto de la app).
      await this.family.getOrCreateFamilyId();
      const [family, members] = await Promise.all([
        this.family.findMine(),
        this.family.findMembers(),
      ]);
      this.currentFamily.set(family);
      this.members.set(members);
    } catch {
      this.error.set('Error cargando datos de familia');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** A qué familia apunta un código (para confirmar antes de unirse); null si no existe. */
  async preview(input: string): Promise<FamilyPreview | null> {
    const code = normalizeInviteCode(input);
    if (!code) return null;
    try {
      return await this.family.preview(code);
    } catch {
      return null;
    }
  }

  /** Une al usuario a la familia del código (deja la actual). */
  async joinByCode(input: string): Promise<JoinFamilyResult> {
    const code = normalizeInviteCode(input);
    if (!code) return 'invalid_code';
    try {
      await this.family.joinByCode(code);
    } catch (e) {
      const errorCode = (e as { code?: string } | null)?.code;
      if (errorCode === 'P0002') return 'invalid_code';
      if (errorCode === '23505') return 'already_member';
      return 'error';
    }
    await this.loadMyFamily();
    return 'joined';
  }

  /** Solo el dueño. Recarga miembros y código (la BD lo rota). Avisa con toast. */
  async removeMember(userId: string): Promise<boolean> {
    try {
      await this.family.removeMember(userId);
    } catch (e) {
      console.error('Error quitando miembro', e);
      this.toast.error('No se pudo quitar', 'Intenta de nuevo.');
      return false;
    }
    await this.loadMyFamily();
    this.toast.success('Miembro quitado', 'Comparte el código nuevo con quien quieras invitar.');
    return true;
  }

  async rename(input: string): Promise<boolean> {
    const family = this.currentFamily();
    const name = input.trim();
    if (!family || !name) {
      this.toast.error('Falta el nombre', 'Escribe cómo se llama tu familia.');
      return false;
    }
    try {
      await this.family.rename(family.id, name);
      this.currentFamily.set({ ...family, name });
      return true;
    } catch (e) {
      console.error('Error renombrando la familia', e);
      this.toast.error('No se pudo renombrar', 'Intenta de nuevo.');
      return false;
    }
  }
}
