import { Injectable } from '@angular/core';

interface ScreenLock {
  release(): Promise<void>;
}

/**
 * Pantalla siempre encendida en el modo súper (spec 0025 D1), con la Screen Wake Lock API. Si el
 * navegador o el teléfono no lo permiten, no pasa nada: el modo funciona igual.
 */
@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private lock: ScreenLock | null = null;

  async keepScreenOn(): Promise<void> {
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request(type: 'screen'): Promise<ScreenLock> };
      }
    ).wakeLock;
    if (!wakeLock || this.lock) return;
    try {
      this.lock = await wakeLock.request('screen');
    } catch {
      this.lock = null;
    }
  }

  async release(): Promise<void> {
    const lock = this.lock;
    this.lock = null;
    try {
      await lock?.release();
    } catch {
      // Ya estaba suelto (p. ej. la app pasó a segundo plano).
    }
  }
}
