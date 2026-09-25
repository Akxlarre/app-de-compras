import { Injectable, inject, signal } from '@angular/core';
import type { FamilyInfo } from '../models/family.model';
import { FamilyRepository } from '../repositories/family.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';

export type { FamilyInfo } from '../models/family.model';

@Injectable({ providedIn: 'root' })
export class FamilyFacade {
  private readonly family = inject(FamilyRepository);

  readonly currentFamily = signal<FamilyInfo | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(SessionScopeService).register(() => this.reset());
  }

  reset(): void {
    this.currentFamily.set(null);
    this.isLoading.set(false);
    this.error.set(null);
  }

  async loadMyFamily(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      this.currentFamily.set(await this.family.findMine());
    } catch {
      this.error.set('Error cargando datos de familia');
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinFamily(familyId: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // RPC: valida el código, quita la membresía anterior y une como 'member'.
      await this.family.join(familyId);
      await this.loadMyFamily();
      return true;
    } catch {
      this.error.set('Código inválido o ya estás en esta familia');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }
}
