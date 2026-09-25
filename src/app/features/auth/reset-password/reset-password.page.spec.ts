import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { ResetPasswordPage } from './reset-password.page';
import { AuthFacade } from '@core/facades/auth.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { FormsModule } from '@angular/forms';

// globals: true en vitest.config.ts — vi disponible sin importar

const mockSupabase = {
  client: {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
};

const mockAuth = {
  isAuthenticated: signal(false),
  updatePassword: vi.fn(),
};

const mockRouter = { navigate: vi.fn() };

describe('ResetPasswordPage', () => {
  let fixture: ComponentFixture<ResetPasswordPage>;
  let component: ResetPasswordPage;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = signal(false);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage, FormsModule],
      providers: [
        { provide: AuthFacade, useValue: mockAuth },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validate()', () => {
    it('returns error when password is empty', () => {
      component.password = '';
      component.confirm = '';
      // @ts-expect-error — private method
      expect(component.validate()).toBe('La contraseña es obligatoria.');
    });

    it('returns error when password is too short', () => {
      component.password = 'abc';
      component.confirm = 'abc';
      // @ts-expect-error — private method
      expect(component.validate()).toContain('al menos 8 caracteres');
    });

    it('returns error when passwords do not match', () => {
      component.password = 'password123';
      component.confirm = 'different123';
      // @ts-expect-error — private method
      expect(component.validate()).toBe('Las contraseñas no coinciden.');
    });

    it('returns null when valid', () => {
      component.password = 'password123';
      component.confirm = 'password123';
      // @ts-expect-error — private method
      expect(component.validate()).toBeNull();
    });
  });

  describe('onSubmit()', () => {
    it('sets errorMsg on validation failure (empty password)', async () => {
      component.password = '';
      component.confirm = '';
      await component.onSubmit();
      expect(component.errorMsg()).toBeTruthy();
    });

    it('calls updatePassword and sets successMsg on success', async () => {
      mockAuth.updatePassword.mockResolvedValue({ error: null });
      component.password = 'newpass123';
      component.confirm = 'newpass123';
      await component.onSubmit();
      expect(mockAuth.updatePassword).toHaveBeenCalledWith('newpass123');
      expect(component.successMsg()).toContain('actualizada');
    });

    it('sets errorMsg on updatePassword failure', async () => {
      mockAuth.updatePassword.mockResolvedValue({ error: new Error('Contraseña débil.') });
      component.password = 'newpass123';
      component.confirm = 'newpass123';
      await component.onSubmit();
      expect(component.errorMsg()).toBeTruthy();
      expect(component.successMsg()).toBe('');
    });

    it('redirects to /app after 1.5s on success', async () => {
      vi.useFakeTimers();
      mockAuth.updatePassword.mockResolvedValue({ error: null });
      component.password = 'newpass123';
      component.confirm = 'newpass123';
      await component.onSubmit();
      vi.advanceTimersByTime(1500);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app']);
      vi.useRealTimers();
    });
  });

  describe('tokenError', () => {
    it('sets tokenError after 3s if user is not authenticated', async () => {
      vi.useFakeTimers();
      mockAuth.isAuthenticated = signal(false);
      component.ngOnInit();
      vi.advanceTimersByTime(3000);
      expect(component.tokenError()).toBe(true);
      vi.useRealTimers();
    });

    it('does NOT set tokenError if user is already authenticated', async () => {
      vi.useFakeTimers();
      mockAuth.isAuthenticated = signal(true);
      component.ngOnInit();
      vi.advanceTimersByTime(3000);
      expect(component.tokenError()).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('goToLogin()', () => {
    it('navigates to /login', () => {
      component.goToLogin();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
