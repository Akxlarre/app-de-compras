import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthFacade } from './auth.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { ProfilesRepository } from '@core/repositories/profiles.repository';

type AuthCallback = (event: string, session: unknown) => void;

describe('AuthFacade', () => {
  let facade: AuthFacade;
  let authCallbacks: AuthCallback[];
  let unsubscribers: ReturnType<typeof vi.fn>[];
  let mockSupabase: any;
  let profiles: { findById: ReturnType<typeof vi.fn> };
  const mockRouter = { navigate: vi.fn() };

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
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
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
