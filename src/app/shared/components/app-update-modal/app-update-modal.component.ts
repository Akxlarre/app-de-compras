import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppUpdate } from '../../../core/models/app-update.model';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
        style="background: var(--overlay-backdrop);"
      >
        <div
          class="w-full max-w-sm rounded-2xl border bg-surface p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
          style="border-color: var(--border-default);"
        >
          <!-- Top badge / icon -->
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center"
              style="background: var(--color-primary-muted); border: 1px solid var(--accent-border);"
            >
              <app-icon name="rocket" [size]="24" color="var(--ds-brand)" />
            </div>
            <div class="flex flex-col">
              <h3 class="m-0 text-base font-bold text-primary tracking-tight">
                ¡Nueva versión disponible!
              </h3>
              <span class="text-xs font-semibold" style="color: var(--ds-brand);"
                >Versión {{ updateInfo()?.version || 'actualizada' }}</span
              >
            </div>
          </div>

          <!-- Notes -->
          <div
            class="rounded-xl p-3.5 text-xs text-muted leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap"
            style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);"
          >
            {{ updateInfo()?.release_notes || 'Mejoras de rendimiento y corrección de errores.' }}
          </div>

          <!-- Error message if any -->
          @if (error()) {
            <div
              class="p-3 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style="background: var(--state-error-bg); color: var(--state-error); border: 1px solid var(--state-error-border);"
            >
              <app-icon name="alert-circle" [size]="14" />
              {{ error() }}
            </div>
          }

          <!-- Download Progress Bar -->
          @if (isDownloading()) {
            <div class="flex flex-col gap-2 pt-2">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-secondary">Descargando actualización...</span>
                <span style="color: var(--ds-brand);">{{ downloadProgress() }}%</span>
              </div>
              <div class="w-full h-2.5 rounded-full overflow-hidden" style="background: var(--bg-subtle);">
                <div
                  class="h-full transition-all duration-200"
                  style="background: var(--gradient-primary); width: {{ downloadProgress() }}%;"
                ></div>
              </div>
            </div>
          }

          <!-- Action buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-2 mt-1" style="border-top: 1px solid var(--border-subtle);">
            @if (!isForceUpdate && !isDownloading()) {
              <button
                type="button"
                (click)="onClose()"
                class="px-4 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary bg-transparent border-none cursor-pointer transition-all active:scale-95"
              >
                Más tarde
              </button>
            }

            <button
              type="button"
              (click)="onUpdateClick()"
              [disabled]="isDownloading()"
              class="flex-1 py-3 px-4 rounded-xl text-xs font-bold border-none shadow-lg cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style="background: var(--gradient-primary); color: #ffffff;"
            >
              @if (isDownloading()) {
                <span
                  class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent"
                  style="border-color: rgba(0,0,0,0.3); border-top-color: transparent;"
                ></span>
                <span>Instalando...</span>
              } @else {
                <span>Actualizar Ahora</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppUpdateModalComponent {
  // Inputs
  readonly visible = input<boolean>(false);
  readonly updateInfo = input<AppUpdate | null>(null);
  readonly isDownloading = input<boolean>(false);
  readonly downloadProgress = input<number>(0);
  readonly error = input<string | null>(null);

  // Outputs
  readonly startUpdate = output<void>();
  readonly dismiss = output<void>();

  get isForceUpdate(): boolean {
    return this.updateInfo()?.force_update ?? false;
  }

  onUpdateClick(): void {
    this.startUpdate.emit();
  }

  onClose(): void {
    if (!this.isForceUpdate) {
      this.dismiss.emit();
    }
  }
}
