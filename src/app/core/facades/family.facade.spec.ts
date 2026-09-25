import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FamilyFacade } from './family.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';

describe('FamilyFacade', () => {
  let facade: FamilyFacade;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        rpc: vi.fn().mockResolvedValue({ data: 'fam-2', error: null }),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { family_id: 'fam-2', families: { id: 'fam-2', name: 'Casa' } },
          error: null,
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [FamilyFacade, { provide: SupabaseService, useValue: mockSupabase }],
    });
    facade = TestBed.inject(FamilyFacade);
  });

  it('joinFamily se une vía la RPC join_family, sin INSERT directo', async () => {
    const ok = await facade.joinFamily('  fam-2  ');

    expect(ok).toBe(true);
    expect(mockSupabase.client.rpc).toHaveBeenCalledWith('join_family', { p_family_id: 'fam-2' });
    expect(mockSupabase.client.insert).not.toHaveBeenCalled();
    expect(facade.currentFamily()).toEqual({ id: 'fam-2', name: 'Casa' });
  });

  it('joinFamily devuelve false y setea error si la RPC falla', async () => {
    mockSupabase.client.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid_family_code' },
    });

    const ok = await facade.joinFamily('no-existe');

    expect(ok).toBe(false);
    expect(facade.error()).toBeTruthy();
  });
});
