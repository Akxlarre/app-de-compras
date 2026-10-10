import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export type ShareResult = 'opened' | 'copied' | 'failed';

/** Pasar texto a otra app (spec 0024 D2). */
@Injectable({ providedIn: 'root' })
export class ShareService {
  /**
   * Abre WhatsApp con `text` para elegir a quién mandarlo. En el teléfono, Capacitor manda
   * `wa.me` a la app de WhatsApp; en el navegador se abre WhatsApp Web en otra pestaña. Si no se
   * pudo abrir, copia el texto.
   */
  async openWhatsApp(text: string): Promise<ShareResult> {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (Capacitor.isNativePlatform()) {
      this.navigate(url);
      return 'opened';
    }
    if (window.open(url, '_blank')) return 'opened';
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  private navigate(url: string): void {
    window.location.href = url;
  }
}
