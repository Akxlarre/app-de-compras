import { Injectable, inject } from '@angular/core';
import type { ActiveShoppingList } from '../../models/shopping-list.model';
import type { QueuedChange } from '../../models/offline-queue.model';
import { SessionScopeService } from '../auth/session-scope.service';

const QUEUE_KEY = 'shop.offline.queue.v1';
const SNAPSHOT_KEY = 'shop.offline.list.v1';

/**
 * Cola de cambios sin conexión y última foto de la lista activa, en `localStorage` para que
 * sobrevivan a cerrar la app (spec 0011). Es del usuario: se borra al cerrar sesión.
 * Si el almacenamiento no está disponible, funciona como si estuviera vacío.
 */
@Injectable({ providedIn: 'root' })
export class OfflineStoreService {
  constructor() {
    inject(SessionScopeService).register(() => this.clear());
  }

  loadQueue(): QueuedChange[] {
    return this.read<QueuedChange[]>(QUEUE_KEY) ?? [];
  }

  saveQueue(queue: QueuedChange[]): void {
    if (queue.length === 0) this.remove(QUEUE_KEY);
    else this.write(QUEUE_KEY, queue);
  }

  loadSnapshot(): ActiveShoppingList | null {
    return this.read<ActiveShoppingList>(SNAPSHOT_KEY);
  }

  saveSnapshot(list: ActiveShoppingList | null): void {
    if (list) this.write(SNAPSHOT_KEY, list);
    else this.remove(SNAPSHOT_KEY);
  }

  clear(): void {
    this.remove(QUEUE_KEY);
    this.remove(SNAPSHOT_KEY);
  }

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento: la cola vive solo en memoria mientras la app siga abierta.
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // idem
    }
  }
}
