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
import { ProductSheetFacade } from '@core/facades/product-sheet.facade';
import { ShoppingListFacade } from '@core/facades/shopping-list.facade';
import type { Product } from '@core/models/product.model';
import { ToastService } from '@core/services/ui/toast.service';
import { formatAmount } from '@core/utils/price.utils';
import { daysSince, formatDaysAgo } from '@core/utils/date.utils';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { ErrorStateComponent } from '@shared/components/error-state/error-state.component';
import { SkeletonBlockComponent } from '@shared/components/skeleton-block/skeleton-block.component';
import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Ficha de un producto (spec 0017): precio, cada cuánto se compra, sus compras y los textos de
 * boleta que lo reconocen. Se agrega a la lista, se renombra, se junta con un duplicado y se
 * archiva (con compras) o borra (sin compras).
 */
@Component({
  selector: 'app-product-sheet-page',
  standalone: true,
  imports: [
    DecimalPipe,
    AppHeaderComponent,
    ErrorStateComponent,
    SkeletonBlockComponent,
    IconComponent,
  ],
  templateUrl: './product-sheet.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSheetPage implements OnInit {
  readonly facade = inject(ProductSheetFacade);
  private readonly lists = inject(ShoppingListFacade);
  private readonly nav = inject(NavController);
  private readonly alerts = inject(AlertController);
  private readonly sheets = inject(ActionSheetController);
  private readonly toast = inject(ToastService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly product = computed(() => this.facade.data()?.product ?? null);
  readonly isArchived = computed(() => !!this.product()?.archived_at);

  /** Último pagado (con compras) o estimado (sin compras), D5. */
  readonly priceLabel = computed(() => {
    const price = this.product()?.last_price;
    if (price == null) return 'Sin precio';
    return this.facade.hasPurchases()
      ? `Último pagado $${formatAmount(price)}`
      : `$${formatAmount(price)} estimado`;
  });

  readonly editingPrice = signal(false);
  readonly merging = signal(false);
  readonly mergeResults = signal<Product[]>([]);
  readonly formatAmount = formatAmount;

  ngOnInit(): void {
    this.facade.open(this.id);
  }

  /** "5 oct 2026", como las fechas de Compras. */
  dateLabel(iso: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }

  /** "hace 5 días" (D1). La fecha de la boleta viene sin hora: se lee como día local. */
  ago(date: string): string {
    const local = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date;
    return formatDaysAgo(daysSince(local));
  }

  back(): void {
    this.nav.navigateBack('/app/products');
  }

  /** "Agregar a la lista" (AC3): a la lista activa, sin salir de la ficha. */
  async addToList(): Promise<void> {
    const product = this.product();
    if (!product) return;
    await this.lists.initialize();
    const list = this.lists.data();
    if (!list) {
      this.toast.warning('No tienes una lista activa', 'Crea una en Mi Lista y vuelve a intentar.');
      return;
    }
    if (list.list_items.some((i) => i.product_id === product.id)) {
      this.toast.info('Ya está en tu lista');
      return;
    }
    if (await this.lists.addProducts([product.id])) {
      this.toast.success('Agregado a tu lista', product.name);
    }
  }

  /** Menú ⋯ (D2): Renombrar, Juntar, y Archivar/Reactivar o Borrar según tenga compras. */
  async more(): Promise<void> {
    if (!this.product()) return;
    const last = this.isArchived()
      ? { text: 'Reactivar', handler: () => void this.facade.unarchive() }
      : this.facade.hasPurchases()
      ? { text: 'Archivar', handler: () => void this.archive() }
      : { text: 'Borrar', role: 'destructive', handler: () => void this.remove() };
    const sheet = await this.sheets.create({
      header: this.product()!.name,
      buttons: [
        { text: 'Renombrar', handler: () => void this.rename() },
        { text: 'Juntar con otro producto', handler: () => this.startMerge() },
        last,
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async rename(): Promise<void> {
    const product = this.product();
    if (!product) return;
    const name = await this.ask<string>({
      header: 'Renombrar producto',
      inputs: [{ name: 'name', type: 'text', value: product.name, attributes: { maxlength: 60 } }],
      buttons: [
        {
          text: 'Guardar',
          cssClass: 'alert-confirm-btn',
          value: (data?: { name?: string }) => data?.name ?? '',
        },
      ],
    });
    if (name === null) return;
    const result = await this.facade.rename(name);
    if (!result.ok && result.duplicateOf) {
      await this.confirmMerge(result.duplicateOf, name.trim(), `Ya existe «${name.trim()}»`);
    }
  }

  async archive(): Promise<void> {
    const ok = await this.ask<boolean>({
      header: '¿Archivar este producto?',
      message:
        'Sale del buscador, del Catálogo y de "Te puede faltar". Sus compras pasadas se mantienen.',
      buttons: [{ text: 'Archivar', value: () => true }],
    });
    if (ok) await this.facade.archive();
  }

  /** Borrar (solo sin compras, D3): confirma y vuelve al Catálogo. */
  async remove(): Promise<void> {
    const ok = await this.ask<boolean>({
      header: '¿Borrar este producto?',
      message: 'Nunca se compró: desaparece del catálogo.',
      buttons: [{ text: 'Borrar', role: 'destructive', value: () => true }],
    });
    if (ok && (await this.facade.remove())) this.back();
  }

  // ── Juntar (D4) ──

  startMerge(): void {
    this.mergeResults.set([]);
    this.merging.set(true);
  }

  async searchMerge(term: string): Promise<void> {
    this.mergeResults.set(await this.facade.mergeCandidates(term));
  }

  async pickMerge(into: Product): Promise<void> {
    await this.confirmMerge(into.id, into.name, `¿Juntar con «${into.name}»?`);
  }

  private async confirmMerge(intoId: string, intoName: string, header: string): Promise<void> {
    const name = this.product()?.name ?? '';
    const ok = await this.ask<boolean>({
      header,
      message: `Las compras, boletas y textos de «${name}» pasan a «${intoName}» y «${name}» se borra. No se puede deshacer.`,
      buttons: [{ text: 'Juntar', value: () => true }],
    });
    if (!ok) return;
    if (await this.facade.mergeInto(intoId, intoName)) {
      this.merging.set(false);
      this.nav.navigateRoot(`/app/products/${intoId}`);
    }
  }

  async removeAlias(rawText: string): Promise<void> {
    const ok = await this.ask<boolean>({
      header: '¿Quitar este texto?',
      message: `La próxima boleta que diga «${rawText}» no lo reconocerá sola.`,
      buttons: [{ text: 'Quitar', value: () => true }],
    });
    if (ok) await this.facade.removeAlias(rawText);
  }

  // ── Precio estimado (D5, AC11) ──

  editPrice(): void {
    if (this.facade.hasPurchases()) return;
    this.editingPrice.set(true);
    setTimeout(() => document.querySelector<HTMLInputElement>('[data-estimated-price]')?.focus());
  }

  async onPriceBlur(event: Event): Promise<void> {
    if (!this.editingPrice()) return;
    this.editingPrice.set(false);
    const digits = (event.target as HTMLInputElement).value.replace(/[^\d]/g, '');
    if (digits) await this.facade.setEstimatedPrice(Number(digits));
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
