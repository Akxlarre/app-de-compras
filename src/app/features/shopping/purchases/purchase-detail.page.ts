import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, AlertController, NavController } from '@ionic/angular';
import { PurchaseHistoryFacade } from '@core/facades/purchase-history.facade';
import { PurchaseCloseFacade } from '@core/facades/purchase-close.facade';
import type { PurchaseSummary } from '@core/models/purchase-history.model';
import { formatChileanDate } from '@core/utils/date.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Una compra (spec 0016 AC7): sus boletas, lo que se compró y otros cargos. A la vista lo útil
 * (Agregar boleta / Ingresar total); Renombrar y Borrar en el menú ⋯ (R5).
 */
@Component({
  selector: 'app-purchase-detail-page',
  standalone: true,
  imports: [
    DecimalPipe,
    AppHeaderComponent,
    EmptyStateComponent,
    SkeletonBlockComponent,
    IconComponent,
  ],
  templateUrl: './purchase-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseDetailPage implements OnInit {
  readonly facade = inject(PurchaseHistoryFacade);
  private readonly close = inject(PurchaseCloseFacade);
  private readonly nav = inject(NavController);
  private readonly alerts = inject(AlertController);
  private readonly sheets = inject(ActionSheetController);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly purchase = computed(() => this.facade.byId(this.id));
  readonly dateLabel = computed(() => {
    const p = this.purchase();
    return p ? formatChileanDate(p.completedAt, 'full') : '';
  });
  /** URLs firmadas de las fotos (null si una no se pudo abrir). */
  readonly photos = signal<(string | null)[]>([]);
  /** Foto ampliada. */
  readonly enlarged = signal<string | null>(null);
  readonly abs = Math.abs;

  readonly canAddReceipt = computed(() => !!this.purchase() && !this.purchase()!.hasReceipt);
  readonly canEnterTotal = computed(() => {
    const p = this.purchase();
    return !!p && !p.hasReceipt && p.totalSource === 'estimated';
  });

  async ngOnInit(): Promise<void> {
    await this.facade.initialize();
    const p = this.purchase();
    if (p?.receiptImagePaths.length) {
      this.photos.set(await Promise.all(p.receiptImagePaths.map((x) => this.facade.receiptUrl(x))));
    }
  }

  /** La misma conciliación de 0008 sobre la compra ya cerrada; vuelve a Compras. */
  addReceipt(): void {
    const p = this.purchase();
    if (!p) return;
    this.close.start(p.source, false, 'receipt', 'completed', 'purchases');
    this.nav.navigateForward('/app/close');
  }

  enterTotal(): void {
    const p = this.purchase();
    if (!p) return;
    this.close.start(p.source, false, 'manual', 'completed', 'purchases');
    this.nav.navigateForward('/app/close');
  }

  /** Menú ⋯: Renombrar y Borrar. */
  async more(): Promise<void> {
    const p = this.purchase();
    if (!p) return;
    const sheet = await this.sheets.create({
      header: p.title,
      buttons: [
        { text: 'Renombrar', handler: () => void this.rename(p) },
        { text: 'Borrar compra', role: 'destructive', handler: () => void this.remove(p) },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** Borrar (spec 0012): confirma, borra (con boleta y foto) y vuelve a Compras. */
  async remove(p: PurchaseSummary): Promise<void> {
    const confirmed = await this.ask<boolean>({
      header: '¿Borrar esta compra?',
      message: 'Se borra también su boleta y deja de contar en el gasto del mes.',
      buttons: [{ text: 'Borrar', role: 'destructive', value: () => true }],
    });
    if (!confirmed) return;
    if (await this.facade.deletePurchase(p.id)) this.back();
  }

  /** Renombrar (spec 0012): el título actual como punto de partida. */
  async rename(p: PurchaseSummary): Promise<void> {
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

  back(): void {
    this.nav.navigateBack('/app/purchases');
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
}
