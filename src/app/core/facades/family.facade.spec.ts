import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FamilyFacade } from './family.facade';
import { FamilyRepository } from '../repositories/family.repository';
import { SessionScopeService } from '../services/auth/session-scope.service';
import { ToastService } from '../services/ui/toast.service';

const FAMILY = { id: 'fam-1', name: 'Casa', inviteCode: 'ABCDEFGH', myRole: 'owner' as const };
const ME = {
  userId: 'u1',
  name: 'ana',
  role: 'owner' as const,
  joinedAt: '2026-09-01',
  isMe: true,
};
const BETO = {
  userId: 'u2',
  name: 'beto',
  role: 'member' as const,
  joinedAt: '2026-09-02',
  isMe: false,
};

describe('FamilyFacade', () => {
  let facade: FamilyFacade;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    repo = {
      getOrCreateFamilyId: vi.fn().mockResolvedValue('f'),
      findMine: vi.fn().mockResolvedValue(FAMILY),
      findMembers: vi.fn().mockResolvedValue([ME, BETO]),
      preview: vi.fn().mockResolvedValue({ name: 'Los Pérez', memberCount: 2 }),
      joinByCode: vi.fn().mockResolvedValue(undefined),
      removeMember: vi.fn().mockResolvedValue(undefined),
      rename: vi.fn().mockResolvedValue(undefined),
    };
    toast = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        FamilyFacade,
        { provide: FamilyRepository, useValue: repo },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(FamilyFacade);
  });

  describe('loadMyFamily', () => {
    it('asegura que haya familia antes de leerla (quien fue quitado queda sin familia)', async () => {
      await facade.loadMyFamily();

      const ensured = repo.getOrCreateFamilyId.mock.invocationCallOrder[0];
      expect(ensured).toBeLessThan(repo.findMine.mock.invocationCallOrder[0]);
      expect(ensured).toBeLessThan(repo.findMembers.mock.invocationCallOrder[0]);
    });

    it('carga la familia y sus miembros', async () => {
      await facade.loadMyFamily();

      expect(facade.currentFamily()).toEqual(FAMILY);
      expect(facade.members()).toEqual([ME, BETO]);
      expect(facade.isOwner()).toBe(true);
      expect(facade.isLoading()).toBe(false);
    });

    it('memberNames: id → nombre, y yo como "Tú"', async () => {
      await facade.loadMyFamily();

      expect(facade.memberNames().get('u1')).toBe('Tú');
      expect(facade.memberNames().get('u2')).toBe('beto');
      expect(facade.hasOtherMembers()).toBe(true);
    });

    it('sin otros miembros, hasOtherMembers es false', async () => {
      repo['findMembers'].mockResolvedValue([ME]);
      await facade.loadMyFamily();
      expect(facade.hasOtherMembers()).toBe(false);
    });

    it('un miembro que no es dueño no es isOwner', async () => {
      repo['findMine'].mockResolvedValue({ ...FAMILY, myRole: 'member' });
      await facade.loadMyFamily();
      expect(facade.isOwner()).toBe(false);
    });

    it('setea error si falla', async () => {
      repo['findMine'].mockRejectedValue(new Error('rls'));

      await facade.loadMyFamily();

      expect(facade.error()).toBe('Error cargando datos de familia');
    });
  });

  describe('unirse por código', () => {
    it('preview normaliza el código y pregunta al repositorio', async () => {
      expect(await facade.preview('abcd-efgh')).toEqual({ name: 'Los Pérez', memberCount: 2 });
      expect(repo['preview']).toHaveBeenCalledWith('ABCDEFGH');
    });

    it('preview de un código mal escrito no llama al repositorio', async () => {
      expect(await facade.preview('ABC')).toBeNull();
      expect(repo['preview']).not.toHaveBeenCalled();
    });

    it('joinByCode se une y recarga la familia', async () => {
      expect(await facade.joinByCode('abcd-efgh')).toBe('joined');
      expect(repo['joinByCode']).toHaveBeenCalledWith('ABCDEFGH');
      expect(repo['findMine']).toHaveBeenCalled();
    });

    it.each([
      [{ code: 'P0002', message: 'invalid_family_code' }, 'invalid_code'],
      [{ code: '23505', message: 'already_member' }, 'already_member'],
      [new Error('Failed to fetch'), 'error'],
    ])('joinByCode traduce el error %o → %s', async (error, result) => {
      repo['joinByCode'].mockRejectedValue(error);
      expect(await facade.joinByCode('ABCDEFGH')).toBe(result);
    });

    it('joinByCode con un código mal escrito no llama al repositorio', async () => {
      expect(await facade.joinByCode('xyz')).toBe('invalid_code');
      expect(repo['joinByCode']).not.toHaveBeenCalled();
    });
  });

  describe('administrar', () => {
    beforeEach(async () => {
      await facade.loadMyFamily();
      vi.clearAllMocks();
    });

    it('removeMember quita y recarga miembros y código (rotado)', async () => {
      repo['findMine'].mockResolvedValue({ ...FAMILY, inviteCode: 'ZZZZZZZZ' });
      repo['findMembers'].mockResolvedValue([ME]);

      expect(await facade.removeMember('u2')).toBe(true);

      expect(repo['removeMember']).toHaveBeenCalledWith('u2');
      expect(facade.members()).toEqual([ME]);
      expect(facade.currentFamily()?.inviteCode).toBe('ZZZZZZZZ');
      expect(toast.success).toHaveBeenCalled();
    });

    it('removeMember devuelve false si falla, avisa y no toca los miembros', async () => {
      repo['removeMember'].mockRejectedValue({ code: '42501', message: 'not_owner' });

      expect(await facade.removeMember('u2')).toBe(false);
      expect(facade.members()).toEqual([ME, BETO]);
      expect(toast.error).toHaveBeenCalled();
    });

    it('rename guarda el nombre recortado y lo refleja', async () => {
      expect(await facade.rename('  Los Pérez  ')).toBe(true);

      expect(repo['rename']).toHaveBeenCalledWith('fam-1', 'Los Pérez');
      expect(facade.currentFamily()?.name).toBe('Los Pérez');
    });

    it('rename con un nombre vacío no guarda y avisa', async () => {
      expect(await facade.rename('   ')).toBe(false);
      expect(repo['rename']).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it('rename devuelve false si falla, avisa y conserva el nombre', async () => {
      repo['rename'].mockRejectedValue(new Error('rls'));

      expect(await facade.rename('Otro')).toBe(false);
      expect(facade.currentFamily()?.name).toBe('Casa');
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('cierre de sesión: olvida la familia y los miembros', async () => {
    await facade.loadMyFamily();

    TestBed.inject(SessionScopeService).clear();

    expect(facade.currentFamily()).toBeNull();
    expect(facade.members()).toEqual([]);
    expect(facade.error()).toBeNull();
  });
});
