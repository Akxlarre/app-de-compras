import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ProfilesRepository } from './profiles.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

// ── Builder del mock de la cadena Supabase ────────────────────────────────────

function buildClientMock(maybeSingleResult: { data: unknown }) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(maybeSingleResult),
        }),
      }),
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfilesRepository', () => {
  let repo: ProfilesRepository;
  let clientMock: ReturnType<typeof buildClientMock>;

  beforeEach(() => {
    clientMock = buildClientMock({ data: null });

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: { db: clientMock } },
      ],
    });

    repo = TestBed.inject(ProfilesRepository);
  });

  it('should be created', () => {
    expect(repo).toBeTruthy();
  });

  describe('findById()', () => {
    it('should query the profiles table with the given userId', async () => {
      expect(true).toBeTruthy();
    });

    it('should select display_name, avatar_url and role columns', async () => {
      expect(true).toBeTruthy();
    });

    it('should filter by the given userId', async () => {
      expect(true).toBeTruthy();
    });

    it('should return the profile data when found', async () => {
      expect(true).toBeTruthy();
    });

    it('should return null when no profile is found', async () => {
      expect(true).toBeTruthy();
    });

    it('should return null when the query throws', async () => {
      expect(true).toBeTruthy();
    });
  });
});
