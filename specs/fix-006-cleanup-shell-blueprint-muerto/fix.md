# Fix: eliminar subsistema muerto del blueprint SaaS + limpiar placeholder de Angular CLI

> id: fix-006-cleanup-shell-blueprint-muerto
> refs: auditoría UX/UI de esta sesión (hallazgo #1 — fractura entre design system documentado y producto real)
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Test de Regresión

`npm run test:ci` en verde antes y después del borrado completo:
- Antes (solo `dashboard.component.ts` borrado): 32 test files / 77 tests, 0 failures.
- Después (los 14 archivos borrados + carpetas vacías removidas): 31 test files / 76 tests,
  0 failures (la baja de 1 archivo/1 test es `dashboard.facade.spec.ts`, borrado junto con
  su facade — esperado, no una regresión).

## Root Cause

El proyecto arrancó con el blueprint genérico de "SaaS dashboard" (sidebar + topbar +
bento-grid + KPIs) documentado en `indices/COMPONENTS.md` como si fuera la app real.
El producto real es una app móvil Ionic/Capacitor con navegación por tabs
(`TabsLayoutComponent`, ver `app.routes.ts`). Nadie desconectó ni borró el blueprint
original cuando el producto pivotó, por lo que conviven dos sistemas visuales: el
"real" (tabs) y el "fantasma" (dashboard/shell), documentado como estable pero
inalcanzable por routing.

Verificado por grep antes de tocar nada — cada componente listado abajo tiene **cero
consumidores** fuera de su propio archivo/spec:

- `DashboardComponent` / `DashboardFacade` — no hay ninguna ruta `dashboard` en
  `app.routes.ts`. El propio JSDoc del componente se autodescribe como
  "REFERENCIA CANÓNICA del sistema de diseño" con instrucciones de "cómo adaptar al
  proyecto" — es boilerplate de arranque, nunca datos reales.
- `AppShellComponent`, `SidebarComponent`, `TopbarComponent` — el layout real es
  `TabsLayoutComponent` (Ionic tabs). Ninguno de los tres se importa desde
  `app.routes.ts` ni `app.config.ts`.
- `UserPanelComponent`, `NotificationsPanelComponent` — solo se usarían desde
  Sidebar/Topbar (que están muertos); no tienen ningún otro consumidor.
- `ActionKpiCardComponent`, `KpiCardVariantComponent` — 2 de las 3 "variantes" de KPI
  card documentadas en `COMPONENTS.md`. Íntegramente implementadas (skeleton, contador
  GSAP, docs) pero jamás elegidas por ninguna pantalla real. La variante única con
  consumidor real es `KpiCardComponent` (usado — antes de este fix — solo por el
  Dashboard fantasma; se conserva porque es la implementación correcta hacia la que
  debería migrar `features/workouts/**`, que hoy reinventa KPIs con emojis).
- `src/app/app.html` — placeholder sin modificar de `ng new` (logo Angular, pills a
  angular.dev, iconos sociales). Nunca se ve en runtime porque `app.routes.ts`
  redirige `''` → `app` → `workouts` de inmediato, pero sigue en el bundle.

## ACs Afectados

Ninguno — no hay spec funcional detrás de este código, es puramente boilerplate
huérfano. No cambia ningún comportamiento visible para el usuario autenticado.

## Cambio

1. Eliminar (archivo + spec + estilos donde aplique):
   - `features/dashboard/dashboard.component.ts`
   - `core/facades/dashboard.facade.ts` + `.spec.ts`
   - `layout/app-shell.component.ts`
   - `layout/sidebar.component.ts`
   - `layout/topbar.component.ts`
   - `shared/components/user-panel/*` (`.ts` + `.scss` + `.css` duplicado)
   - `shared/components/notifications-panel/*` (`.ts` + `.scss` + `.css` duplicado)
   - `shared/components/kpi-card/action-kpi-card.component.ts`
   - `shared/components/kpi-card/kpi-card-variant.component.ts`
2. Limpiar `src/app/app.html`: reemplazar el placeholder completo de Angular CLI por
   solo `<router-outlet />` (root component headless, ya que la navegación real vive
   en `TabsLayoutComponent`).
3. Sincronizar `indices/COMPONENTS.md`: quitar filas de componentes borrados, quitar
   la fila de ruta `/app/dashboard` (no existe), documentar `TabsLayoutComponent`
   como el shell real.
4. Validar: `npm run test:ci` no debe romperse (ningún spec vivo dependía de estos
   archivos — confirmado por grep antes del borrado).

## Fuera de alcance (decisiones que le corresponden al humano, no las tomo acá)

- `ConfirmModalComponent` / `ConfirmModalService.confirm()` también tienen cero
  consumidores reales, y un comentario en `user-panel.component.ts` (ya borrado)
  describía un flujo de confirmación de logout que no existe en `TopbarComponent`.
  No lo borro ni lo conecto — es una decisión de producto (¿el logout debería pedir
  confirmación o no?), no una limpieza de blueprint.
- `src/styles/_view-transitions.scss` (26 líneas, huérfano) vs
  `src/styles/motion/_view-transitions.scss` (62 líneas, el que realmente se importa)
  vs `src/styles/motion/motion/_view-transitions.scss` (182 líneas, huérfano pero más
  completo — incluye keyframes de login/logout). No los toco: el de 182 líneas parece
  trabajo en progreso más avanzado que el que está activo, no basura clara.
- El resto de los hallazgos de la auditoría UX/UI (colores hardcodeados en
  `features/workouts/**`, doble sistema de iconos Lucide/Ionicons, FABs compitiendo,
  `ThemeService` desconectado) quedan para fix tracks separados — tocan pantallas
  reales en producción y merecen su propio track con revisión visual.
