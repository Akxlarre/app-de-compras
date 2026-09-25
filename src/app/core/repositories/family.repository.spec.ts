import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FamilyRepository } from './family.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('FamilyRepository', () => {
  let repo: FamilyRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(FamilyRepository);
  });

  it('getOrCreateFamilyId llama a la RPC y devuelve el id', async () => {
    mock.client.rpc.mockResolvedValue({ data: 'fam-1', error: null });

    expect(await repo.getOrCreateFamilyId()).toBe('fam-1');
    expect(mock.client.rpc).toHaveBeenCalledWith('get_or_create_family');
  });

  it('getOrCreateFamilyId lanza si la RPC falla', async () => {
    const error = { message: 'not_authenticated' };
    mock.client.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.getOrCreateFamilyId()).rejects.toBe(error);
  });

  it('join llama a join_family con el id recortado', async () => {
    mock.client.rpc.mockResolvedValue({ data: 'fam-2', error: null });

    await repo.join('  fam-2 ');

    expect(mock.client.rpc).toHaveBeenCalledWith('join_family', { p_family_id: 'fam-2' });
  });

  it('join lanza si la RPC falla', async () => {
    const error = { message: 'invalid_family_code' };
    mock.client.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.join('x')).rejects.toBe(error);
  });

  it.each([
    ['objeto', { id: 'f', name: 'Casa' }],
    ['arreglo', [{ id: 'f', name: 'Casa' }]],
  ])('findMine normaliza la relación families cuando viene como %s', async (_, families) => {
    const q = queryMock({ data: { families } });
    mock.client.from.mockReturnValue(q);

    expect(await repo.findMine()).toEqual({ id: 'f', name: 'Casa' });
    expect(mock.client.from).toHaveBeenCalledWith('family_members');
  });

  it('findMine devuelve null si no tiene familia', async () => {
    mock.client.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findMine()).toBeNull();
  });
});
