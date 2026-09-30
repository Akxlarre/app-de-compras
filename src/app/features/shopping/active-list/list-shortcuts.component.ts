import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { ActiveShoppingList } from '@core/models/shopping-list.model';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Atajos para empezar una lista: "Repetir última compra" y las plantillas de la familia.
 * Se usa sin lista activa y dentro de una lista vacía (spec 0010); quien lo usa decide qué hace
 * con el id elegido.
 */
@Component({
  selector: 'app-list-shortcuts',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full flex flex-col gap-3">
      @if (lastList(); as last) {
      <button
        class="w-full bg-surface border border-brand/40 p-4 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform shadow-sm"
        data-llm-action="repetir-ultima-compra"
        (click)="pick.emit(last.id)"
      >
        <app-icon
          name="repeat"
          [size]="20"
          class="text-brand shrink-0"
          [attr.aria-label]="'Repetir'"
        />
        <div class="text-left flex-1">
          <p class="font-bold text-text-primary text-base">Repetir última compra</p>
          <p class="text-xs text-text-muted mt-1">
            {{ last.list_items.length }} {{ last.list_items.length === 1 ? 'ítem' : 'ítems' }}
          </p>
        </div>
        <app-icon
          name="chevron-right"
          [size]="20"
          class="text-text-muted"
          [attr.aria-label]="'Elegir'"
        />
      </button>
      } @for (template of templates(); track template.id) {
      <div
        class="w-full bg-surface border border-border-default rounded-2xl flex items-center"
        data-testid="template-row"
      >
        <button
          class="flex-1 min-w-0 p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          data-llm-action="usar-plantilla"
          (click)="pick.emit(template.id)"
        >
          <app-icon
            name="bookmark"
            [size]="20"
            class="text-text-muted shrink-0"
            [attr.aria-label]="'Plantilla'"
          />
          <div class="flex-1 min-w-0">
            <p class="font-bold text-text-primary text-base truncate">{{ template.name }}</p>
            <p class="text-xs text-text-muted mt-1">
              {{ template.list_items.length }}
              {{ template.list_items.length === 1 ? 'ítem' : 'ítems' }}
            </p>
          </div>
        </button>
        <!-- Renombrar / borrar (spec 0013, Q28) -->
        <button
          class="w-12 h-12 mr-2 rounded-full flex items-center justify-center text-text-muted active:bg-border-subtle shrink-0"
          [attr.aria-label]="'Opciones de la plantilla ' + template.name"
          data-llm-action="opciones-plantilla"
          (click)="manage.emit(template)"
        >
          <app-icon name="more-vertical" [size]="20" [attr.aria-label]="'Opciones'" />
        </button>
      </div>
      }
    </div>
  `,
})
export class ListShortcutsComponent {
  readonly lastList = input<ActiveShoppingList | null>(null);
  readonly templates = input<ActiveShoppingList[]>([]);
  /** Id de la lista elegida como punto de partida. */
  readonly pick = output<string>();
  /** Pidió renombrar o borrar una plantilla. */
  readonly manage = output<ActiveShoppingList>();
}
