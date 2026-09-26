import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AlertController } from '@ionic/angular';
import { FamilyFacade, type FamilyMemberView } from '@core/facades/family.facade';
import { formatInviteCode, normalizeInviteCode } from '@core/utils/family.utils';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Perfil → Tu familia: código para invitar, miembros, renombrar y unirse a otra familia.
 * Los avisos de quitar/renombrar los da el facade (toast); los de unirse van junto al campo.
 */
@Component({
  selector: 'app-family-section',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './family-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilySectionComponent implements OnInit {
  readonly facade = inject(FamilyFacade);
  private readonly alerts = inject(AlertController);

  /** Por qué no se pudo unir (se muestra bajo el campo del código). */
  readonly joinError = signal<string | null>(null);
  /** El botón de copiar muestra un check un momento. */
  readonly copied = signal(false);

  readonly displayCode = computed(() => {
    const code = this.facade.currentFamily()?.inviteCode;
    return code ? formatInviteCode(code) : '';
  });

  ngOnInit(): void {
    this.facade.loadMyFamily();
  }

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.displayCode());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el código sigue visible para copiarlo a mano.
    }
  }

  async shareCode(): Promise<void> {
    const family = this.facade.currentFamily();
    if (!family) return;
    if (!navigator.share) {
      await this.copyCode();
      return;
    }
    try {
      await navigator.share({
        title: 'Únete a mi familia',
        text: `Únete a «${family.name}» en la app de compras con el código ${this.displayCode()}`,
      });
    } catch {
      // El usuario cerró el menú de compartir.
    }
  }

  async renameFamily(): Promise<void> {
    const family = this.facade.currentFamily();
    if (!family) return;
    const alert = await this.alerts.create({
      header: 'Nombre de la familia',
      cssClass: 'premium-alert',
      inputs: [{ name: 'name', type: 'text', value: family.name, attributes: { maxlength: 40 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Guardar',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: (data?: { name?: string }) => this.facade.rename(data?.name ?? ''),
        },
      ],
    });
    await alert.present();
  }

  async removeMember(member: FamilyMemberView): Promise<void> {
    const alert = await this.alerts.create({
      header: `¿Quitar a ${member.name}?`,
      message: `${member.name} dejará de ver las listas de la familia. El código para invitar cambiará para que no pueda volver a entrar con el anterior.`,
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Quitar',
          role: 'destructive',
          handler: () => this.facade.removeMember(member.userId),
        },
      ],
    });
    await alert.present();
  }

  /** Muestra a qué familia apunta el código y pide confirmar: unirse deja la familia actual. */
  async joinWithCode(input: string): Promise<void> {
    this.joinError.set(null);
    const code = normalizeInviteCode(input);
    if (!code) {
      this.joinError.set('El código son 8 letras y números, por ejemplo ABCD-EFGH.');
      return;
    }
    if (code === this.facade.currentFamily()?.inviteCode) {
      this.joinError.set('Ya estás en esa familia.');
      return;
    }

    const preview = await this.facade.preview(code);
    if (!preview) {
      this.joinError.set('No hay ninguna familia con ese código. Revísalo.');
      return;
    }

    const current = this.facade.currentFamily()?.name ?? 'tu familia actual';
    const size = `${preview.memberCount} ${preview.memberCount === 1 ? 'miembro' : 'miembros'}`;
    const leaving =
      this.facade.members().length <= 1
        ? `Eres el único miembro de «${current}»: no podrás volver a ver sus listas, catálogo ni historial.`
        : `Dejarás «${current}»; sus listas siguen con los demás miembros.`;

    const alert = await this.alerts.create({
      header: `¿Unirte a «${preview.name}»?`,
      message: `Tiene ${size}. ${leaving}`,
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Unirme',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: () => this.confirmJoin(code),
        },
      ],
    });
    await alert.present();
  }

  /** Recarga la app en Mi Lista: todas las pantallas pasan a la familia nueva. */
  reloadApp(): void {
    window.location.assign('/app/active');
  }

  private async confirmJoin(code: string): Promise<void> {
    const messages = {
      already_member: 'Ya estás en esa familia.',
      invalid_code: 'Ese código ya no sirve; pide uno nuevo.',
      error: 'No se pudo unir. Revisa tu conexión e intenta de nuevo.',
    } as const;

    const result = await this.facade.joinByCode(code);
    if (result === 'joined') {
      this.reloadApp();
      return;
    }
    this.joinError.set(messages[result]);
  }
}
