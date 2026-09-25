# Fix: sustituir colores hardcodeados por tokens en workouts.page.ts

> id: fix-009-tokens-workouts-page
> refs: auditoría UX/UI de esta sesión — continúa fix-007/fix-008, mismo criterio
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31 test files / 76 tests, 0 failures. Grep confirma 0 residuos de
los hex sustituidos (el único match restante, `var(--text-primary, #fff)`, ya era
un fallback correcto de token, no una violación).

## Root Cause

`workouts.page.ts` (home real de la app) es el peor ofensor de colores hardcodeados
detectado en la auditoría: 33 hex + 51 rgb/rgba. Con los tokens de marca ya
corregidos (fix-007), varios valores ahora coinciden exacto o casi-exacto.

## Cambio — reglas aplicadas en este pase

**SÍ sustituyo** (coincidencia exacta o imperceptible, verificable por valor):
| Hardcodeado | Token | Nota |
|---|---|---|
| `#10b981` | `var(--state-success)` | exacto |
| `#3b82f6` | `var(--ds-brand)` | exacto |
| `#2563eb` | `var(--color-primary-dark)` | exacto |
| `#60a5fa` | `var(--color-primary-hover)` | exacto |
| `color: #fff` / `#ffffff` (texto sobre fondo oscuro) | `var(--text-primary)` | casi-exacto: `--text-primary` dark = `#f4f4f5`, diferencia de 11/255 por canal — imperceptible |
| `color: white` (texto sobre botón de marca) | `var(--color-primary-text)` | exacto (`#ffffff`) — token correcto es este, no `--text-primary`, porque es texto SOBRE el color de marca, no sobre la superficie |

**NO sustituyo en este pase** (documentado, no es negligencia — requiere decisión
aparte que no fue parte del alcance aprobado por el usuario):
- `#93c5fd` (chip de ejercicio) — sin token que coincida a nivel "tint" de texto.
- `#ef4444` / `#eab308` / `#a855f7` (error, warmup, dropset) — mismo patrón de
  desfase que blue/success (`--state-error` dark es `#f87171`, no `#ef4444`), pero
  el usuario solo aprobó corregir marca+éxito, no error/warning. Lo marco como
  hallazgo para decisión futura, no lo toco.
- Todos los `rgba(59,130,246,X)` / `rgba(255,255,255,X)` / `rgba(0,0,0,X)` de
  fondos/bordes con opacidad custom (tints de cards, sombras) — no existe
  infraestructura de tokens `--*-rgb` para componer opacidad arbitraria sin
  inventar tokens nuevos (mismo criterio que fix-008).
- Emojis como iconos KPI (🏋️⚡⏱️📋) — es un problema de sistema de iconos, no de
  color; corresponde a un fix aparte ("unificar Lucide/Ionicons").

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` en verde.
