# Fix: unificar sistema de iconos — migrar ion-icon suelto a app-icon (Lucide)

> id: fix-014-unificar-iconos
> refs: auditoría UX/UI — hallazgo de doble sistema de iconos (Lucide + Ionicons)
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

Primera corrida: 3 tests fallaron en `exercise-selector.component.spec.ts`
("The 'x' icon has not been provided by any available icon providers") — el
TestBed usa `LucideAngularModule.pick({...})` con una lista explícita de iconos
permitidos en test (regla del proyecto, `testing-tdd.md`), y los iconos nuevos
(`X`, `XCircle`) no estaban en esa lista. Agregados al `pick()` y al import del
spec. Segunda corrida: `npm run test:ci` → 31 test files / 76 tests, 0 failures.

Verificación final: `grep '<ion-icon'` en todo `src/app` → 10 ocurrencias, las 10
dentro de `ion-tab-button`/`ion-button`/`ion-item[slot]` (las mantenidas a
propósito). 0 usos sueltos restantes.

## Root Cause

32 usos de `<ion-icon>` (Ionicons) conviven con 68 usos de `<app-icon>` (Lucide).
4 archivos usan AMBAS librerías en el MISMO archivo — en `routine-editor.page.ts`
líneas 191/198 hay dos botones idénticos, uno al lado del otro, uno con
`<app-icon name="chevron-down">` y el siguiente con `<ion-icon name="close-outline">`.
Dos familias de iconos con distinto grosor de trazo en la misma pantalla.

## Criterio de migración

**Mantengo `<ion-icon>` SOLO dentro de componentes Ionic nativos** que dependen de su
mecanismo de `slot` (`ion-tab-button`, `ion-item[slot]`, `ion-button[slot="icon-only"]`)
— ahí Ionicons es el patrón esperado del framework, no una inconsistencia.

**Migro a `<app-icon>` todo uso "suelto"**: dentro de `<button>`, `<div>`, `<span>`
custom que no son componentes Ionic. `IconComponent` ya soporta cualquier nombre de
Lucide vía fetch dinámico a CDN si no está en el set local (`icon.component.ts:37-209`)
— no hace falta tocar `app.config.ts`.

Mapeo de nombres (Ionicons → Lucide, todos ya en el set local, cero latencia de CDN
excepto `timer`):
`play-outline→play`, `calendar-outline→calendar`, `time-outline→clock`,
`add-outline→plus`, `close-outline→x`, `trash-outline→trash-2`,
`chatbubble-ellipses-outline→message-circle`, `checkmark-outline→check`,
`log-out-outline→log-out`, `search-outline→search`,
`close-circle-outline→x-circle`, `timer-outline→timer`, `sparkles→sparkles`.

**Tamaño**: `ion-icon` hereda `font-size` (rem); `app-icon` usa un input `[size]` en
px. Para cada ícono migrado, leí la regla CSS `font-size` de su contenedor/selector
específico y la convertí a `[size]` en px preservando el tamaño visual exacto (ej.
`font-size: 1.25rem` → `[size]="20"`). Documentado por archivo abajo. Limpio las
reglas CSS `ion-icon { font-size... }` que quedan huérfanas tras la migración.

## Archivos y migraciones

- `layout/tabs-layout/tabs-layout.component.ts`: `timer-outline`→`timer` (26px),
  `sparkles`→`sparkles` (22px). Mantengo los 3 de `ion-tab-button`.
- `features/workouts/workouts.page.ts`: `play-outline`→`play` ×4 (20px),
  `calendar-outline`→`calendar` (14px), `time-outline`→`clock` (14px). Mantengo el
  de `ion-button[slot=icon-only]`.
- `features/workouts/routines/routine-editor.page.ts`: `add-outline`→`plus` (14px),
  `close-outline`→`x` (20px), `trash-outline`→`trash-2` (16px, default). Mantengo el
  de `ion-button`.
- `features/workouts/history/history.page.ts`: `calendar-outline`→`calendar` (14px),
  `time-outline`→`clock` (14px). Mantengo el de `ion-button[slot=icon-only]`.
- `features/workouts/active-workout/active-workout.page.ts`:
  `chatbubble-ellipses-outline`→`message-circle` (20px), `close-outline`→`x` (20px),
  `checkmark-outline`→`check` (14px y 18px, dos instancias distintas). Sin
  ion-icon restante en este archivo tras la migración.
- `features/explorer/exercise-selector/exercise-selector.component.ts`:
  `close-outline`→`x` (20px), `search-outline`→`search` (18px, de paso corrijo
  `color: #71717a` → `var(--text-muted)` en `.search-icon`, coincidencia exacta no
  detectada en el barrido de colores porque no estaba en el set de hex buscado),
  `close-circle-outline`→`x-circle` (18px). Sin ion-icon restante.
- `features/profile/profile.page.ts`: `log-out-outline`→`log-out` (20px). Mantengo
  los 4 de `ion-item[slot]`.

## Limpieza de imports

Solo elimino un `addIcons({...})`/import de ionicons cuando verifico por grep que
el nombre no tiene NINGÚN otro uso en el archivo. Si queda ambigüedad, dejo el
import sin usar (código muerto inofensivo) antes que arriesgar romper un ícono que
sí se usa en otra parte del archivo.

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` en verde.
