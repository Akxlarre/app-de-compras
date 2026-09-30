import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsFacade } from '@core/facades/products.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { parsePrice } from '@core/utils/price.utils';
import { formatDaysAgo } from '@core/utils/date.utils';
import { ToastService } from '@core/services/ui/toast.service';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppHeaderComponent,
    IconComponent,
    SkeletonBlockComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="h-full flex flex-col bg-base">
      <app-header title="Catálogo Inteligente" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-chrome">
        <div class="bento-grid">
          <!-- Las sugerencias de reposición viven en Mi Lista ("Te puede faltar", spec 0014). -->
          <!-- Lista de Productos -->
          <div class="bento-wide card-accent flex flex-col gap-4">
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
                class="flex items-center justify-between p-3 bg-surface border border-border-default rounded-xl"
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

                <div class="flex items-center gap-2">
                  <div class="relative w-24">
                    <span
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-medium"
                      aria-hidden="true"
                      >$</span
                    >
                    <input
                      type="number"
                      [attr.aria-label]="'Precio de ' + product.name"
                      data-llm-description="último precio del producto en pesos"
                      class="w-full bg-base border border-border-subtle rounded-lg py-1.5 pl-6 pr-2 text-sm font-bold focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-primary transition-all duration-300"
                      [class.border-brand]="savedId() === product.id"
                      [class.ring-1]="savedId() === product.id"
                      [class.ring-brand]="savedId() === product.id"
                      [ngModel]="product.last_price"
                      (blur)="onPriceBlur(product.id, $event)"
                      (keydown.enter)="onPriceBlur(product.id, $event)"
                    />
                    @if (savedId() === product.id) {
                    <app-icon
                      name="check"
                      [size]="14"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-brand"
                    />
                    }
                  </div>
                </div>
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

  async onPriceBlur(productId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const current = this.facade.products().find((p) => p.id === productId)?.last_price;
    const restore = () => (input.value = current == null ? '' : String(current));

    const newPrice = parsePrice(input.value);
    if (newPrice === null || newPrice === current) {
      restore(); // vacío, inválido o sin cambios: no se guarda nada
      return;
    }
    if (!(await this.facade.updatePrice(productId, newPrice))) {
      restore();
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

  lastPurchaseLabel(days: number | null): string {
    return days === null ? 'Sin compras aún' : `Comprado ${formatDaysAgo(days)}`;
  }
}
