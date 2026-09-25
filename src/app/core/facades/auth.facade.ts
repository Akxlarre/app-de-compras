import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from '@core/models/user.model';
import { getInitialsFromDisplayName } from '@core/models/user.model';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { mapAuthError } from '@core/utils/auth-errors.utils';

/**
 * AuthFacade - Facade de autenticación con Supabase.
 *
 * Actúa como capa intermedia entre la UI y SupabaseService.
 * Mantiene el estado de sesión como Signals y expone métodos de autenticación.
 * La UI inyecta AuthFacade; nunca inyecta SupabaseService directamente.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthFacade {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /** Resuelve cuando la comprobación inicial de sesión ha terminado (para guards). */
  readonly whenReady: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    // Safety timeout: si Supabase no responde en 5s, resolvemos para no colgar la app.
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
    this.whenReady = Promise.race([readyPromise, timeout]);

    this.supabase.client.auth.onAuthStateChange((event: any, session: any) => {
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
        session?.user
      ) {
        this.loadUserFromSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        this._currentUser.set(null);
      }
    });

    this.supabase
      .getUser()
      .then(async ({ data: { user } }: any) => {
        if (user) await this.loadUserFromSession(user);
      })
      .finally(() => resolveReady());
  }

  private async loadUserFromSession(authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Si ya tenemos el usuario y el ID no ha cambiado, no recargamos
    if (this._currentUser()?.id === authUser.id) return;

    // Definimos la interfaz para la respuesta del JOIN con roles
    interface UserProfile {
      id: string;
      email: string;
      role_id: number;
    }

    const result = await this.supabase.client
      .from('profiles')
      .select('id, email, role_id')
      .eq('id', authUser.id)
      .maybeSingle();

    const dbUser = result.data as unknown as UserProfile | null;
    const error = result.error;

    if (error) {
      console.error('Error fetching user profile:', error);
    }

    const name =
      (authUser.user_metadata?.['display_name'] as string) ??
      (authUser.email ? authUser.email.split('@')[0] : 'Usuario');

    let roleName = 'unknown';
    // Simplified role mapping for now
    if (dbUser?.role_id === 1) roleName = 'alumno';
    else if (dbUser?.role_id === 2) roleName = 'instructor';
    else if (dbUser?.role_id === 3) roleName = 'admin';

    const user: User = {
      id: authUser.id,
      dbId: dbUser?.id as any,
      name,
      email: authUser.email ?? '',
      role: roleName as any, // Mantenemos el cast final a UserRole
      initials: getInitialsFromDisplayName(name),
      firstLogin: false,
      branchId: undefined,
      isActive: true,
    };
    this._currentUser.set(user);
  }

  async login(email: string, password: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.signIn(email, password);

    // Si el inicio de sesión es exitoso, debemos esperar a que el listener onAuthStateChange
    // termine de obtener el perfil de usuario de la base de datos antes de resolver,
    // de lo contrario, el router navegará sin un rol de usuario válido en memoria.
    if (!error) {
      // 50 intentos * 100ms = 5 segundos de espera máxima
      let attempts = 0;
      while (this._currentUser() === null && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
    }

    return { error: error ? new Error(mapAuthError(error)) : null };
  }

  async signUp(
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> },
  ): Promise<{
    data: { user?: { id: string } | null; session?: unknown } | null;
    error: Error | null;
  }> {
    const result = await this.supabase.signUp(email, password, options);
    return {
      data: result.data
        ? {
            user: result.data.user ?? undefined,
            session: result.data.session ?? undefined,
          }
        : null,
      error: result.error ? new Error(mapAuthError(result.error)) : null,
    };
  }

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.resetPasswordForEmail(email);
    return { error: error ? new Error(mapAuthError(error)) : null };
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.signOut();
    } catch (err) {
      console.error('[AuthFacade] Error al cerrar sesión en Supabase:', err);
    } finally {
      this._currentUser.set(null);
      await this.router.navigate(['/login']);
    }
  }

  setUser(user: User | null): void {
    this._currentUser.set(user);
  }

  async updatePassword(password: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.auth.updateUser({ password });
    if (error) return { error };

    // Utilizamos un RPC (Stored Procedure) porque las políticas RLS
    // de la tabla "users" impiden que los no-admin hagan UPDATE directamente.
    const { error: dbError } = await this.supabase.client.rpc('user_complete_first_login');

    if (dbError) {
      console.error('Error clearing first_login via RPC:', dbError);
      return {
        error: new Error(
          'Contraseña actualizada, pero hubo un error al sincronizar. Por favor, contacta al administrador.',
        ),
      };
    }

    // SOLO si el RPC fue exitoso, actualizamos el estado del Signal en el cliente.
    const user = this._currentUser();
    if (user) {
      this._currentUser.set({ ...user, firstLogin: false });
    }
    return { error: null };
  }
}
