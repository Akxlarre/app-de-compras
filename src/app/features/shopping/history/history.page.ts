import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AlertController, NavController } from '@ionic/angular';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import type { PurchaseSummary } from '@core/models/purchase-history.model';
import { capitalize, formatChileanDate } from '@core/utils/date.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [
    DecimalPipe,
    AppHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonBlockComponent,
    IconComponent,
  ],
  templateUrl: './history.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage implements OnInit {
  readonly facade = inject(PurchaseHistoryFacade);
  private readonly nav = inject(NavController);
  private readonly close = inject(PurchaseCloseFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alerts = inject(AlertController);

  /** Compra con el detalle abierto. */
  readonly openId = signal<string | null>(null);
  /** Foto de boleta abierta (URL firmada; null si no se pudo abrir). */
  readonly receiptPhoto = signal<{ id: string; url: string | null } | null>(null);
  readonly loadingPhoto = signal(false);

  readonly monthLabel = capitalize(
    new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date())
  );

  readonly purchases = computed(() =>
    (this.facade.data() ?? []).map((p) => ({
      ...p,
      dateLabel: formatChileanDate(p.completedAt, 'medium'),
    }))
  );

  ngOnInit(): void {
    this.facade.initialize();
    this.destroyRef.onDestroy(() => this.facade.dispose());
  }

  toggle(id: string): void {
    this.openId.update((current) => (current === id ? null : id));
  }

  canAddReceipt(p: PurchaseSummary): boolean {
    return !p.hasReceipt;
  }

  canEnterTotal(p: PurchaseSummary): boolean {
    return !p.hasReceipt && p.totalSource === 'estimated';
  }

  /** Historial → "Agregar boleta": la misma conciliación de 0008 sobre la compra ya cerrada. */
  addReceipt(p: PurchaseSummary): void {
    this.close.start(p.source, false, 'receipt', 'completed');
    this.nav.navigateForward('/app/close');
  }

  /** Historial → "Ingresar total": el "sin boleta" de 0008 sobre la compra ya cerrada. */
  enterTotal(p: PurchaseSummary): void {
    this.close.start(p.source, false, 'manual', 'completed');
    this.nav.navigateForward('/app/close');
  }

  /** Compra no planificada: la boleta crea la compra. */
  scanUnplanned(): void {
    this.close.startNew();
    this.nav.navigateForward('/app/close');
  }

  async toggleReceipt(p: PurchaseSummary): Promise<void> {
    if (this.receiptPhoto()?.id === p.id) {
      this.receiptPhoto.set(null);
      return;
    }
    if (!p.receiptImagePath) return;
    this.loadingPhoto.set(true);
    const url = await this.facade.receiptUrl(p.receiptImagePath);
    this.loadingPhoto.set(false);
    this.receiptPhoto.set({ id: p.id, url });
  }

  /** Borrar compra (spec 0012): confirma, borra (con boleta y foto) y cierra el detalle. */
  async deletePurchase(p: PurchaseSummary): Promise<void> {
    const confirmed = await this.ask<boolean>({
      header: '¿Borrar esta compra?',
      message: 'Se borra también su boleta y deja de contar en el gasto del mes.',
      buttons: [{ text: 'Borrar', role: 'destructive', value: () => true }],
    });
    if (!confirmed) return;
    if (await this.facade.deletePurchase(p.id)) this.openId.set(null);
  }

  /** Renombrar compra (spec 0012): el título actual como punto de partida. */
  async renamePurchase(p: PurchaseSummary): Promise<void> {
    const name = await this.ask<string>({
      header: 'Renombrar compra',
      inputs: [{ name: 'name', type: 'text', value: p.title, attributes: { maxlength: 60 } }],
      buttons: [
        {
          text: 'Guardar',
          cssClass: 'alert-confirm-btn',
          value: (data?: { name?: string }) => data?.name ?? '',
        },
      ],
    });
    if (name !== null) await this.facade.renamePurchase(p.id, name);
  }

  /** Alerta con botones que resuelven un valor, más "Cancelar" (resuelve null). */
  private ask<T>(opts: {
    header: string;
    message?: string;
    inputs?: { name: string; type: 'text'; value: string; attributes?: object }[];
    buttons: { text: string; role?: string; cssClass?: string; value: (data?: any) => T }[];
  }): Promise<T | null> {
    return new Promise<T | null>(async (resolve) => {
      const alert = await this.alerts.create({
        header: opts.header,
        message: opts.message,
        inputs: opts.inputs ?? [], // ion-alert no abre con `inputs: undefined`
        cssClass: 'premium-alert',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            cssClass: 'alert-cancel-btn',
            handler: () => resolve(null),
          },
          ...opts.buttons.map((b) => ({
            text: b.text,
            role: b.role ?? 'confirm',
            cssClass: b.cssClass,
            handler: (data?: unknown) => resolve(b.value(data)),
          })),
        ],
      });
      alert.onDidDismiss().then(() => resolve(null));
      await alert.present();
    });
  }

  back(): void {
    this.nav.navigateBack('/app/active');
  }
}
