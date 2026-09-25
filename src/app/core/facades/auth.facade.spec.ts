import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthFacade } from './auth.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { ProfilesRepository } from '@core/repositories/profiles.repository';
import { SessionScopeService } from '@core/services/auth/session-scope.service';

type AuthCallback = (event: string, session: unknown) => void;

describe('AuthFacade', () => {
  let facade: AuthFacade;
  let authCallbacks: AuthCallback[];
  let unsubscribers: ReturnType<typeof vi.fn>[];
  let mockSupabase: any;
  let profiles: { findById: ReturnType<typeof vi.fn> };
  const mockRouter = { navigate: vi.fn() };
  const mockNav = { navigateRoot: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    vi.clearAllMocks();
    authCallbacks = [];
    unsubscribers = [];

    mockSupabase = {
      onAuthStateChange: vi.fn((cb: AuthCallback) => {
        authCallbacks.push(cb);
        const stop = vi.fn();
        unsubscribers.push(stop);
        return stop;
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updatePassword: vi.fn(),
    };
    profiles = { findById: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.cl', role_id: 1 }) };

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ProfilesRepository, useValue: profiles },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: mockNav },
      ],
    });

    facade = TestBed.inject(AuthFacade);
  });

  it('should initialize currentUser as null', () => {
    expect(facade.currentUser()).toBeNull();
    expect(facade.isAuthenticated()).toBe(false);
  });

  it('SIGNED_IN carga el perfil vía ProfilesRepository', async () => {
    authCallbacks[0]('SIGNED_IN', { user: { id: 'u1', email: 'ana@casa.cl' } });
    await vi.waitFor(() => expect(facade.currentUser()).not.toBeNull());

    expect(profiles.findById).toHaveBeenCalledWith('u1');
    expect(facade.currentUser()).toMatchObject({ id: 'u1', name: 'ana', role: 'alumno' });
  });

  it('si el perfil falla igual deja entrar con rol unknown', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    profiles.findById.mockRejectedValue(new Error('rls'));

    authCallbacks[0]('SIGNED_IN', { user: { id: 'u1', email: 'ana@casa.cl' } });
    await vi.waitFor(() => expect(facade.currentUser()).not.toBeNull());

    expect(facade.currentUser()?.role).toBe('unknown');
  });

  it('should handle logout', async () => {
    await facade.logout();
    expect(mockSupabase.signOut).toHaveBeenCalled();
    expect(facade.currentUser()).toBeNull();
    // navigateRoot: Ionic destruye las páginas de la sesión anterior (no quedan en su stack).
    expect(mockNav.navigateRoot).toHaveBeenCalledWith('/login');
  });

  describe('limpieza de datos al cambiar de sesión', () => {
    let clear: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      clear = vi.spyOn(TestBed.inject(SessionScopeService), 'clear');
    });

    it('logout limpia los datos de la sesión, aunque signOut falle', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabase.signOut.mockRejectedValue(new Error('network'));

      await facade.logout();

      expect(clear).toHaveBeenCalled();
    });

    it('SIGNED_OUT (sesión expirada u otra pestaña) limpia los datos', () => {
      authCallbacks[0]('SIGNED_OUT', null);
      expect(clear).toHaveBeenCalled();
    });

    it('una sesión de otro usuario limpia los datos del anterior', async () => {
      authCallbacks[0]('SIGNED_IN', { user: { id: 'u1', email: 'ana@casa.cl' } });
      await vi.waitFor(() => expect(facade.currentUser()?.id).toBe('u1'));
      expect(clear).not.toHaveBeenCalled();

      authCallbacks[0]('SIGNED_IN', { user: { id: 'u2', email: 'beto@casa.cl' } });
      await vi.waitFor(() => expect(facade.currentUser()?.id).toBe('u2'));

      expect(clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePassword', () => {
    it('delega en SupabaseService.updatePassword (sin RPC heredada de primer login)', async () => {
      mockSupabase.updatePassword.mockResolvedValue({ error: null });

      const result = await facade.updatePassword('nueva-clave-123');

      expect(mockSupabase.updatePassword).toHaveBeenCalledWith('nueva-clave-123');
      expect(result.error).toBeNull();
    });

    it('propaga el error de auth', async () => {
      const authError = new Error('Contraseña débil.');
      mockSupabase.updatePassword.mockResolvedValue({ error: authError });

      const result = await facade.updatePassword('123');

      expect(result.error).toBe(authError);
    });
  });

  describe('onPasswordRecovery', () => {
    it('llama al callback solo con PASSWORD_RECOVERY y devuelve la baja', () => {
      const onRecovery = vi.fn();

      const stop = facade.onPasswordRecovery(onRecovery);
      const cb = authCallbacks.at(-1)!;

      cb('SIGNED_IN', null);
      expect(onRecovery).not.toHaveBeenCalled();

      cb('PASSWORD_RECOVERY', null);
      expect(onRecovery).toHaveBeenCalledTimes(1);

      stop();
      expect(unsubscribers.at(-1)).toHaveBeenCalled();
    });
  });
});
