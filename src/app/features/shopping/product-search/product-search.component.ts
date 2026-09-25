import { Component, ChangeDetectionStrategy, input, output, inject, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ProductSearchFacade, Product } from '@core/facades/product-search.facade';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { IonModal } from '@ionic/angular';

@Component({
  selector: 'app-product-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonModal,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    IconComponent
  ],
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
              <app-icon name="search" [size]="20" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted z-10" />
              <input 
                #searchInput
                type="text" 
                class="w-full bg-base border border-border-subtle rounded-2xl py-3 pl-12 pr-4 text-base focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-text-primary placeholder:text-text-muted transition-all"
                placeholder="Buscar producto..."
                [ngModel]="searchTerm()"
                (ngModelChange)="onSearch($event)"
              />
            </div>
          </div>

          <!-- Results -->
          <div class="flex-1 overflow-y-auto px-4 py-2">
            @if (facade.isSearching()) {
              <div class="py-12 text-center text-text-muted flex flex-col items-center gap-3">
                <app-icon name="loader-2" [size]="28" class="animate-spin text-brand" />
                <span class="text-sm font-medium">Buscando en catálogo...</span>
              </div>
            } @else if (facade.searchResults().length > 0) {
              <ul class="flex flex-col gap-2 mt-2">
                @for (product of facade.searchResults(); track product.id) {
                  <li>
                    <div 
                      class="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl text-left border border-border-subtle/50 shadow-sm"
                    >
                      <div class="w-12 h-12 rounded-full bg-base flex items-center justify-center flex-shrink-0 border border-border-default">
                        <app-icon name="tag" [size]="20" class="text-text-muted" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-text-primary text-lg truncate">{{ product.name }}</p>
                        @if (product.category) {
                          <p class="text-xs text-text-muted font-medium uppercase tracking-wider truncate mt-0.5">{{ product.category }}</p>
                        }
                      </div>
                      <div class="flex items-center justify-center shrink-0" (click)="$event.stopPropagation()">
                        @if (getCartItem(product.id); as cartItem) {
                          <div class="flex items-center bg-base rounded-full border border-border-subtle overflow-hidden z-10 shadow-sm">
                            <button class="w-12 h-12 flex items-center justify-center text-text-muted hover:bg-surface active:bg-border-subtle transition-colors" (click)="updateQuantity(cartItem.id, cartItem.quantity || 1, -1, $event)">
                              <app-icon name="minus" [size]="20" />
                            </button>
                            <div class="w-8 flex justify-center font-black text-base text-text-primary">{{ cartItem.quantity || 1 }}</div>
                            <button class="w-12 h-12 flex items-center justify-center text-brand hover:bg-surface active:bg-border-subtle transition-colors" (click)="updateQuantity(cartItem.id, cartItem.quantity || 1, 1, $event)">
                              <app-icon name="plus" [size]="20" />
                            </button>
                          </div>
                        } @else {
                          <button class="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center" (click)="selectProduct(product)">
                            <app-icon name="plus" [size]="20" class="text-brand pointer-events-none" />
                          </button>
                        }
                      </div>
                    </div>
                  </li>
                }
              </ul>
            } @else if (searchTerm().trim().length >= 2) {
              <div class="py-16 text-center px-6">
                <div class="w-20 h-20 rounded-full bg-surface border border-border-default flex items-center justify-center mx-auto mb-6">
                  <app-icon name="package-search" [size]="36" class="text-text-muted" />
                </div>
                <p class="font-bold text-text-primary text-xl mb-2">No se encontró "{{ searchTerm() }}"</p>
                <p class="text-sm text-text-muted mb-8">Agrégalo como un producto nuevo a tu familia.</p>
                
                <button 
                  type="button"
                  class="w-full py-4 bg-brand text-brand-contrast rounded-2xl font-bold text-base shadow-lg shadow-brand/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  (click)="createNewProduct()"
                >
                  <app-icon name="plus" [size]="20" />
                  Crear y añadir
                </button>
              </div>
            } @else {
              <!-- Estado Vacío Mejorado: Esenciales -->
              <div class="py-4">
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 px-2">🛒 Tus Esenciales</h3>
                
                @if (facade.essentials().length > 0) {
                  <ul class="flex flex-col gap-2">
                    @for (item of facade.essentials(); track item.id) {
                      <li>
                        <div class="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl text-left border border-border-subtle/50 shadow-sm">
                          <div class="w-12 h-12 rounded-full bg-base flex items-center justify-center flex-shrink-0 border border-border-default">
                            <app-icon name="tag" [size]="20" class="text-text-muted" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="font-bold text-text-primary text-lg truncate">{{ item.name }}</p>
                          </div>
                          <div class="flex items-center justify-center shrink-0" (click)="$event.stopPropagation()">
                            @if (getCartItem(item.id); as cartItem) {
                              <div class="flex items-center bg-base rounded-full border border-border-subtle overflow-hidden z-10 shadow-sm">
                                <button class="w-12 h-12 flex items-center justify-center text-text-muted hover:bg-surface active:bg-border-subtle transition-colors" (click)="updateQuantity(cartItem.id, cartItem.quantity || 1, -1, $event)">
                                  <app-icon name="minus" [size]="20" />
                                </button>
                                <div class="w-8 flex justify-center font-black text-base text-text-primary">{{ cartItem.quantity || 1 }}</div>
                                <button class="w-12 h-12 flex items-center justify-center text-brand hover:bg-surface active:bg-border-subtle transition-colors" (click)="updateQuantity(cartItem.id, cartItem.quantity || 1, 1, $event)">
                                  <app-icon name="plus" [size]="20" />
                                </button>
                              </div>
                            } @else {
                              <button class="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center" (click)="selectProduct(item)">
                                <app-icon name="plus" [size]="20" class="text-brand pointer-events-none" />
                              </button>
                            }
                          </div>
                        </div>
                      </li>
                    }
                  </ul>
                } @else {
                  <div class="py-10 text-center px-4 flex flex-col items-center justify-center opacity-50">
                    <app-icon name="shopping-bag" [size]="48" class="text-text-muted mb-4" />
                    <p class="text-base text-text-muted font-medium">Aún no tienes productos guardados.</p>
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
  styles: [`
    :host ::ng-deep .search-bottom-sheet {
      --border-radius: 28px 28px 0 0;
      --box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
    }
    
    :host ::ng-deep .search-bottom-sheet::part(handle) {
      background: var(--border-default);
      width: 48px;
      height: 6px;
      margin-top: 12px;
    }
  `]
})
export class ProductSearchComponent {
  readonly visible = input.required<boolean>();
  readonly visibleChange = output<boolean>();

  readonly facade = inject(ProductSearchFacade);
  private shoppingFacade = inject(ShoppingListFacade);

  readonly searchTerm = signal('');
  private searchTimeout: any;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  onShow() {
    this.searchTerm.set('');
    this.facade.clear();
    
    const list = this.shoppingFacade.data();
    if (list) {
      this.facade.loadEssentials(list.family_id);
    }

    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
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

  getCartItem(productId: string) {
    const list = this.shoppingFacade.data();
    if (!list) return null;
    return list.list_items.find(i => i.product?.id === productId) || null;
  }

  async updateQuantity(itemId: string, currentQty: number, change: number, event: Event) {
    event.stopPropagation();
    const newQty = currentQty + change;
    if (newQty < 1) {
      await this.shoppingFacade.deleteItem(itemId);
      return;
    }
    await this.shoppingFacade.updateItemQuantity(itemId, newQty);
  }

  async selectProduct(product: Product) {
    const list = this.shoppingFacade.data();
    if (list) {
      const existing = this.getCartItem(product.id);
      if (existing) {
        await this.shoppingFacade.updateItemQuantity(existing.id, existing.quantity + 1);
      } else {
        await this.shoppingFacade.addItem(list.id, product.id);
      }
      // Ya no cerramos el modal, para permitir agregar más productos a la vez
    }
  }

  async createNewProduct() {
    const term = this.searchTerm().trim();
    if (!term) return;

    const list = this.shoppingFacade.data();
    if (!list) return;

    const newProduct = await this.facade.createProduct(term, list.family_id);
    if (newProduct) {
      await this.shoppingFacade.addItem(list.id, newProduct.id);
      this.close();
    }
  }
}






