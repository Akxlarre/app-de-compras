# Fix: completar sustitución de #ef4444 en archivos procesados antes de fix-012

> id: fix-013-ef4444-residual
> refs: gap detectado por auto-verificación tras fix-012
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31/76, 0 failures. `grep -rlE "#ef4444" src/app` → 0 archivos.

## Root Cause

`workouts.page.ts`, `routine-editor.page.ts` y `active-workout.page.ts` se
procesaron en fix-009/010/011, ANTES de corregir `--state-error` en fix-012. En ese
momento `#ef4444` todavía no coincidía con el token (que era `#f87171`), así que
correctamente no se tocó. Ahora que `--state-error` es `#ef4444` (fix-012), estos 13
usos residuales sí son sustituibles.

## Cambio

`#ef4444` → `var(--state-error)` en los 3 archivos (13 ocurrencias totales: 3 + 3 + 7).

## Test de Regresión

`npm run test:ci` en verde.
