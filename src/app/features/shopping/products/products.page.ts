import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsFacade } from '@core/facades/products.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { formatAmount } from '@core/utils/price.utils';
import { formatDaysAgo } from '@core/utils/date.utils';
import { ToastService } from '@core/services/ui/toast.service';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    IconComponent,
    SkeletonBlockComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="h-full flex flex-col bg-base">
      <app-header title="Catálogo" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-chrome">
        <div class="bento-grid">
          <!-- Las sugerencias de reposición viven en Mi Lista ("Te puede faltar", spec 0014). -->
          <!-- Lista de Productos -->
          <div class="bento-wide flex flex-col gap-4">
            <h2 class="text-lg font-bold text-primary">Todos tus productos</h2>

            @if (facade.isLoading()) {
            <div class="flex flex-col gap-3">
              <app-skeleton-block variant="rect" width="100%" height="60px" />
              <app-skeleton-block variant="rect" width="100%" height="60px" />
              <app-skeleton-block variant="rect" width="100%" height="60px" />
            </div>
            } @else if (facade.products().length === 0) {
            <app-empty-state
              icon="package-open"
              message="Tu catálogo está vacío"
              subtitle="Añade productos desde tu lista de compras o escaneando boletas."
            />
            } @else {
            <div class="flex flex-col gap-3">
              @for (product of facade.products(); track product.id) {
              <div
                class="flex items-center justify-between p-3 bg-surface border border-border-default rounded-2xl"
              >
                <div class="flex-1 min-w-0 pr-4">
                  <span class="font-medium text-primary block truncate">{{ product.name }}</span>
                  <span class="text-xs text-muted block mt-0.5">
                    <app-icon
                      name="clock"
                      [size]="12"
                      class="inline-block mr-1 opacity-70"
                      [attr.aria-label]="'Última compra'"
                    />
                    {{ lastPurchaseLabel(product.daysSincePurchase) }}
                  </span>
                </div>

                <!-- El precio se ve como texto y se edita al tocarlo (fix-050, V3) -->
                @if (editingId() === product.id) {
                <div class="relative w-28 shrink-0">
                  <span
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-medium"
                    aria-hidden="true"
                    >$</span
                  >
                  <input
                    inputmode="numeric"
                    data-price-edit
                    [attr.aria-label]="'Precio de ' + product.name"
                    data-llm-description="último precio del producto en pesos"
                    class="w-full bg-base border border-brand rounded-lg py-1.5 pl-6 pr-2 text-sm font-bold text-right focus:outline-none text-primary"
                    [value]="formatAmount(product.last_price ?? null)"
                    (blur)="onPriceBlur(product.id, $event)"
                    (keydown.enter)="$any($event.target).blur()"
                  />
                </div>
                } @else {
                <button
                  class="flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg text-sm"
                  [class.font-bold]="product.last_price != null"
                  [class.text-primary]="product.last_price != null"
                  [class.text-muted]="product.last_price == null"
                  [attr.aria-label]="'Editar precio de ' + product.name"
                  data-llm-action="actualizar-precio"
                  (click)="edit(product.id)"
                >
                  {{ priceLabel(product.last_price ?? null) }} @if (savedId() === product.id) {
                  <app-icon name="check" [size]="14" class="text-brand" [attr.aria-label]="'Guardado'" />
                  }
                </button>
                }
              </div>
              }
            </div>
            }
          </div>
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage implements OnInit {
  public facade = inject(ProductsFacade);
  private toast = inject(ToastService);

  public savedId = signal<string | null>(null);

  ngOnInit() {
    this.facade.loadProducts();
  }

  /** Producto con el precio en edición; los demás se ven como texto. */
  readonly editingId = signal<string | null>(null);
  readonly formatAmount = formatAmount;

  edit(productId: string): void {
    this.editingId.set(productId);
    // El input aparece en el próximo render: se enfoca para escribir de una vez.
    setTimeout(() => document.querySelector<HTMLInputElement>('[data-price-edit]')?.focus());
  }

  async onPriceBlur(productId: string, event: Event) {
    if (this.editingId() !== productId) return; // Enter ya guardó y el blur llega después
    this.editingId.set(null);
    const input = event.target as HTMLInputElement;
    const current = this.facade.products().find((p) => p.id === productId)?.last_price;
    const digits = input.value.replace(/[^\d]/g, '');
    const newPrice = digits ? Number(digits) : null;
    if (newPrice === null || newPrice === current) return; // vacío o sin cambios: no se guarda

    if (!(await this.facade.updatePrice(productId, newPrice))) {
      this.toast.error('No se pudo guardar el precio', 'Intenta de nuevo.');
      return;
    }

    // Micro-feedback visual
    this.savedId.set(productId);
    setTimeout(() => {
      if (this.savedId() === productId) {
        this.savedId.set(null);
      }
    }, 1500);
  }

  priceLabel(price: number | null): string {
    return price == null ? 'Sin precio' : `$${formatAmount(price)}`;
  }

  lastPurchaseLabel(days: number | null): string {
    return days === null ? 'Sin compras aún' : `Última compra: ${formatDaysAgo(days)}`;
  }
}
