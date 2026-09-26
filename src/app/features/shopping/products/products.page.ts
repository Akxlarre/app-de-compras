import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsFacade } from '@core/facades/products.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { Router } from '@angular/router';
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
    PressFeedbackDirective,
    SkeletonBlockComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="h-full flex flex-col bg-base">
      <app-header title="Catálogo Inteligente" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <div class="bento-grid">
          <!-- Banner Inteligente -->
          @if (!facade.isLoading() && facade.recommendedProducts().length > 0) {
          <div
            class="bento-wide card flex flex-col gap-3 border-brand/30 bg-brand/5 relative overflow-hidden"
          >
            <div class="absolute -right-4 -top-4 opacity-10">
              <app-icon name="sparkles" [size]="120" class="text-brand" />
            </div>

            <div class="z-10 flex gap-4 items-center">
              <div
                class="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0"
              >
                <app-icon name="sparkles" [size]="24" class="text-brand" />
              </div>
              <div>
                <h3 class="font-bold text-primary">Es momento de reponer</h3>
                <p class="text-sm text-muted">
                  @if (facade.recommendedProducts().length === 1) { 1 producto que sueles comprar ya
                  debería estar por acabarse. } @else {
                  {{ facade.recommendedProducts().length }} productos que sueles comprar ya deberían
                  estar por acabarse. }
                </p>
              </div>
            </div>

            <button
              class="btn-primary w-full mt-2 z-10"
              [appPressFeedback]="'press'"
              (click)="generateSmartList()"
            >
              Generar lista con {{ facade.recommendedProducts().length }} productos
            </button>
          </div>
          }

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
                      >$</span
                    >
                    <input
                      type="number"
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
  private router = inject(Router);
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

  async generateSmartList() {
    if (!(await this.facade.generateSmartList())) {
      this.toast.error('No se pudo armar la lista', 'Intenta de nuevo.');
      return;
    }
    this.router.navigate(['/app/active']);
  }
}
