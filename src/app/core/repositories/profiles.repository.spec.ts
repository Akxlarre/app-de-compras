import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProfilesRepository } from './profiles.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('ProfilesRepository', () => {
  let repo: ProfilesRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ProfilesRepository);
  });

  it('findById consulta las columnas reales de profiles filtrando por id', async () => {
    const q = queryMock({ data: { id: 'u1', email: 'a@b.cl', role_id: 1 } });
    mock.client.from.mockReturnValue(q);

    const profile = await repo.findById('u1');

    expect(mock.client.from).toHaveBeenCalledWith('profiles');
    expect(q.select).toHaveBeenCalledWith('id, email, role_id');
    expect(q.eq).toHaveBeenCalledWith('id', 'u1');
    expect(profile).toEqual({ id: 'u1', email: 'a@b.cl', role_id: 1 });
  });

  it('findById devuelve null si no existe', async () => {
    mock.client.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findById('u1')).toBeNull();
  });

  it('findById lanza el error de Supabase', async () => {
    const error = { message: 'rls' };
    mock.client.from.mockReturnValue(queryMock({ error }));
    await expect(repo.findById('u1')).rejects.toBe(error);
  });

  it('updateDisplayName usa la RPC set_my_display_name (la policy de UPDATE de profiles es recursiva, spec 0018)', async () => {
    mock.client.rpc.mockResolvedValue({ data: 'Benja', error: null });

    await repo.updateDisplayName('Benja');
    expect(mock.client.rpc).toHaveBeenCalledWith('set_my_display_name', { p_name: 'Benja' });
    expect(mock.client.from).not.toHaveBeenCalled();
  });

  it('updateDisplayName lanza el error de Supabase', async () => {
    const error = { message: 'invalid_name' };
    mock.client.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.updateDisplayName('x')).rejects.toBe(error);
  });
});
