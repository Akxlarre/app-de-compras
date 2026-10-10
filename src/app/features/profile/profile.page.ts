import {
  Component,
  ChangeDetectionStrategy,
  inject,
  AfterViewInit,
  ElementRef,
  OnInit,
} from '@angular/core';
import {
  AlertController,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular';
import { ToastService } from '@core/services/ui/toast.service';
import { AuthFacade } from '@core/facades/auth.facade';
import { AppUpdateFacade } from '@core/facades/app-update.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { FamilySectionComponent } from './family-section/family-section.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    AppHeaderComponent,
    IconComponent,
    FamilySectionComponent,
  ],
  template: `
    <ion-content class="profile-content tier-trabajo" [fullscreen]="true">
      <app-header title="Perfil"></app-header>
      @if (auth.currentUser(); as user) {
      <!-- Encabezado en una fila (spec 0018 AC3) -->
      <div class="profile-hero" data-anim="bloque" data-testid="perfil-encabezado">
        <div class="avatar" aria-hidden="true">{{ user.initials }}</div>
        <div class="who">
          <h2 class="user-name">{{ user.name }}</h2>
          <p class="user-email">{{ user.email }}</p>
        </div>
        <button
          class="edit-name-btn"
          aria-label="Editar mi nombre"
          data-llm-action="actualizar-nombre"
          (click)="editName()"
        >
          Editar
        </button>
      </div>

      <app-family-section data-anim="bloque" />

      <div class="options-section" data-anim="bloque">
        <p class="section-label">Cuenta</p>
        <ion-list class="options-list">
          <ion-item
            button
            detail="false"
            lines="none"
            class="option-item"
            data-llm-action="cambiar-contrasena"
            (click)="changePassword()"
          >
            <app-icon
              name="lock"
              slot="start"
              class="option-icon"
              [size]="20"
              [ariaHidden]="true"
            />
            <ion-label>Cambiar contraseña</ion-label>
            <app-icon
              name="chevron-right"
              slot="end"
              class="chevron-icon"
              [size]="18"
              [ariaHidden]="true"
            />
          </ion-item>
          <ion-item
            button
            detail="false"
            lines="none"
            class="option-item"
            (click)="checkForUpdates()"
          >
            <app-icon
              name="download"
              slot="start"
              class="option-icon"
              [size]="20"
              [ariaHidden]="true"
            />
            <ion-label>
              Buscar actualizaciones @if (updateFacade.currentVersion(); as version) {
              <p class="version" data-testid="version">Versión {{ version }}</p>
              }
            </ion-label>
            @if (updateFacade.isChecking()) {
            <ion-spinner slot="end" name="crescent" class="update-spinner"></ion-spinner>
            } @else {
            <app-icon
              name="chevron-right"
              slot="end"
              class="chevron-icon"
              [size]="18"
              [ariaHidden]="true"
            />
            }
          </ion-item>
        </ion-list>
      </div>

      <div class="logout-section" data-anim="bloque">
        <button class="logout-btn" (click)="logout()">
          <app-icon name="log-out" [size]="20" [ariaHidden]="true" />
          Cerrar sesión
        </button>
      </div>
      } @else {
      <div class="empty-state">
        <p>No has iniciado sesión.</p>
      </div>
      }
    </ion-content>
  `,
  styles: [
    `
      /* Sin regla de fondo propia: la global de ion-content ya pinta la
         tinta (fix-028). */

      /* Una fila: la familia empieza arriba, no en y≈350 (spec 0018, P2). */
      .profile-hero {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem 1rem 1rem;
      }

      /* Ember sólido con iniciales en tinta: 7.0:1, el mismo par del chip activo. Es el único
         acento de marca decorativo de la vista. */
      .avatar {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--ds-brand);
        color: var(--color-primary-text);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        font-weight: 700;
      }

      .who {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        margin: 0;
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .user-email {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .edit-name-btn {
        flex-shrink: 0;
        min-height: var(--target-min);
        padding: 0 0.75rem;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-default);
        background: transparent;
        color: var(--text-primary);
        font-size: 0.875rem;
        font-weight: 600;
      }

      .version {
        margin: 2px 0 0 0;
        font-size: var(--text-xs);
        color: var(--text-muted);
      }

      .options-section {
        padding: 0 1rem;
      }

      /* Medía 12px, bajo el piso de 13. */
      .section-label {
        font-size: var(--text-sm);
        font-weight: 700;
        color: var(--text-muted);
        padding: 0 4px;
        margin: 0 0 0.5rem 0;
      }

      .options-list {
        background: transparent;
        padding: 0;
      }

      .option-item {
        --background: var(--bg-surface);
        --color: var(--text-primary);
        --border-radius: 12px;
        --padding-start: 16px;
        --padding-end: 16px;
        --min-height: 52px;
        margin-bottom: 4px;
      }

      .option-icon {
        color: var(--text-muted);
        margin-right: 12px;
      }

      .chevron-icon {
        color: var(--text-muted);
      }

      .update-spinner {
        width: 18px;
        height: 18px;
        color: var(--ds-brand);
      }

      .logout-section {
        padding: 2rem 1rem;
      }

      /* "Cerrar sesión" por encima de la barra flotante (spec 0013, Q1). */
      .profile-content {
        --padding-bottom: calc(var(--chrome-bottom) + var(--space-6));
      }

      .logout-btn {
        width: 100%;
        padding: 0.9rem;
        background: var(--state-error-bg);
        border: 1px solid var(--state-error-border);
        border-radius: 12px;
        color: var(--state-error);
        font-weight: 700;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .logout-btn:active {
        background: var(--state-error-border);
        transform: scale(0.98);
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class ProfilePage implements OnInit, AfterViewInit {
  auth = inject(AuthFacade);
  updateFacade = inject(AppUpdateFacade);
  gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);
  private alerts = inject(AlertController);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.updateFacade.loadVersion();
  }

  ngAfterViewInit() {
    // Acotado al host: Ionic mantiene otras vistas en el DOM, y el
    // querySelectorAll global de antes también podía encontrar las suyas.
    this.gsap.animateTierEnter(this.host.nativeElement.querySelector('.tier-trabajo'));
  }

  async checkForUpdates() {
    await this.updateFacade.checkForUpdates('manual');
  }

  async logout() {
    await this.auth.logout();
  }

  /** Nombre propio (spec 0018 AC1): lo ven los demás miembros de la familia. */
  async editName(): Promise<void> {
    const name = await this.ask<string>({
      header: 'Tu nombre',
      message: 'Lo ven los demás miembros de tu familia (también en Entrenamiento).',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: this.auth.currentUser()?.name ?? '',
          attributes: { maxlength: 40 },
        },
      ],
      confirm: 'Guardar',
      value: (data?: { name?: string }) => data?.name ?? '',
    });
    if (name === null) return;
    const result = await this.auth.rename(name);
    if (result.ok) this.toast.success('Nombre actualizado');
    else if (result.error) this.toast.warning('No se cambió el nombre', result.error);
  }

  /** Cambiar contraseña estando dentro (spec 0018 AC2). */
  async changePassword(): Promise<void> {
    const data = await this.ask<{ current?: string; next?: string; repeat?: string }>({
      header: 'Cambiar contraseña',
      message: 'También cambia la de Entrenamiento: es la misma cuenta.',
      inputs: [
        { name: 'current', type: 'password', placeholder: 'Contraseña actual' },
        { name: 'next', type: 'password', placeholder: 'Nueva (mínimo 6)' },
        { name: 'repeat', type: 'password', placeholder: 'Repite la nueva' },
      ],
      confirm: 'Cambiar',
      value: (d?: { current?: string; next?: string; repeat?: string }) => d ?? {},
    });
    if (data === null) return;
    const result = await this.auth.changePassword(
      data.current ?? '',
      data.next ?? '',
      data.repeat ?? ''
    );
    if (result.ok) this.toast.success('Contraseña cambiada');
    else if (result.error) this.toast.warning('No se cambió la contraseña', result.error);
  }

  /** Alerta con inputs y un botón que resuelve un valor, más "Cancelar" (resuelve null). */
  private ask<T>(opts: {
    header: string;
    message?: string;
    inputs: { name: string; type: 'text' | 'password'; value?: string; placeholder?: string; attributes?: object }[];
    confirm: string;
    value: (data?: any) => T;
  }): Promise<T | null> {
    return new Promise<T | null>(async (resolve) => {
      const alert = await this.alerts.create({
        header: opts.header,
        message: opts.message,
        inputs: opts.inputs,
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn', handler: () => resolve(null) },
          { text: opts.confirm, role: 'confirm', handler: (data?: unknown) => resolve(opts.value(data)) },
        ],
      });
      alert.onDidDismiss().then(() => resolve(null));
      await alert.present();
    });
  }
}
