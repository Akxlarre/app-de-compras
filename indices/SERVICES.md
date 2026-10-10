# SERVICES

> Sección auto-generada por `npm run indices:sync`. No editar entre marcadores.

<!-- AUTO-GENERATED:BEGIN -->
| Clase | Dependencias | Archivo |
|-------|-------------|---------|
| `AppUpdateService` | `AppUpdatesRepository`, `HttpClient` | `src/app/core/services/app-update.service.ts` |
| `MenuConfigService` | `AuthFacade` | `src/app/core/services/auth/menu-config.service.ts` |
| `RoleService` | — | `src/app/core/services/auth/role.service.ts` |
| `SessionScopeService` | — | `src/app/core/services/auth/session-scope.service.ts` |
| `FileExportService` | — | `src/app/core/services/file-export.service.ts` |
| `NetworkStatusService` | `DestroyRef` | `src/app/core/services/infrastructure/network-status.service.ts` |
| `OfflineStoreService` | `SessionScopeService` | `src/app/core/services/infrastructure/offline-store.service.ts` |
| `SupabaseService` | — | `src/app/core/services/infrastructure/supabase.service.ts` |
| `ShareService` | — | `src/app/core/services/share.service.ts` |
| `BreadcrumbService` | `Router`, `MenuConfigService` | `src/app/core/services/ui/breadcrumb.service.ts` |
| `ConfirmModalService` | — | `src/app/core/services/ui/confirm-modal.service.ts` |
| `GsapAnimationsService` | `PLATFORM_ID`, `NgZone` | `src/app/core/services/ui/gsap-animations.service.ts` |
| `LayoutDrawerFacadeService` | `LayoutDrawerService` | `src/app/core/services/ui/layout-drawer.facade.service.ts` |
| `LayoutDrawerService` | — | `src/app/core/services/ui/layout-drawer.service.ts` |
| `LayoutService` | — | `src/app/core/services/ui/layout.service.ts` |
| `ModalOverlayService` | — | `src/app/core/services/ui/modal-overlay.service.ts` |
| `NotificationsService` | — | `src/app/core/services/ui/notifications.service.ts` |
| `SearchPanelFacadeService` | `SearchPanelFacadeService` | `src/app/core/services/ui/search-panel.service.ts` |
| `ThemeService` | `ThemeService`, `PLATFORM_ID`, `GsapAnimationsService`, `MessageService` | `src/app/core/services/ui/theme.service.ts` |
| `ToastService` | `MessageService`, `ToastController` | `src/app/core/services/ui/toast.service.ts` |
| `WakeLockService` | — | `src/app/core/services/wake-lock.service.ts` |

<!-- AUTO-GENERATED:END -->

## Notas (manual)
- `FileExportService.saveCsv(name, content)`: en el teléfono escribe en el cache y lo abre con `FileOpener` (app de planillas); en la web lo descarga (spec 0026).
- `ShareService.openWhatsApp(text)`: abre `wa.me` con el texto; si el navegador bloquea la pestaña, lo copia (spec 0024).
- `WakeLockService.keepScreenOn()` / `release()`: Screen Wake Lock API para el modo súper; sin soporte no hace nada (spec 0025).
- `SupabaseService.updateUserMetadata(data)`: `auth.updateUser({ data })`; lo usa `AuthFacade.rename` para el `display_name` de la sesión (spec 0018).
- `AppUpdateService.getCurrentVersion()`: versión instalada (`App.getInfo().version`); null en la web. `AppUpdateFacade.currentVersion` / `loadVersion()` la exponen a Perfil (spec 0018).
- `AuthFacade.rename(name)` (RPC `set_my_display_name` + metadata) y `changePassword(current, next, repeat)` (verifica la actual con `signIn`) (spec 0018).
