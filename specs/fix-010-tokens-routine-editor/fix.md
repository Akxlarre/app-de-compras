# Fix: sustituir colores hardcodeados por tokens en routine-editor.page.ts

> id: fix-010-tokens-routine-editor
> refs: auditoría UX/UI de esta sesión — mismo criterio que fix-007/008/009
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31 test files / 76 tests, 0 failures. Grep confirma 0 residuos.

## Cambio

Mismo criterio que fix-009 (solo coincidencias exactas/imperceptibles con los
tokens ya corregidos en fix-007; rgba con opacidad custom y error/warning/dropset
quedan fuera de alcance, documentados, no tocados):

| Hardcodeado | Token |
|---|---|
| `#3b82f6` | `var(--ds-brand)` |
| `#60a5fa` | `var(--color-primary-hover)` |
| `#fff` (color de texto) | `var(--text-primary)` |
| `#10b981` (badge "normal") | `var(--state-success)` |

No tocado: `#ef4444`/`#eab308`/`#a855f7` (badges warmup/dropset/failure), todos los
`rgba(*, X)` con opacidad custom.

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` en verde.
