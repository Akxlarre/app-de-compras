import {
  Component,
  ChangeDetectionStrategy,
  inject,
  AfterViewInit,
  ElementRef,
  OnInit
} from '@angular/core';
import { IonContent, IonItem, IonLabel, IonList, IonSpinner } from '@ionic/angular';
import { AuthFacade } from '@core/facades/auth.facade';
import { AppUpdateFacade } from '@core/facades/app-update.facade';
import { FamilyFacade } from '@core/facades/family.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { ToastService } from '@core/services/ui/toast.service';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonItem, IonLabel, IonList, IonSpinner, AppHeaderComponent, IconComponent],
  template: `
    <ion-content class="profile-content tier-trabajo" [fullscreen]="true">
      <app-header title="Perfil"></app-header>
      @if (auth.currentUser(); as user) {
        <div class="profile-hero" data-anim="bloque">
          <div class="avatar">
            {{ user.initials }}
          </div>
          <h2 class="user-name">{{ user.name }}</h2>
          <p class="user-email">{{ user.email }}</p>
        </div>

        <div class="options-section" data-anim="bloque" style="margin-bottom: 2rem;">
          <p class="section-label">TU FAMILIA</p>
          <ion-list class="options-list">
            @if (familyFacade.currentFamily(); as family) {
              <ion-item class="option-item" lines="none">
                <app-icon name="users" slot="start" class="option-icon" [size]="20" />
                <ion-label>
                  <h2>{{ family.name }}</h2>
                  <p>Código: <span class="font-mono text-xs text-brand">{{ family.id.substring(0,8) }}...</span></p>
                </ion-label>
                <button slot="end" class="p-2 text-brand hover:bg-brand/10 rounded-full transition-colors" (click)="copyFamilyId(family.id)">
                  <app-icon name="copy" [size]="18" />
                </button>
              </ion-item>
              
              <div class="px-4 mt-2">
                <p class="text-xs text-muted mb-2">Para que otra persona vea tus listas, debe ingresar tu código completo:</p>
                <div class="flex gap-2">
                  <input type="text" #joinInput placeholder="Pegar código de otra familia" class="flex-1 bg-base border border-border-subtle rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand text-primary" />
                  <button class="btn-primary py-1.5 px-3 text-sm shrink-0" (click)="joinFamily(joinInput.value); joinInput.value = ''">
                    Unirse
                  </button>
                </div>
                @if (familyFacade.error()) {
                  <p class="text-xs text-danger mt-1">{{ familyFacade.error() }}</p>
                }
              </div>
            } @else if (familyFacade.isLoading()) {
              <ion-item class="option-item" lines="none">
                <ion-spinner name="crescent"></ion-spinner>
              </ion-item>
            }
          </ion-list>
        </div>

        <div class="options-section" data-anim="bloque">
          <p class="section-label">OPCIONES</p>
          <ion-list class="options-list">
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
              <ion-label>Buscar Actualizaciones</ion-label>
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
            <ion-item
              button
              detail="false"
              lines="none"
              class="option-item"
              (click)="showPreferencesComingSoon()"
            >
              <app-icon
                name="settings"
                slot="start"
                class="option-icon"
                [size]="20"
                [ariaHidden]="true"
              />
              <ion-label>Preferencias</ion-label>
              <app-icon
                name="chevron-right"
                slot="end"
                class="chevron-icon"
                [size]="18"
                [ariaHidden]="true"
              />
            </ion-item>
          </ion-list>
        </div>

        <div class="logout-section" data-anim="bloque">
          <button class="logout-btn" (click)="logout()">
            <app-icon name="log-out" [size]="20" [ariaHidden]="true" />
            Cerrar Sesión
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

      .profile-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem 1rem 2.5rem 1rem;
      }

      /* Ember sólido con iniciales en tinta: 7.0:1, el mismo par del chip
         activo. Antes iban en blanco sobre un degradé ember a carmesí
         (2.9:1 en el extremo ember) con un resplandor azul del branding
         anterior. Es el único acento de marca decorativo de la vista. */
      .avatar {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        background: var(--ds-brand);
        color: var(--color-primary-text);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }

      /* Anton deja de leerse bajo 28px; medía 24. */
      .user-name {
        margin: 0 0 0.25rem 0;
        font-family: var(--font-display);
        font-size: var(--font-display-floor);
        font-weight: 700;
        color: var(--text-primary);
      }

      .user-email {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .options-section {
        padding: 0 1rem;
      }

      /* Medía 12px, bajo el piso de 13. */
      .section-label {
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
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
export class ProfilePage implements AfterViewInit, OnInit {
  auth = inject(AuthFacade);
  updateFacade = inject(AppUpdateFacade);
  gsap = inject(GsapAnimationsService);
  familyFacade = inject(FamilyFacade);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  ngOnInit() {
    this.familyFacade.loadMyFamily();
  }

  ngAfterViewInit() {
    // Acotado al host: Ionic mantiene otras vistas en el DOM, y el
    // querySelectorAll global de antes también podía encontrar las suyas.
    this.gsap.animateTierEnter(this.host.nativeElement.querySelector('.tier-trabajo'));
  }

  async checkForUpdates() {
    await this.updateFacade.checkForUpdates('manual');
  }

  copyFamilyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      this.toast.success('Copiado', 'Código de familia copiado al portapapeles');
    });
  }

  async joinFamily(code: string) {
    const familyId = code.trim();
    if (!familyId) return;
    const success = await this.familyFacade.joinFamily(familyId);
    if (success) {
      this.toast.success('¡Listo!', 'Te has unido a la nueva familia. Tus listas ahora están sincronizadas.');
      // Refrescar para que las otras pantallas tomen el nuevo family_id
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  showPreferencesComingSoon(): void {
    this.toast.info('Preferencias', 'Esta sección estará disponible próximamente.');
  }

  async logout() {
    await this.auth.logout();
  }
}
