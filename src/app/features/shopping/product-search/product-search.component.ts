import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { ProductSearchFacade, Product } from '@core/facades/product-search.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { IonModal } from '@ionic/angular';

/**
 * Buscador para agregar productos a la lista (bottom sheet).
 * La cantidad se ajusta solo en la lista: aquí un producto que ya está muestra "En la lista · N"
 * y el `+` suma uno más; nada de aquí quita productos de la lista (spec 0013, Q4/Q11).
 */
@Component({
  selector: 'app-product-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonModal, IconComponent, SkeletonBlockComponent, NgTemplateOutlet],
  template: `
    <ion-modal
      [isOpen]="visible()"
      (didDismiss)="close()"
      [initialBreakpoint]="0.85"
      [breakpoints]="[0, 0.5, 0.85, 1]"
      handleBehavior="cycle"
      (ionModalWillPresent)="onShow()"
      (ionModalDidDismiss)="onHide()"
      class="search-bottom-sheet"
    >
      <ng-template>
        <div class="flex flex-col h-full w-full bg-base text-text-primary">
          <!-- Header / Search Input -->
          <div class="px-6 py-4 border-b border-border-subtle bg-surface flex items-center gap-3">
            <div class="relative flex-1">
              <app-icon
                name="search"
                [size]="20"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted z-10"
                [attr.aria-label]="'Buscar'"
              />
              <input
                #searchInput
                type="text"
                aria-label="Buscar producto"
                class="w-full bg-base border border-border-subtle rounded-2xl py-3 pl-12 pr-4 text-base focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-text-primary placeholder:text-text-muted transition-all"
                placeholder="Buscar producto..."
                [ngModel]="searchTerm()"
                (ngModelChange)="onSearch($event)"
              />
            </div>
          </div>

          <!-- Una fila de producto: nombre, categoría y "En la lista · N" + agregar -->
          <ng-template #row let-product>
            <div
              class="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl text-left border border-border-subtle/50 shadow-sm"
            >
              <div
                class="w-12 h-12 rounded-full bg-base flex items-center justify-center flex-shrink-0 border border-border-default"
              >
                <app-icon name="tag" [size]="20" class="text-text-muted" [ariaHidden]="true" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-text-primary text-lg truncate">{{ product.name }}</p>
                @if (inListQuantity(product.id); as qty) {
                <p
                  class="flex items-center gap-1 text-xs font-semibold text-brand mt-0.5"
                  data-testid="in-list"
                >
                  <app-icon name="check" [size]="12" [ariaHidden]="true" />
                  En la lista · {{ qty }}
                </p>
                } @else if (product.category) {
                <p
                  class="text-xs text-text-muted font-medium uppercase tracking-wider truncate mt-0.5"
                >
                  {{ product.category }}
                </p>
                }
              </div>
              <button
                class="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                [attr.aria-label]="
                  inListQuantity(product.id)
                    ? 'Agregar uno más de ' + product.name
                    : 'Agregar ' + product.name
                "
                data-llm-action="agregar-producto-lista"
                (click)="selectProduct(product)"
              >
                <app-icon
                  name="plus"
                  [size]="20"
                  class="text-brand pointer-events-none"
                  [ariaHidden]="true"
                />
              </button>
            </div>
          </ng-template>

          <!-- Results -->
          <div class="flex-1 overflow-y-auto px-4 py-2">
            @if (facade.isSearching()) {
            <div class="py-12 text-center text-text-muted flex flex-col items-center gap-3">
              <app-icon
                name="loader-2"
                [size]="28"
                class="animate-spin text-brand"
                [attr.aria-label]="'Buscando'"
              />
              <span class="text-sm font-medium">Buscando en catálogo...</span>
            </div>
            } @else if (facade.searchResults().length > 0) {
            <ul class="flex flex-col gap-2 mt-2">
              @for (product of facade.searchResults(); track product.id) {
              <li><ng-container *ngTemplateOutlet="row; context: { $implicit: product }" /></li>
              }
            </ul>
            } @else if (searchTerm().trim().length >= 2) {
            <div class="py-16 text-center px-6">
              <div
                class="w-20 h-20 rounded-full bg-surface border border-border-default flex items-center justify-center mx-auto mb-6"
              >
                <app-icon
                  name="package-search"
                  [size]="36"
                  class="text-text-muted"
                  [ariaHidden]="true"
                />
              </div>
              <p class="font-bold text-text-primary text-xl mb-2">
                No se encontró "{{ searchTerm() }}"
              </p>
              <p class="text-sm text-text-muted mb-8">
                Agrégalo como un producto nuevo a tu familia.
              </p>

              <button
                type="button"
                class="w-full py-4 bg-brand text-brand-contrast rounded-2xl font-bold text-base shadow-lg shadow-brand/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                data-llm-action="crear-producto"
                (click)="createNewProduct()"
              >
                <app-icon name="plus" [size]="20" [ariaHidden]="true" />
                Crear y añadir
              </button>
            </div>
            } @else {
            <!-- Esenciales -->
            <div class="py-4">
              <h3 class="text-sm font-bold text-text-primary mb-3 px-2">Tus esenciales</h3>

              @if (facade.essentialsLoading()) {
              <div class="flex flex-col gap-2" data-testid="essentials-loading">
                <app-skeleton-block variant="rect" width="100%" height="80px" />
                <app-skeleton-block variant="rect" width="100%" height="80px" />
                <app-skeleton-block variant="rect" width="100%" height="80px" />
              </div>
              } @else if (facade.essentials().length > 0) {
              <ul class="flex flex-col gap-2">
                @for (product of facade.essentials(); track product.id) {
                <li><ng-container *ngTemplateOutlet="row; context: { $implicit: product }" /></li>
                }
              </ul>
              } @else {
              <div
                class="py-10 text-center px-4 flex flex-col items-center justify-center opacity-50"
              >
                <app-icon
                  name="shopping-bag"
                  [size]="48"
                  class="text-text-muted mb-4"
                  [ariaHidden]="true"
                />
                <p class="text-base text-text-muted font-medium">
                  Aún no tienes productos guardados.
                </p>
                <p class="text-sm text-text-muted mt-1">Escribe arriba para empezar.</p>
              </div>
              }
            </div>
            }
          </div>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      :host ::ng-deep .search-bottom-sheet {
        --border-radius: 28px 28px 0 0;
        --box-shadow: var(--shadow-lg);
      }

      :host ::ng-deep .search-bottom-sheet::part(handle) {
        background: var(--border-default);
        width: 48px;
        height: 6px;
        margin-top: 12px;
      }
    `,
  ],
})
export class ProductSearchComponent {
  readonly visible = input.required<boolean>();
  readonly visibleChange = output<boolean>();

  readonly facade = inject(ProductSearchFacade);
  private shoppingFacade = inject(ShoppingListFacade);

  readonly searchTerm = signal('');
  private searchTimeout: ReturnType<typeof setTimeout> | undefined;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  onShow() {
    this.searchTerm.set('');
    this.facade.clear();

    const list = this.shoppingFacade.data();
    if (list) {
      this.facade.loadEssentials(list.family_id);
    }

    this.focusSearch();
  }

  onHide() {
    this.facade.clear();
  }

  close() {
    this.visibleChange.emit(false);
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.facade.search(term);
    }, 300); // debounce 300ms
  }

  /** Cantidad en la lista de un producto, o null si no está. */
  inListQuantity(productId: string): number | null {
    const item = this.shoppingFacade
      .data()
      ?.list_items.find((i) => (i.product?.id ?? i.product_id) === productId);
    return item ? item.quantity || 1 : null;
  }

  /** Agrega el producto; si ya está, la BD suma 1 (spec 0011). El buscador queda abierto. */
  async selectProduct(product: Product) {
    const list = this.shoppingFacade.data();
    if (list) await this.shoppingFacade.addItem(list.id, product.id);
  }

  /**
   * Crea el producto y lo agrega; el buscador queda listo para el siguiente (Q9). El campo se
   * vacía al tocar: lo que se escriba mientras responde el servidor no se pisa (fix-048).
   */
  async createNewProduct() {
    const term = this.searchTerm().trim();
    const list = this.shoppingFacade.data();
    if (!term || !list) return;

    clearTimeout(this.searchTimeout);
    this.searchTerm.set('');
    this.facade.clear();
    this.focusSearch();

    const newProduct = await this.facade.createProduct(term, list.family_id);
    if (!newProduct) {
      if (!this.searchTerm()) this.searchTerm.set(term);
      return;
    }
    await this.shoppingFacade.addItem(list.id, newProduct.id);
  }

  private focusSearch() {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 100);
  }
}
