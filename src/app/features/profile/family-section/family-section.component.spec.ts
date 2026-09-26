import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FamilySectionComponent } from './family-section.component';
import { FamilyFacade } from '@core/facades/family.facade';
import { ToastService } from '@core/services/ui/toast.service';

const ME = { userId: 'u1', name: 'ana', role: 'owner', joinedAt: '', isMe: true };
const BETO = { userId: 'u2', name: 'beto', role: 'member', joinedAt: '', isMe: false };

describe('FamilySectionComponent', () => {
  let cmp: FamilySectionComponent;
  let facade: any;
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  let alerts: { create: ReturnType<typeof vi.fn> };
  const lastAlert = () => alerts.create.mock.calls.at(-1)![0];
  const button = (text: RegExp) => lastAlert().buttons.find((b: any) => text.test(b.text));

  beforeEach(() => {
    const members = signal<any[]>([ME, BETO]);
    facade = {
      currentFamily: signal({ id: 'f', name: 'Casa', inviteCode: 'ABCDEFGH', myRole: 'owner' }),
      members,
      isOwner: signal(true),
      isLoading: signal(false),
      error: signal(null),
      hasOtherMembers: computed(() => members().length > 1),
      loadMyFamily: vi.fn(),
      preview: vi.fn().mockResolvedValue({ name: 'Los Pérez', memberCount: 2 }),
      joinByCode: vi.fn().mockResolvedValue('joined'),
      removeMember: vi.fn().mockResolvedValue(true),
      rename: vi.fn().mockResolvedValue(true),
    };
    toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
    alerts = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };

    TestBed.configureTestingModule({
      providers: [
        FamilySectionComponent,
        { provide: FamilyFacade, useValue: facade },
        { provide: ToastService, useValue: toast },
        { provide: AlertController, useValue: alerts },
      ],
    });
    cmp = TestBed.inject(FamilySectionComponent);
    vi.spyOn(cmp, 'reloadApp').mockImplementation(() => {});
  });

  it('muestra el código en dos grupos', () => {
    expect(cmp.displayCode()).toBe('ABCD-EFGH');
  });

  describe('unirse', () => {
    it('un código mal escrito avisa sin consultar', async () => {
      await cmp.joinWithCode('abc');

      expect(facade.preview).not.toHaveBeenCalled();
      expect(toast['error']).toHaveBeenCalled();
      expect(alerts.create).not.toHaveBeenCalled();
    });

    it('un código que no existe avisa sin pedir confirmación', async () => {
      facade.preview.mockResolvedValue(null);

      await cmp.joinWithCode('ZZZZ-ZZZZ');

      expect(toast['error']).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/código/i)
      );
      expect(alerts.create).not.toHaveBeenCalled();
    });

    it('pide confirmación mostrando a qué familia se une y qué deja', async () => {
      await cmp.joinWithCode('wxyz-2345');

      const alert = lastAlert();
      expect(alert.header).toContain('Los Pérez');
      expect(alert.message).toContain('2 miembros');
      expect(alert.message).toContain('Casa');
      expect(facade.joinByCode).not.toHaveBeenCalled();

      await button(/unirme/i).handler();
      expect(facade.joinByCode).toHaveBeenCalledWith('WXYZ2345');
      expect(cmp.reloadApp).toHaveBeenCalled();
    });

    it('si soy el único miembro, advierte que no podré volver a ver mis listas', async () => {
      facade.members.set([ME]);

      await cmp.joinWithCode('WXYZ2345');

      expect(lastAlert().message).toMatch(/no podrás volver a ver/i);
    });

    it.each([
      ['already_member', /ya/i],
      ['invalid_code', /código/i],
      ['error', /intenta/i],
    ])('si joinByCode devuelve %s, avisa y no recarga', async (result, text) => {
      facade.joinByCode.mockResolvedValue(result);

      await cmp.joinWithCode('WXYZ2345');
      await button(/unirme/i).handler();

      expect(toast['error']).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(text));
      expect(cmp.reloadApp).not.toHaveBeenCalled();
    });
  });

  describe('administrar', () => {
    it('quitar un miembro pide confirmación', async () => {
      await cmp.removeMember(BETO as any);

      expect(lastAlert().message).toContain('beto');
      expect(facade.removeMember).not.toHaveBeenCalled();

      await button(/quitar/i).handler();
      expect(facade.removeMember).toHaveBeenCalledWith('u2');
      expect(toast['success']).toHaveBeenCalled();
    });

    it('si quitar falla, avisa', async () => {
      facade.removeMember.mockResolvedValue(false);

      await cmp.removeMember(BETO as any);
      await button(/quitar/i).handler();

      expect(toast['error']).toHaveBeenCalled();
    });

    it('renombrar guarda el nombre ingresado', async () => {
      await cmp.renameFamily();

      expect(lastAlert().inputs[0].value).toBe('Casa');
      await button(/guardar/i).handler({ name: 'Los Pérez' });
      expect(facade.rename).toHaveBeenCalledWith('Los Pérez');
    });
  });
});
