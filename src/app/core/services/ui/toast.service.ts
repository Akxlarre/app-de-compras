import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastController } from '@ionic/angular';

/**
 * ToastService — Capa 1 del sistema de notificaciones.
 *
 * Wrapper delgado sobre PrimeNG MessageService para toasts efímeros.
 * Centraliza la configuración de severidad, duración y key.
 *
 * PrimeNG MessageService ya está provisto en app.config.ts y
 * p-toast está montado en app.component.ts con animaciones GSAP.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly msg = inject(MessageService);
  private readonly ionToast = inject(ToastController);

  success(summary: string, detail?: string): void {
    this.msg.add({ severity: 'success', summary, detail, life: 3000 });
  }

  error(summary: string, detail?: string): void {
    this.msg.add({ severity: 'error', summary, detail, life: 6000 });
  }

  warning(summary: string, detail?: string): void {
    this.msg.add({ severity: 'warn', summary, detail, life: 4000 });
  }

  info(summary: string, detail?: string): void {
    this.msg.add({ severity: 'info', summary, detail, life: 3000 });
  }

  /**
   * Aviso con un botón de acción ("Quitaste Leche · Deshacer", spec 0013 Q27).
   * Usa el toast de Ionic, que trae botones; se ubica arriba como los demás.
   */
  async action(summary: string, actionLabel: string, onAction: () => void): Promise<void> {
    const toast = await this.ionToast.create({
      message: summary,
      duration: 5000,
      position: 'top',
      cssClass: 'action-toast',
      buttons: [{ text: actionLabel, role: 'undo', handler: () => onAction() }],
    });
    await toast.present();
  }
}
