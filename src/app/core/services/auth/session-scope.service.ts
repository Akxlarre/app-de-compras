import { Injectable } from '@angular/core';

/**
 * Datos atados a la sesión del usuario. Los facades son singletons `root`: sin esto, quien entra
 * después en el mismo teléfono ve la lista y el catálogo del anterior (SWR muestra lo cacheado).
 *
 * Cada facade con datos del usuario registra su limpieza (`BaseFacade` lo hace solo);
 * `AuthFacade` llama `clear()` al cerrar sesión. Guardia: `architecture.spec.ts` regla (h).
 */
@Injectable({ providedIn: 'root' })
export class SessionScopeService {
  private readonly resets = new Set<() => void>();

  register(reset: () => void): void {
    this.resets.add(reset);
  }

  /** Limpia todo lo registrado. Una limpieza que falla no impide las demás. */
  clear(): void {
    for (const reset of this.resets) {
      try {
        reset();
      } catch (e) {
        console.error('[SessionScope] Error limpiando estado de sesión', e);
      }
    }
  }
}
