import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef, signal, computed, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ProductSearchComponent } from '../product-search/product-search.component';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IonList, IonItemSliding, IonItem, IonItemOptions, IonItemOption, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-active-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CheckboxModule,
    AppHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonBlockComponent,
    IconComponent,
    ProductSearchComponent,
    ConfirmDialogModule,
    IonList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption
  ],
  templateUrl: './active-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveListPage implements OnInit {
  public facade = inject(ShoppingListFacade);
  private destroyRef = inject(DestroyRef);
  private alertController = inject(AlertController);
  private gsap = inject(GsapAnimationsService);
  private cdr = inject(ChangeDetectorRef);
  
  @ViewChild('ionList', { read: ElementRef }) listElementRef?: ElementRef;
  
  public isSearchOpen = signal(false);

  // Lista ordenada (pendientes arriba, listos abajo)
  public sortedListItems = computed(() => {
    const list = this.facade.data();
    if (!list || !list.list_items) return [];
    
    return [...list.list_items].sort((a, b) => {
      if (a.is_checked === b.is_checked) return 0;
      return a.is_checked ? 1 : -1;
    });
  });

  // KPIs
  public listSummary = computed(() => {
    const list = this.facade.data();
    if (!list || !list.list_items) return { total: 0, checked: 0, pending: 0, estimatedCost: 0 };
    
    let checked = 0;
    let estimatedCost = 0;
    
    for (const item of list.list_items) {
      if (item.is_checked) checked++;
      
      const price = item.product?.last_price || 0;
      estimatedCost += (item.quantity || 1) * price;
    }
    
    return {
      total: list.list_items.length,
      checked,
      pending: list.list_items.length - checked,
      estimatedCost
    };
  });

  ngOnInit() {
    this.facade.initialize();
    this.facade.loadTemplates();
    this.destroyRef.onDestroy(() => this.facade.dispose());
  }

  async cloneList(sourceListId: string) {
    const list = this.facade.data();
    if (!list) return;
    await this.facade.cloneListItems(sourceListId, list.id);
  }

  async saveTemplate() {
    const list = this.facade.data();
    if (!list) return;
    const alert = await this.alertController.create({
      header: 'Guardar Plantilla',
      message: 'Dale un nombre a esta plantilla (ej. Asado, Mensual)',
      inputs: [
        {
          name: 'templateName',
          type: 'text',
          placeholder: 'Nombre de la plantilla'
        }
      ],
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Guardar',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: async (data) => {
            if (data.templateName) {
              await this.facade.saveAsTemplate(list.id, data.templateName);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async createNewList() {
    await this.facade.createList('Compra de la Semana');
  }

  toggleItem(itemId: string, currentStatus: boolean) {
    if (this.listElementRef?.nativeElement) {
      this.gsap.animateBentoLayoutChange(
        this.listElementRef.nativeElement,
        () => {
          this.facade.toggleItemCheck(itemId, currentStatus);
          this.cdr.detectChanges(); // Forzar render síncrono para calcular la nueva posición (FLIP)
        },
        undefined,
        { duration: 0.7, ease: 'expo.out' } // Fluid and elegant list reordering
      );
    } else {
      this.facade.toggleItemCheck(itemId, currentStatus);
    }
  }

  updateQuantity(itemId: string, currentQty: number, change: number, event: Event) {
    event.stopPropagation();
    const newQty = currentQty + change;
    if (newQty < 1) return;
    this.facade.updateItemQuantity(itemId, newQty);
  }

  deleteItem(itemId: string) {
    this.facade.deleteItem(itemId);
  }

  async completeList(listId: string) {
    const alert = await this.alertController.create({
      header: '¿Finalizar Compra?',
      message: `Tienes ${this.listSummary().pending} ítems pendientes. ¿Archivar esta lista?`,
      cssClass: 'premium-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
        {
          text: 'Sí, Finalizar',
          role: 'confirm',
          cssClass: 'alert-confirm-btn',
          handler: async () => {
            await this.facade.completeList(listId);
          }
        }
      ]
    });

    await alert.present();
  }
}
