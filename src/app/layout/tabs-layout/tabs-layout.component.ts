import {
  Component,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
} from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, cart, personOutline, person, receiptOutline, receipt, listOutline, list } from 'ionicons/icons';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
  ],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="main-tab-bar">
        <ion-tab-button tab="active">
          <ion-icon name="cart-outline"></ion-icon>
          <ion-label>Mi Lista</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="receipt">
          <ion-icon name="receipt-outline"></ion-icon>
          <ion-label>Boletas</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="products">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>Catálogo</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;

        /* Geometría del pie */
        --tabbar-h: calc(56px + env(safe-area-inset-bottom, 0px));
        --chrome-bottom: calc(var(--tabbar-h) + var(--space-4));
      }

      ion-tab-bar.main-tab-bar {
        --background: rgba(39, 39, 42, 0.85); /* Zinc 800 */
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        --border: 1px solid rgba(255, 255, 255, 0.05);
        
        position: absolute !important;
        bottom: calc(env(safe-area-inset-bottom, 16px) + 16px) !important;
        left: 16px !important;
        right: 16px !important;
        width: auto !important;
        border-radius: var(--radius-full) !important;
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4) !important;
        padding: 4px !important;
        height: 64px !important;
        contain: none !important;
        overflow: visible !important;
      }

      ion-tab-button {
        --background: transparent;
        --color: var(--text-muted);
        --color-selected: var(--ds-brand);
        --ripple-color: transparent;
        --background-focused: transparent;
        min-height: var(--target-min);
        transition: var(--transition-color);
        background: transparent;
      }

      ion-tab-button:active {
        opacity: 0.7;
      }

      ion-tab-button ion-icon {
        font-size: 1.35rem;
      }

      ion-tab-button ion-label {
        font-family: var(--font-body);
        font-size: var(--text-xs) !important;
        font-weight: var(--font-semibold);
        letter-spacing: 0.01em;
        margin-top: 3px;
      }

      ion-tab-button.tab-selected ion-label {
        font-weight: var(--font-bold) !important;
      }
    `,
  ],
})
export class TabsLayoutComponent {
  router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    addIcons({
      cartOutline,
      cart,
      personOutline,
      person,
      receiptOutline,
      receipt,
      listOutline,
      list
    });
  }
}
