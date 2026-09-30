import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import type { RestockSuggestion } from '@core/models/restock.model';
import { formatDaysAgo } from '@core/utils/date.utils';
import { IconComponent } from '@shared/components/icon/icon.component';

const MAX_VISIBLE = 5;

/**
 * "Te puede faltar" (spec 0014): lo que toca reponer según el historial. Quien la usa decide qué
 * hacer al agregar o posponer; sin sugerencias no se muestra.
 */
@Component({
  selector: 'app-restock-strip',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (suggestions().length > 0) {
    <section
      class="rounded-2xl border border-border-default bg-surface p-4 flex flex-col gap-3"
      data-testid="restock-strip"
      aria-labelledby="restock-title"
    >
      <div class="flex items-center justify-between gap-3">
        <h3 id="restock-title" class="flex items-center gap-2 text-sm font-bold text-text-primary">
          <app-icon name="repeat" [size]="16" class="text-brand" [attr.aria-label]="'Reponer'" />
          Te puede faltar
        </h3>
        @if (visible().length > 1) {
        <button
          class="text-xs font-semibold text-brand whitespace-nowrap active:scale-95 transition-transform disabled:opacity-40"
          data-llm-action="agregar-sugerencias"
          [disabled]="disabled()"
          (click)="addVisible()"
        >
          Agregar todas
        </button>
        }
      </div>

      <ul class="flex flex-col">
        @for (s of visible(); track s.product.id) {
        <li class="flex items-center gap-3 py-2" data-testid="restock-item">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-text-primary truncate">{{ s.product.name }}</p>
            <p class="text-xs text-text-muted">{{ detail(s) }}</p>
          </div>
          <button
            class="text-xs text-text-muted font-medium whitespace-nowrap px-2 py-2 active:scale-95 transition-transform disabled:opacity-40"
            data-llm-action="posponer-sugerencia"
            [disabled]="disabled()"
            (click)="snooze.emit(s)"
          >
            Todavía tengo
          </button>
          <button
            class="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-40"
            [attr.aria-label]="'Agregar ' + s.product.name"
            data-llm-action="agregar-sugerencia"
            [disabled]="disabled()"
            (click)="add.emit(s.product.id)"
          >
            <app-icon name="plus" [size]="20" class="text-brand" [ariaHidden]="true" />
          </button>
        </li>
        }
      </ul>

      @if (hidden() > 0) {
      <button
        class="self-start text-xs font-semibold text-text-muted active:scale-95 transition-transform"
        (click)="expanded.set(true)"
      >
        Ver {{ hidden() }} más
      </button>
      }
    </section>
    }
  `,
})
export class RestockStripComponent {
  readonly suggestions = input<RestockSuggestion[]>([]);
  /** Sin conexión no se puede agregar ni posponer. */
  readonly disabled = input(false);

  readonly add = output<string>();
  readonly addAll = output<string[]>();
  readonly snooze = output<RestockSuggestion>();

  readonly expanded = signal(false);

  readonly visible = computed(() =>
    this.expanded() ? this.suggestions() : this.suggestions().slice(0, MAX_VISIBLE)
  );
  readonly hidden = computed(() => this.suggestions().length - this.visible().length);

  addVisible(): void {
    this.addAll.emit(this.visible().map((s) => s.product.id));
  }

  /** "Hace 12 días · sueles comprarlo cada ~10" (la frecuencia solo si salió del historial). */
  detail(s: RestockSuggestion): string {
    const ago = formatDaysAgo(s.daysSince);
    const when = ago.charAt(0).toUpperCase() + ago.slice(1);
    return s.learned ? `${when} · sueles comprarlo cada ~${s.intervalDays}` : when;
  }
}
