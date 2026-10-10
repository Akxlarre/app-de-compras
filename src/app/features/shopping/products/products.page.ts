import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ProductsFacade } from '@core/facades/products.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { formatAmount } from '@core/utils/price.utils';
import { formatDaysAgo } from '@core/utils/date.utils';
import { matchesSearch } from '@core/utils/product-sheet.utils';
import { ToastService } from '@core/services/ui/toast.service';

/**
 * Catálogo (spec 0017): buscador que filtra al escribir, "Crear «texto»", activos o archivados y
 * cada producto abre su ficha. El precio es el último pagado y no se edita en la fila (D5).
 */
@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    IconComponent,
    SkeletonBlockComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="h-full flex flex-col bg-base" data-testid="catalog-page">
      <app-header title="Catálogo" />

      <main class="flex-1 overflow-y-auto px-4 pb-chrome">
        <div class="flex flex-col gap-3 mt-2">
          <!-- Buscador (AC9) -->
          <div class="relative">
            <app-icon
              name="search"
              [size]="18"
              class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              [attr.aria-label]="'Buscar'"
            />
            <input
              type="search"
              class="w-full bg-surface border border-border-default rounded-full pl-11 pr-4 py-3 text-text-primary"
              placeholder="Buscar o crear un producto"
              aria-label="Buscar en el catálogo"
              data-llm-description="texto para filtrar el catálogo o crear un producto nuevo"
              [value]="facade.query()"
              (input)="facade.query.set($any($event.target).value)"
            />
          </div>

          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-text-muted" data-testid="contador">{{ countLabel() }}</p>
            <div
              class="flex rounded-full border border-border-default p-0.5 text-sm"
              role="tablist"
            >
              <button
                role="tab"
                class="px-3 py-1 rounded-full"
                [class.bg-surface]="!facade.archived()"
                [class.font-semibold]="!facade.archived()"
                [class.text-text-muted]="facade.archived()"
                [attr.aria-selected]="!facade.archived()"
                (click)="facade.showArchived(false)"
              >
                Activos
              </button>
              <button
                role="tab"
                class="px-3 py-1 rounded-full"
                [class.bg-surface]="facade.archived()"
                [class.font-semibold]="facade.archived()"
                [class.text-text-muted]="!facade.archived()"
                [attr.aria-selected]="facade.archived()"
                data-testid="ver-archivados"
                (click)="facade.showArchived(true)"
              >
                Archivados
              </button>
            </div>
          </div>

          @if (canCreate()) {
          <button
            class="w-full flex items-center gap-3 p-4 bg-surface border border-dashed border-border-default rounded-2xl text-left active:scale-[0.99] transition-transform"
            data-llm-action="crear-producto"
            (click)="create()"
          >
            <app-icon name="plus" [size]="18" class="text-brand" [attr.aria-label]="'Crear'" />
            <span class="font-semibold text-text-primary">Crear «{{ facade.query().trim() }}»</span>
          </button>
          } @if (facade.isLoading()) {
          <div class="flex flex-col gap-3">
            <app-skeleton-block variant="rect" width="100%" height="64px" />
            <app-skeleton-block variant="rect" width="100%" height="64px" />
            <app-skeleton-block variant="rect" width="100%" height="64px" />
          </div>
          } @else if (facade.error()) {
          <app-error-state
            [title]="'No se pudo cargar el catálogo'"
            [message]="facade.error()!"
            retryLabel="Reintentar"
            (retry)="facade.loadProducts()"
          />
          } @else if (facade.products().length === 0) {
          <app-empty-state
            [icon]="facade.archived() ? 'archive' : 'package-open'"
            [message]="facade.archived() ? 'No hay productos archivados' : 'Tu catálogo está vacío'"
            [subtitle]="
              facade.archived()
                ? 'Archiva desde la ficha lo que ya no compras: sale del buscador y de las sugerencias.'
                : 'Busca arriba para crear uno, o escanea una boleta: lo comprado queda aquí.'
            "
          />
          } @else {
          <ul class="flex flex-col gap-2">
            @for (product of facade.filtered(); track product.id) {
            <li>
              <button
                class="w-full flex items-center gap-3 p-4 bg-surface border border-border-default rounded-2xl text-left active:scale-[0.99] transition-transform"
                [attr.aria-label]="'Ver ' + product.name"
                (click)="open(product.id)"
              >
                <span class="flex-1 min-w-0">
                  <span class="block font-medium text-text-primary line-clamp-2 break-words">{{
                    product.name
                  }}</span>
                  <span class="block text-xs text-text-muted mt-0.5">
                    {{ lastPurchaseLabel(product.daysSincePurchase) }}
                  </span>
                </span>
                <span
                  class="shrink-0 text-sm"
                  [class.font-bold]="product.last_price != null"
                  [class.text-text-primary]="product.last_price != null"
                  [class.text-text-muted]="product.last_price == null"
                  >{{ priceLabel(product.last_price ?? null) }}</span
                >
                <app-icon
                  name="chevron-right"
                  [size]="18"
                  class="text-text-muted shrink-0"
                  [attr.aria-label]="'Ver ficha'"
                />
              </button>
            </li>
            }
          </ul>
          }
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  readonly facade = inject(ProductsFacade);
  private readonly nav = inject(NavController);
  private readonly toast = inject(ToastService);

  /** "Crear «texto»": hay algo escrito y ningún producto se llama exactamente así. */
  readonly canCreate = computed(() => {
    const term = this.facade.query().trim();
    if (!term || this.facade.archived()) return false;
    return !this.facade
      .products()
      .some((p) => matchesSearch(p.name, term) && matchesSearch(term, p.name));
  });

  readonly countLabel = computed(() => {
    const total = this.facade.products().length;
    const shown = this.facade.filtered().length;
    const noun = this.facade.archived()
      ? total === 1
        ? 'archivado'
        : 'archivados'
      : total === 1
      ? 'producto'
      : 'productos';
    return shown === total ? `${total} ${noun}` : `${shown} de ${total} ${noun}`;
  });

  /** Cada vez que se entra (Ionic deja la pestaña en caché): vuelve de una ficha con cambios. */
  ionViewWillEnter(): void {
    this.facade.loadProducts();
  }

  open(id: string): void {
    this.nav.navigateForward(`/app/products/${id}`);
  }

  async create(): Promise<void> {
    const id = await this.facade.create(this.facade.query());
    if (!id) {
      this.toast.error('No se pudo crear el producto', 'Revisa tu conexión e intenta de nuevo.');
      return;
    }
    this.facade.query.set('');
    this.open(id);
  }

  priceLabel(price: number | null): string {
    return price == null ? 'Sin precio' : `$${formatAmount(price)}`;
  }

  lastPurchaseLabel(days: number | null): string {
    return days === null ? 'Sin compras aún' : `Última compra: ${formatDaysAgo(days)}`;
  }
}
