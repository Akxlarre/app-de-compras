import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { AppUpdateService } from '../services/app-update.service';
import { AppUpdate } from '../models/app-update.model';
import { ToastService } from '../services/ui/toast.service';

/**
 * Quién pidió la búsqueda. 'auto' es la de arranque de la app: calla.
 * 'manual' es el botón de Perfil: el usuario espera una respuesta.
 */
export type OrigenBusqueda = 'auto' | 'manual';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateFacade {
  private updateService = inject(AppUpdateService);
  private toast = inject(ToastService);

  // State signals
  private _isChecking = signal(false);
  private _isDownloading = signal(false);
  private _downloadProgress = signal(0);
  private _updateAvailable = signal<AppUpdate | null>(null);
  private _error = signal<string | null>(null);

  // Public computed signals for the UI
  readonly isChecking = computed(() => this._isChecking());
  readonly isDownloading = computed(() => this._isDownloading());
  readonly downloadProgress = computed(() => this._downloadProgress());
  readonly updateAvailable = computed(() => this._updateAvailable());
  readonly error = computed(() => this._error());

  /**
   * En 'manual' avisa los casos que antes quedaban mudos: al día, falla y
   * sin build nativo. Si hay versión nueva no hace falta: ya aparece el
   * modal de actualización. En 'auto' (arranque de la app) calla.
   */
  async checkForUpdates(origen: OrigenBusqueda = 'auto'): Promise<void> {
    const avisar = origen === 'manual';
    this._isChecking.set(true);
    this._error.set(null);

    try {
      const currentBuild = await this.updateService.getCurrentBuild();
      console.log('[AppUpdateFacade] Current build:', currentBuild);
      if (currentBuild === null) {
        if (avisar) {
          this.toast.info(
            'Solo en la app instalada',
            'Las actualizaciones se buscan desde la app en tu teléfono.',
          );
        }
        this._isChecking.set(false);
        return;
      }

      const latestUpdate = await this.updateService.getLatestUpdate();
      console.log('[AppUpdateFacade] Latest update in Supabase:', latestUpdate);
      if (latestUpdate && latestUpdate.build_number > currentBuild) {
        console.log(
          '[AppUpdateFacade] Update available! Build:',
          latestUpdate.build_number,
          'Current:',
          currentBuild,
        );
        this._updateAvailable.set(latestUpdate);
      } else {
        console.log('[AppUpdateFacade] App is up to date.');
        this._updateAvailable.set(null);
        if (avisar) {
          // Info y no success: el verde significa "logrado", y estar al día
          // es un estado, no un logro.
          this.toast.info('Estás al día', 'Ya tienes la última versión de App de Compras.');
        }
      }
    } catch (err) {
      console.error('[AppUpdateFacade] Check update failed:', err);
      this._error.set('No se pudo comprobar si hay actualizaciones.');
      if (avisar) {
        this.toast.error(
          'No se pudo buscar actualizaciones',
          'Revisá tu conexión e intentá de nuevo.',
        );
      }
    } finally {
      this._isChecking.set(false);
    }
  }

  async downloadAndInstall(): Promise<void> {
    const update = this._updateAvailable();
    if (!update) return;

    this._isDownloading.set(true);
    this._downloadProgress.set(0);
    this._error.set(null);

    try {
      const downloadUrl = await this.updateService.getApkDownloadUrl(update.apk_path);
      if (!downloadUrl) throw new Error('No download URL available');

      this.updateService.downloadApk(downloadUrl).subscribe({
        next: async (event) => {
          if (event.type === HttpEventType.DownloadProgress) {
            const percent = Math.round((100 * event.loaded) / (event.total || 1));
            this._downloadProgress.set(percent);
          } else if (event.type === HttpEventType.Response) {
            const blob = event.body;
            if (blob) {
              await this.updateService.installApk(blob, 'update.apk');
            } else {
              throw new Error('Empty file received');
            }
            this._isDownloading.set(false);
          }
        },
        error: (err) => {
          console.error('Download failed:', err);
          this._error.set('Error al descargar la actualización.');
          this._isDownloading.set(false);
        },
      });
    } catch (err) {
      console.error('Setup download failed:', err);
      this._error.set('No se pudo iniciar la descarga.');
      this._isDownloading.set(false);
    }
  }

  dismissUpdate(): void {
    const update = this._updateAvailable();
    if (update?.force_update) {
      return; // No se puede descartar si es forzada
    }
    this._updateAvailable.set(null);
  }
}
