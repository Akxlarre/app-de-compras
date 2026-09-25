import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-top-header">
      <div class="header-content">
        <div class="title-group">
          @if (showBrand()) {
            <span class="font-data font-bold tracking-widest text-xs text-brand">SHOPPING</span>
          }
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            @if (showBack()) {
              <button class="header-back-btn" (click)="onBack()" aria-label="Volver">
                <app-icon name="arrow-left" [size]="20"></app-icon>
              </button>
            }
            <h1 class="page-main-title">{{ title() }}</h1>
          </div>
        </div>
        <div class="header-actions">
          @if (showStreak()) {
            <div class="streak-pill">
              <span class="streak-fire"><app-icon name="zap" [size]="14"></app-icon></span>
              <span class="streak-text">Activo</span>
            </div>
          }
          <ng-content select="[slot=actions]"></ng-content>
        </div>
      </div>
      <ng-content select="[slot=bottom]"></ng-content>
    </header>
  `,
  styles: [
    `
      .app-top-header {
        position: relative;
        background: transparent;
        margin: calc(var(--ion-safe-area-top, 20px) + 1rem) 1rem 1.5rem 1rem;
        padding: 0;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        max-width: 600px;
        margin: 0 auto;
      }
      .header-back-btn {
        background: transparent;
        border: none;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
        margin-left: -0.25rem;
      }
      .header-back-btn:active {
        background: var(--bg-elevated);
      }
      .title-group {
        display: flex;
        flex-direction: column;
      }
      /* Medía 10.88px, por debajo del piso de 13px del sistema. Este
         encabezado aparece en todas las vistas, así que era el texto
         más chico de la app repetido en todas partes. */
      .brand-tag {
        font-size: var(--text-xs);
        font-weight: 800;
        letter-spacing: 0.14em;
        color: var(--ds-brand);
        text-transform: uppercase;
      }
      .page-main-title {
        font-family: var(--font-display);
        font-size: 1.75rem;
        font-weight: 900;
        letter-spacing: -0.03em;
        color: var(--text-primary);
        margin: 0.15rem 0 0 0;
        line-height: 1.1;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .streak-pill {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.8rem;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 20px;
      }
      .streak-text {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--color-primary-hover);
      }
      .streak-fire {
        font-size: 0.85rem;
      }
    `,
  ],
})
export class AppHeaderComponent {
  title = input.required<string>();
  showBrand = input<boolean>(true);
  showStreak = input<boolean>(false);
  showBack = input<boolean>(false);
  backClicked = output<void>();

  onBack(): void {
    this.backClicked.emit();
  }
}
