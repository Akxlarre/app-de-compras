# Fix: sustituir colores hardcodeados por tokens en active-workout.page.ts

> id: fix-011-tokens-active-workout
> refs: auditoría UX/UI de esta sesión — mismo criterio que fix-007/008/009/010
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31 test files / 76 tests, 0 failures. Grep confirma 0 residuos.

## Cambio

Mismo criterio ya aplicado (solo coincidencias exactas/imperceptibles):

| Hardcodeado | Token |
|---|---|
| `#3b82f6` | `var(--ds-brand)` |
| `#60a5fa` | `var(--color-primary-hover)` |
| `#10b981` | `var(--state-success)` |
| `color: #fff;` | `color: var(--text-primary);` |
| `style="color: #fff"` | `style="color: var(--text-primary)"` |

No tocado (documentado): `#ef4444`/`#a855f7` (failure/dropset, fuera de alcance
aprobado), `color: white;` en la línea del badge de serie "seleccionada" con fondo
`--state-success` (es texto blanco sobre verde, no sobre marca — no hay token
`--state-success-text` en el sistema, y forzar `--color-primary-text` sería
semánticamente incorrecto; "white" como keyword CSS no es un valor de marca
hardcodeado en el mismo sentido que un hex, lo dejo como está), todos los `rgba(*,X)`
con opacidad custom.

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` en verde.
