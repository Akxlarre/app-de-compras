import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/** Saca un archivo de la app (spec 0026 D4): en el teléfono lo abre, en el navegador lo descarga. */
@Injectable({ providedIn: 'root' })
export class FileExportService {
  /**
   * Teléfono: lo escribe en el cache y Android pregunta con qué app de planillas abrirlo.
   * Navegador: lo descarga. Lanza si no se pudo (p. ej. ninguna app abre CSV).
   */
  async saveCsv(fileName: string, content: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await FileOpener.open({ filePath: uri, contentType: 'text/csv' });
      return;
    }

    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
