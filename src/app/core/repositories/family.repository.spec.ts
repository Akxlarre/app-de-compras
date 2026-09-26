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
    mock.shop.rpc.mockResolvedValue({ data: 'fam-1', error: null });

    expect(await repo.getOrCreateFamilyId()).toBe('fam-1');
    expect(mock.shop.rpc).toHaveBeenCalledWith('get_or_create_family');
  });

  it('getOrCreateFamilyId lanza si la RPC falla', async () => {
    const error = { message: 'not_authenticated' };
    mock.shop.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.getOrCreateFamilyId()).rejects.toBe(error);
  });

  describe('findMine', () => {
    const row = { id: 'f', name: 'Casa', invite_code: 'ABCDEFGH' };

    it.each([
      ['objeto', row],
      ['arreglo', [row]],
    ])('trae id, nombre, código y mi rol (relación como %s)', async (_, families) => {
      const q = queryMock({ data: { role: 'owner', families } });
      mock.shop.from.mockReturnValue(q);

      expect(await repo.findMine()).toEqual({
        id: 'f',
        name: 'Casa',
        inviteCode: 'ABCDEFGH',
        myRole: 'owner',
      });
      expect(mock.shop.from).toHaveBeenCalledWith('family_members');
      expect(q.select).toHaveBeenCalledWith('role, families(id, name, invite_code)');
    });

    it('lee solo MI membresía (RLS deja ver las de toda la familia)', async () => {
      const q = queryMock({ data: { role: 'member', families: row } });
      mock.shop.from.mockReturnValue(q);

      expect((await repo.findMine())?.myRole).toBe('member');
      expect(q.eq).toHaveBeenCalledWith('user_id', 'me');
    });

    it('devuelve null sin sesión', async () => {
      mock.client.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      expect(await repo.findMine()).toBeNull();
      expect(mock.shop.from).not.toHaveBeenCalled();
    });

    it('devuelve null si no tiene familia', async () => {
      mock.shop.from.mockReturnValue(queryMock({ data: null }));
      expect(await repo.findMine()).toBeNull();
    });
  });

  it('preview devuelve nombre y tamaño de la familia del código', async () => {
    mock.shop.rpc.mockResolvedValue({
      data: [{ name: 'Los Pérez', member_count: 3 }],
      error: null,
    });

    expect(await repo.preview('ABCDEFGH')).toEqual({ name: 'Los Pérez', memberCount: 3 });
    expect(mock.shop.rpc).toHaveBeenCalledWith('preview_family', { p_code: 'ABCDEFGH' });
  });

  it('preview devuelve null si el código no existe', async () => {
    mock.shop.rpc.mockResolvedValue({ data: [], error: null });
    expect(await repo.preview('ZZZZZZZZ')).toBeNull();
  });

  it('joinByCode llama a join_family_by_code', async () => {
    mock.shop.rpc.mockResolvedValue({ data: 'fam-2', error: null });

    await repo.joinByCode('ABCDEFGH');

    expect(mock.shop.rpc).toHaveBeenCalledWith('join_family_by_code', { p_code: 'ABCDEFGH' });
  });

  it('joinByCode lanza el error de la RPC (con su código)', async () => {
    const error = { code: 'P0002', message: 'invalid_family_code' };
    mock.shop.rpc.mockResolvedValue({ data: null, error });
    await expect(repo.joinByCode('x')).rejects.toBe(error);
  });

  it('findMembers mapea los miembros de get_family_members', async () => {
    mock.shop.rpc.mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          name: 'ana',
          role: 'owner',
          joined_at: '2026-09-01T00:00:00Z',
          is_me: true,
        },
      ],
      error: null,
    });

    expect(await repo.findMembers()).toEqual([
      { userId: 'u1', name: 'ana', role: 'owner', joinedAt: '2026-09-01T00:00:00Z', isMe: true },
    ]);
    expect(mock.shop.rpc).toHaveBeenCalledWith('get_family_members');
  });

  it('removeMember llama a remove_family_member', async () => {
    mock.shop.rpc.mockResolvedValue({ data: null, error: null });

    await repo.removeMember('u2');

    expect(mock.shop.rpc).toHaveBeenCalledWith('remove_family_member', { p_user_id: 'u2' });
  });

  it('rename actualiza el nombre de la familia', async () => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);

    await repo.rename('f', 'Los Pérez');

    expect(mock.shop.from).toHaveBeenCalledWith('families');
    expect(q.update).toHaveBeenCalledWith({ name: 'Los Pérez' });
    expect(q.eq).toHaveBeenCalledWith('id', 'f');
  });
});
