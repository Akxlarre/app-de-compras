import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './infrastructure/supabase.service';
import { AppUpdate } from '../models/app-update.model';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private supabase = inject(SupabaseService);
  private http = inject(HttpClient);

  /**
   * Obtiene la versión actual nativa (solo válido en dispositivos)
   */
  async getCurrentBuild(): Promise<number | null> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return 1;
      }
      const info = await App.getInfo();
      const num = parseInt(info.build, 10);
      return !isNaN(num) && num > 0 ? num : 1;
    } catch (error) {
      console.warn('Error getting app info, fallback to build 1:', error);
      return 1;
    }
  }

  /**
   * Consulta a Supabase por la última actualización
   */
  async getLatestUpdate(): Promise<AppUpdate | null> {
    const { data, error } = await this.supabase.client
      .from('app_updates')
      .select('*')
      .eq('app_target', 'shop')
      .order('build_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest update:', error);
      return null;
    }

    return data as AppUpdate | null;
  }

  /**
   * Obtiene una URL firmada o pública para descargar el APK
   */
  async getApkDownloadUrl(apkPath: string): Promise<string | null> {
    // Si el bucket es público (como lo configuramos), getPublicUrl funciona.
    const { data } = this.supabase.client.storage.from('releases').getPublicUrl(apkPath);

    return data?.publicUrl || null;
  }

  /**
   * Descarga el APK reportando progreso
   */
  downloadApk(url: string): Observable<HttpEvent<Blob>> {
    return this.http.get(url, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events',
    });
  }

  /**
   * Guarda el Blob del APK en el sistema de archivos del dispositivo y lo ejecuta
   */
  async installApk(blob: Blob, fileName: string = 'update.apk'): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const base64 = await this.blobToBase64(blob);

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

      await FileOpener.open({
        filePath: savedFile.uri,
        contentType: 'application/vnd.android.package-archive',
      });
    } catch (error) {
      console.error('Error installing APK:', error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
