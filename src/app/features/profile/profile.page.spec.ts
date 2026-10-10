import { TestBed } from '@angular/core/testing';
import { ElementRef, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfilePage } from './profile.page';
import { AuthFacade } from '@core/facades/auth.facade';
import { AppUpdateFacade } from '@core/facades/app-update.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { ToastService } from '@core/services/ui/toast.service';

describe('ProfilePage (spec 0018)', () => {
  let page: ProfilePage;
  let auth: any;
  let updates: any;
  let alerts: { create: ReturnType<typeof vi.fn> };
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  const lastAlert = () => alerts.create.mock.calls.at(-1)![0];
  const press = (text: string, data?: unknown) =>
    lastAlert()
      .buttons.find((b: any) => b.text === text)
      .handler(data);

  beforeEach(() => {
    auth = {
      currentUser: signal({ id: 'u1', name: 'test3', email: 'test3@test.com', initials: 'T3' }),
      rename: vi.fn().mockResolvedValue({ ok: true }),
      changePassword: vi.fn().mockResolvedValue({ ok: true }),
      logout: vi.fn(),
    };
    updates = {
      currentVersion: signal<string | null>('1.0.7'),
      isChecking: signal(false),
      loadVersion: vi.fn(),
      checkForUpdates: vi.fn(),
    };
    alerts = {
      create: vi
        .fn()
        .mockResolvedValue({ present: vi.fn(), onDidDismiss: () => new Promise(() => {}) }),
    };
    toast = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ProfilePage,
        { provide: AuthFacade, useValue: auth },
        { provide: AppUpdateFacade, useValue: updates },
        { provide: AlertController, useValue: alerts },
        { provide: ToastService, useValue: toast },
        { provide: GsapAnimationsService, useValue: { animateTierEnter: vi.fn() } },
        { provide: ElementRef, useValue: new ElementRef(document.createElement('div')) },
      ],
    });
    page = TestBed.inject(ProfilePage);
  });

  it('al abrir carga la versión instalada (AC5)', () => {
    page.ngOnInit();
    expect(updates.loadVersion).toHaveBeenCalled();
  });

  it('editar el nombre parte con el actual y guarda el nuevo (AC1)', async () => {
    const done = page.editName();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    expect(lastAlert().inputs[0].value).toBe('test3');
    press('Guardar', { name: 'Benja' });
    await done;

    expect(auth.rename).toHaveBeenCalledWith('Benja');
    expect(toast['success']).toHaveBeenCalledWith('Nombre actualizado');
  });

  it('si el nombre no es válido, avisa con el motivo', async () => {
    auth.rename.mockResolvedValue({ ok: false, error: 'Escribe un nombre de 1 a 40 caracteres.' });
    const done = page.editName();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    press('Guardar', { name: '' });
    await done;

    expect(toast['warning']).toHaveBeenCalledWith(
      'No se cambió el nombre',
      'Escribe un nombre de 1 a 40 caracteres.'
    );
  });

  it('cambiar contraseña pide la actual y la nueva dos veces (AC2)', async () => {
    const done = page.changePassword();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    expect(lastAlert().inputs.map((i: any) => [i.name, i.type])).toEqual([
      ['current', 'password'],
      ['next', 'password'],
      ['repeat', 'password'],
    ]);
    press('Cambiar', { current: 'vieja123', next: 'nueva123', repeat: 'nueva123' });
    await done;

    expect(auth.changePassword).toHaveBeenCalledWith('vieja123', 'nueva123', 'nueva123');
    expect(toast['success']).toHaveBeenCalledWith('Contraseña cambiada');
  });

  it('si la contraseña actual está mal, avisa y no dice que cambió', async () => {
    auth.changePassword.mockResolvedValue({
      ok: false,
      error: 'La contraseña actual no es correcta.',
    });
    const done = page.changePassword();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    press('Cambiar', { current: 'mala', next: 'nueva123', repeat: 'nueva123' });
    await done;

    expect(toast['warning']).toHaveBeenCalledWith(
      'No se cambió la contraseña',
      'La contraseña actual no es correcta.'
    );
    expect(toast['success']).not.toHaveBeenCalled();
  });

  it('cancelar no cambia nada', async () => {
    const done = page.editName();
    await vi.waitFor(() => expect(alerts.create).toHaveBeenCalled());
    press('Cancelar');
    await done;
    expect(auth.rename).not.toHaveBeenCalled();
  });
});
