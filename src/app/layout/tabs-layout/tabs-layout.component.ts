import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  inject,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  cart,
  personOutline,
  person,
  receiptOutline,
  receipt,
  listOutline,
  list,
} from 'ionicons/icons';
import { NavigationEnd, Router } from '@angular/router';
import { tabChromeFor } from '@core/utils/tab-chrome.utils';

@Component({
  selector: 'app-tabs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs (ionTabsDidChange)="markSelectedTab()">
      <ion-tab-bar
        #tabBar
        slot="bottom"
        class="main-tab-bar"
        [class.bar-hidden]="chrome().hideBar"
        [attr.aria-hidden]="chrome().hideBar"
      >
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
      }

      /* Flujos (cierre de compra): sin barra que invite a salir a mitad (spec 0013). */
      ion-tab-bar.main-tab-bar.bar-hidden {
        display: none !important;
      }

      ion-tab-bar.main-tab-bar {
        --background: var(--bg-glass-surface);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        --border: 1px solid var(--border-subtle);

        position: absolute !important;
        /* Alto 64 + 16 de margen = --chrome-bottom (tokens/_variables.scss). */
        bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
        left: 16px !important;
        right: 16px !important;
        width: auto !important;
        border-radius: var(--radius-full) !important;
        box-shadow: var(--shadow-lg) !important;
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
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** Pestaña activa (Historial y cierre cuelgan de Mi Lista) y si la barra se oculta. */
  readonly chrome = computed(() => tabChromeFor(this.url()));

  @ViewChild('tabBar', { read: ElementRef }) private tabBar?: ElementRef<HTMLIonTabBarElement>;

  /**
   * ion-tabs marca como pestaña el primer segmento de la URL ("history" no existe y no queda
   * ninguna activa). Después de cada cambio se corrige con la de `tabChromeFor` (Q18).
   */
  markSelectedTab(): void {
    const tab = this.chrome().tab;
    const bar = this.tabBar?.nativeElement;
    if (bar && tab && bar.selectedTab !== tab) bar.selectedTab = tab;
  }

  constructor() {
    addIcons({
      cartOutline,
      cart,
      personOutline,
      person,
      receiptOutline,
      receipt,
      listOutline,
      list,
    });
  }
}
