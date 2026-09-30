import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * ¿Hay conexión? (spec 0011). `navigator.onLine` solo sabe si hay red, no si llega al servidor:
 * por eso también cuenta el fallo de red de una petición, hasta el próximo `online` o una
 * petición que sí llegue.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly _online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly online = this._online.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;
    const up = () => this._online.set(true);
    const down = () => this._online.set(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    });
  }

  reportNetworkFailure(): void {
    this._online.set(false);
  }

  reportSuccess(): void {
    this._online.set(true);
  }
}
