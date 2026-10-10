import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ITEM_UNITS, type ItemUnit } from '@core/models/shopping-list.model';
import type { ItemPatch } from '@core/models/offline-queue.model';
import { formatAmount, parsePrice } from '@core/utils/price.utils';
import { isDecimalUnit, parseQuantity, unitLabel } from '@core/utils/units.utils';

export interface ItemDetail {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number | null;
  notes: string | null;
  /** "Lo agregó Ana" / "Lo agregaste tú"; null si no se sabe (spec 0024 D1). */
  addedBy?: string | null;
}

/** Largo máximo de la nota de un ítem (spec 0021 D1). */
export const NOTES_MAX = 80;

/**
 * Detalle de un ítem de Mi Lista (spec 0019 D4/D5, spec 0021): unidad, cantidad (decimales en kg y
 * L), precio y nota, y el camino a la ficha del producto. Hoja inferior; quien la usa guarda y la
 * cierra.
 */
@Component({
  selector: 'app-item-detail-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      [attr.aria-label]="'Detalle de ' + item().name"
    >
      <button
        class="absolute inset-0 bg-base/70"
        aria-label="Cerrar"
        (click)="closed.emit()"
      ></button>
      <form
        class="relative bg-surface border-t border-border-default rounded-t-3xl px-4 pt-5 pb-chrome flex flex-col gap-4"
        (submit)="$event.preventDefault(); submit()"
      >
        <div>
          <h2 class="text-lg font-bold text-text-primary break-words">{{ item().name }}</h2>
          @if (item().addedBy) {
          <p class="text-xs text-text-muted mt-0.5" data-testid="agregado-por">
            {{ item().addedBy }}
          </p>
          }
        </div>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold text-text-muted mb-2">Unidad</legend>
          <div class="flex flex-wrap gap-2">
            @for (u of units; track u) {
            <button
              type="button"
              class="px-4 h-10 rounded-full border text-sm font-semibold"
              [class.bg-brand]="unit() === u"
              [class.text-brand-contrast]="unit() === u"
              [class.border-transparent]="unit() === u"
              [class.border-border-default]="unit() !== u"
              [class.text-text-primary]="unit() !== u"
              [attr.aria-pressed]="unit() === u"
              (click)="pickUnit(u)"
            >
              {{ label(u) }}
            </button>
            }
          </div>
        </fieldset>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-text-muted">Cantidad</span>
            <input
              class="w-full bg-base border rounded-lg py-2.5 px-3 text-right font-bold text-text-primary focus:outline-none"
              [class.border-border-default]="!showError()"
              [class.border-error]="showError()"
              [attr.inputmode]="decimal() ? 'decimal' : 'numeric'"
              data-testid="detalle-cantidad"
              data-llm-description="cantidad del producto en la unidad elegida; decimales con coma en kg y L"
              [value]="quantityText()"
              (input)="quantityText.set($any($event.target).value)"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-text-muted">{{ priceLabel() }}</span>
            <input
              class="w-full bg-base border border-border-default rounded-lg py-2.5 px-3 text-right font-bold text-text-primary focus:outline-none"
              inputmode="numeric"
              placeholder="$"
              data-testid="detalle-precio"
              data-llm-description="precio pagado por unidad, en pesos (opcional)"
              [value]="priceText()"
              (input)="priceText.set($any($event.target).value)"
            />
          </label>
        </div>
        @if (showError()) {
        <p class="text-xs text-error -mt-2" role="alert">
          {{
            decimal() ? 'Escribe una cantidad como 1,5.' : 'Escribe un número entero mayor que 0.'
          }}
        </p>
        }

        <label class="flex flex-col gap-1">
          <span class="flex justify-between text-xs font-semibold text-text-muted">
            Nota <span class="font-normal">{{ notesLeft() }}</span>
          </span>
          <input
            class="w-full bg-base border border-border-default rounded-lg py-2.5 px-3 text-text-primary focus:outline-none"
            placeholder="Ej.: sin lactosa, el grande"
            [attr.maxlength]="notesMax"
            data-testid="detalle-nota"
            data-llm-description="nota para quien compra este producto (marca, tamaño, variedad), opcional"
            [value]="notesText()"
            (input)="notesText.set($any($event.target).value)"
          />
        </label>

        @if (item().productId) {
        <button
          type="button"
          class="self-start text-sm font-semibold text-brand"
          data-testid="ver-ficha"
          (click)="goToProduct()"
        >
          Ver ficha del producto
        </button>
        }

        <div class="flex gap-3">
          <button type="button" class="btn-secondary flex-1" (click)="closed.emit()">
            Cancelar
          </button>
          <button type="submit" class="btn-primary flex-1" data-llm-action="actualizar-item-lista">
            Listo
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ItemDetailSheetComponent {
  readonly item = input.required<ItemDetail>();
  readonly save = output<{ itemId: string; patch: ItemPatch }>();
  readonly closed = output<void>();
  readonly openProduct = output<string>();

  readonly units = ITEM_UNITS;
  readonly label = unitLabel;

  readonly unit = linkedSignal(() => this.item().unit);
  readonly quantityText = linkedSignal(() => String(this.item().quantity).replace('.', ','));
  readonly priceText = linkedSignal(() => formatAmount(this.item().unitPrice));
  readonly notesText = linkedSignal(() => this.item().notes ?? '');
  readonly notesMax = NOTES_MAX;
  readonly notesLeft = computed(() => NOTES_MAX - this.notesText().length);
  private readonly tried = signal(false);

  readonly decimal = computed(() => isDecimalUnit(this.unit()));
  readonly quantity = computed(() => parseQuantity(this.quantityText(), this.unit()));
  readonly showError = computed(() => this.tried() && this.quantity() === null);
  readonly priceLabel = computed(() => {
    const u = this.unit();
    return u === 'un' ? 'Precio c/u' : u === 'paquete' ? 'Precio por paquete' : `Precio por ${u}`;
  });

  pickUnit(unit: ItemUnit): void {
    this.unit.set(unit);
  }

  submit(): void {
    this.tried.set(true);
    const quantity = this.quantity();
    if (quantity === null) return;
    const patch: ItemPatch = { unit: this.unit(), quantity };
    const price = parsePrice(this.priceText().replace(/\D/g, ''));
    if (price !== null) patch.unit_price = price;
    // La nota solo viaja si cambió; vacía la borra (spec 0021 D1).
    const notes = this.notesText().trim().slice(0, NOTES_MAX) || null;
    if (notes !== (this.item().notes ?? null)) patch.notes = notes;
    this.save.emit({ itemId: this.item().id, patch });
  }

  /** "Ver ficha del producto": nombre y pasillo se cambian allá (spec 0021 D4). */
  goToProduct(): void {
    const id = this.item().productId;
    if (id) this.openProduct.emit(id);
  }
}
