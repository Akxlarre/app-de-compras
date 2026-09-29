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
      <button
        class="w-full bg-surface border border-border-default p-4 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform"
        data-llm-action="usar-plantilla"
        (click)="pick.emit(template.id)"
      >
        <app-icon
          name="bookmark"
          [size]="20"
          class="text-text-muted shrink-0"
          [attr.aria-label]="'Plantilla'"
        />
        <div class="text-left flex-1">
          <p class="font-bold text-text-primary text-base">{{ template.name }}</p>
          <p class="text-xs text-text-muted mt-1">
            {{ template.list_items.length }}
            {{ template.list_items.length === 1 ? 'ítem' : 'ítems' }}
          </p>
        </div>
        <app-icon
          name="chevron-right"
          [size]="20"
          class="text-text-muted"
          [attr.aria-label]="'Elegir'"
        />
      </button>
      }
    </div>
  `,
})
export class ListShortcutsComponent {
  readonly lastList = input<ActiveShoppingList | null>(null);
  readonly templates = input<ActiveShoppingList[]>([]);
  /** Id de la lista elegida como punto de partida. */
  readonly pick = output<string>();
}
