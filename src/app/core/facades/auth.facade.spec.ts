import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthFacade } from './auth.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { ProfilesRepository } from '@core/repositories/profiles.repository';
import { SessionScopeService } from '@core/services/auth/session-scope.service';
import { initialsOf } from '@core/utils/avatar.utils';

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
      updatePassword: vi.fn().mockResolvedValue({ error: null }),
      updateUserMetadata: vi.fn().mockResolvedValue({ error: null }),
    };
    profiles = {
      findById: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.cl', role_id: 1 }),
      updateDisplayName: vi.fn().mockResolvedValue(undefined),
    } as any;

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
    await vi.waitFor(() => expect(facade.currentUser()?.role).toBe('alumno'));

    expect(profiles.findById).toHaveBeenCalledWith('u1');
    expect(facade.currentUser()).toMatchObject({ id: 'u1', name: 'ana', role: 'alumno' });
  });

  it('con sesión entra de inmediato, sin esperar el perfil (sin red tarda más que whenReady)', () => {
    profiles.findById.mockReturnValue(new Promise(() => {})); // nunca responde

    authCallbacks[0]('INITIAL_SESSION', { user: { id: 'u1', email: 'ana@casa.cl' } });

    expect(facade.isAuthenticated()).toBe(true);
    expect(facade.currentUser()).toMatchObject({ id: 'u1', name: 'ana', role: 'unknown' });
  });

  it('si el perfil falla igual deja entrar con rol unknown', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    profiles.findById.mockRejectedValue(new Error('rls'));

    authCallbacks[0]('SIGNED_IN', { user: { id: 'u1', email: 'ana@casa.cl' } });
    await vi.waitFor(() => expect(facade.currentUser()).not.toBeNull());

    expect(facade.currentUser()?.role).toBe('unknown');
  });

  describe('abrir la app sin red (spec 0011, AC8)', () => {
    const networkError = { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 };

    function boot(): AuthFacade {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthFacade,
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ProfilesRepository, useValue: profiles },
          { provide: Router, useValue: mockRouter },
          { provide: NavController, useValue: mockNav },
        ],
      });
      return TestBed.inject(AuthFacade);
    }

    it('si validar la sesión falla por red, entra con la sesión guardada', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabase.getUser.mockResolvedValue({ data: { user: null }, error: networkError });
      mockSupabase.getSession = vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'ana@casa.cl' } } } });
      profiles.findById.mockRejectedValue(new TypeError('Failed to fetch'));

      const offline = boot();
      await offline.whenReady;

      expect(offline.isAuthenticated()).toBe(true);
      expect(offline.currentUser()?.id).toBe('u1');
    });

    it('si el servidor rechaza la sesión (no es red), no entra', async () => {
      mockSupabase.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthApiError', message: 'invalid JWT', status: 401 },
      });
      mockSupabase.getSession = vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

      const rejected = boot();
      await rejected.whenReady;

      expect(mockSupabase.getSession).not.toHaveBeenCalled();
      expect(rejected.isAuthenticated()).toBe(false);
    });
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

  describe('cuenta (spec 0018)', () => {
    beforeEach(async () => {
      authCallbacks[0]('SIGNED_IN', { user: { id: 'u1', email: 'test3@test.com' } });
      await vi.waitFor(() => expect(facade.currentUser()?.role).toBe('alumno'));
    });

    it('rename cambia el nombre en el perfil (lo que ve la familia) y en la sesión (AC1)', async () => {
      expect(await facade.rename('  Benja  ')).toEqual({ ok: true });

      expect((profiles as any).updateDisplayName).toHaveBeenCalledWith('Benja');
      expect(mockSupabase.updateUserMetadata).toHaveBeenCalledWith({ display_name: 'Benja' });
      expect(facade.currentUser()).toMatchObject({ name: 'Benja', initials: initialsOf('Benja') });
    });

    it('rename rechaza vacío o más de 40 caracteres sin ir al servidor', async () => {
      expect(await facade.rename('   ')).toEqual({ ok: false, error: 'Escribe un nombre de 1 a 40 caracteres.' });
      expect((await facade.rename('x'.repeat(41))).ok).toBe(false);
      expect((profiles as any).updateDisplayName).not.toHaveBeenCalled();
    });

    it('rename: si el perfil falla no cambia nada', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (profiles as any).updateDisplayName.mockRejectedValue(new Error('rls'));
      expect((await facade.rename('Benja')).ok).toBe(false);
      expect(mockSupabase.updateUserMetadata).not.toHaveBeenCalled();
      expect(facade.currentUser()?.name).toBe('test3');
    });

    it('changePassword verifica la actual y cambia a la nueva (AC2)', async () => {
      expect(await facade.changePassword('vieja123', 'nueva123', 'nueva123')).toEqual({ ok: true });
      expect(mockSupabase.signIn).toHaveBeenCalledWith('test3@test.com', 'vieja123');
      expect(mockSupabase.updatePassword).toHaveBeenCalledWith('nueva123');
    });

    it('changePassword no cambia si las nuevas no coinciden, si es corta o igual a la actual', async () => {
      expect(await facade.changePassword('vieja123', 'nueva123', 'nueva124')).toEqual({
        ok: false,
        error: 'Las contraseñas nuevas no coinciden.',
      });
      expect((await facade.changePassword('vieja123', 'corta', 'corta')).error).toMatch(/6/);
      expect((await facade.changePassword('vieja123', 'vieja123', 'vieja123')).error).toMatch(/distinta/);
      expect(mockSupabase.signIn).not.toHaveBeenCalled();
      expect(mockSupabase.updatePassword).not.toHaveBeenCalled();
    });

    it('changePassword con la actual equivocada no cambia nada', async () => {
      mockSupabase.signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
      expect(await facade.changePassword('mala1234', 'nueva123', 'nueva123')).toEqual({
        ok: false,
        error: 'La contraseña actual no es correcta.',
      });
      expect(mockSupabase.updatePassword).not.toHaveBeenCalled();
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
