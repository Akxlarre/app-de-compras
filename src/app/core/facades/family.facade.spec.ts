import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FamilyFacade } from './family.facade';
import { FamilyRepository } from '../repositories/family.repository';

describe('FamilyFacade', () => {
  let facade: FamilyFacade;
  let repo: { findMine: ReturnType<typeof vi.fn>; join: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = {
      findMine: vi.fn().mockResolvedValue({ id: 'fam-2', name: 'Casa' }),
      join: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [FamilyFacade, { provide: FamilyRepository, useValue: repo }],
    });
    facade = TestBed.inject(FamilyFacade);
  });

  it('loadMyFamily expone la familia del usuario', async () => {
    await facade.loadMyFamily();

    expect(facade.currentFamily()).toEqual({ id: 'fam-2', name: 'Casa' });
    expect(facade.isLoading()).toBe(false);
  });

  it('loadMyFamily setea error si falla', async () => {
    repo.findMine.mockRejectedValue(new Error('rls'));

    await facade.loadMyFamily();

    expect(facade.error()).toBe('Error cargando datos de familia');
  });

  it('joinFamily se une por el repositorio y recarga la familia', async () => {
    const ok = await facade.joinFamily('fam-2');

    expect(ok).toBe(true);
    expect(repo.join).toHaveBeenCalledWith('fam-2');
    expect(facade.currentFamily()).toEqual({ id: 'fam-2', name: 'Casa' });
    expect(facade.isLoading()).toBe(false);
  });

  it('joinFamily devuelve false y setea error si el código es inválido', async () => {
    repo.join.mockRejectedValue({ message: 'invalid_family_code' });

    const ok = await facade.joinFamily('no-existe');

    expect(ok).toBe(false);
    expect(facade.error()).toBe('Código inválido o ya estás en esta familia');
    expect(repo.findMine).not.toHaveBeenCalled();
  });
});
