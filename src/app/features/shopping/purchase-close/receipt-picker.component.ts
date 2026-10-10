import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

/** Hasta 5 fotos por boleta (una boleta larga, de arriba hacia abajo). */
const MAX_PHOTOS = 5;

/**
 * Elige la foto de la boleta: "Tomar foto" (cámara) o "Elegir de la galería" (spec 0016 D5).
 * El padre llama a `open()` desde su botón y recibe las imágenes en `picked`.
 */
@Component({
  selector: 'app-receipt-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #camera
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      class="hidden"
      data-testid="boleta-camara"
      (change)="onFiles($event)"
    />
    <input
      #gallery
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      data-testid="boleta-galeria"
      (change)="onFiles($event)"
    />
  `,
})
export class ReceiptPickerComponent {
  private readonly sheets = inject(ActionSheetController);
  private readonly camera = viewChild.required<ElementRef<HTMLInputElement>>('camera');
  private readonly gallery = viewChild.required<ElementRef<HTMLInputElement>>('gallery');

  readonly picked = output<File[]>();

  async open(): Promise<void> {
    const sheet = await this.sheets.create({
      header: 'Foto de la boleta',
      buttons: [
        { text: 'Tomar foto', handler: () => this.camera().nativeElement.click() },
        { text: 'Elegir de la galería', handler: () => this.gallery().nativeElement.click() },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'));
    input.value = '';
    if (files.length) this.picked.emit(files.slice(0, MAX_PHOTOS));
  }
}
