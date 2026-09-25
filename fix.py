import os

content = """import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: 
    <header class="app-top-header">
      <div class="header-content">
        <div class="title-group">
          @if (showBrand()) {
            <span class="brand-tag">FITTRACK</span>
          }
          <h1 class="page-main-title">{{ title() }}</h1>
        </div>
        <div class="header-actions">
          @if (showStreak()) {
            <div class="streak-pill">
              <span class="streak-fire">?</span>
              <span class="streak-text">Activo</span>
            </div>
          }
          <ng-content select="[slot=actions]"></ng-content>
        </div>
      </div>
    </header>
  ,
  styles: [
    .app-top-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(10, 10, 12, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding: 1rem 1.25rem 0.85rem 1.25rem;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      max-width: 600px;
      margin: 0 auto;
    }
    .title-group {
      display: flex;
      flex-direction: column;
    }
    .brand-tag {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #3b82f6;
      text-transform: uppercase;
    }
    .page-main-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: -0.03em;
      color: #ffffff;
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
      font-size: 0.75rem;
      font-weight: 700;
      color: #60a5fa;
    }
    .streak-fire {
      font-size: 0.85rem;
    }
  ]
})
export class AppHeaderComponent {
  title = input.required<string>();
  showBrand = input<boolean>(true);
  showStreak = input<boolean>(false);
}
"""

with open("src/app/shared/components/app-header/app-header.component.ts", "w", encoding="utf-8") as f:
    f.write(content)

