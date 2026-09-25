import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthFacade } from './auth.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

const mockSupabase = {
  client: {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
  getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
};

const mockRouter = { navigate: vi.fn() };

describe('AuthFacade', () => {
  let facade: AuthFacade;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: Router, useValue: mockRouter },
      ],
    });

    facade = TestBed.inject(AuthFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  it('should initialize currentUser as null', () => {
    expect(facade.currentUser()).toBeNull();
    expect(facade.isAuthenticated()).toBe(false);
  });

  it('should handle logout', async () => {
    await facade.logout();
    expect(mockSupabase.signOut).toHaveBeenCalled();
    expect(facade.currentUser()).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
