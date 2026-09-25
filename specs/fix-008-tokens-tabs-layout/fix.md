# Fix: sustituir colores hardcodeados por tokens en tabs-layout.component.ts

> id: fix-008-tokens-tabs-layout
> refs: auditoría UX/UI de esta sesión — depende de fix-007-corregir-tokens-marca
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31 test files / 76 tests, 0 failures. Confirmado por grep que no
quedan `#3b82f6|#71717a|#10b981|#09090b` en el archivo.

## Root Cause

`tabs-layout.component.ts` (el shell real de la app — tab bar visible en cada
pantalla) tiene ~13 colores hex/rgba hardcodeados en su bloque `styles:`, violando
ARCH-08/AP-004. Con los tokens ya corregidos en fix-007, varios de estos valores
ahora coinciden EXACTO con un token existente.

## Cambio

Solo sustituyo donde hay **coincidencia exacta de valor** (cero cambio visual,
verificable por comparación de string, no por ojo):

| Hardcodeado | Token | Verificado |
|---|---|---|
| `#09090b` (gradient mask stop) | `var(--bg-base)` | `--bg-base` dark = `#09090b` exacto |
| `--color: #71717a` (tab inactivo) | `var(--text-muted)` | `--text-muted` dark = `#71717a` exacto |
| `--color-selected: #3b82f6` (tab activo) | `var(--ds-brand)` | `--ds-brand` dark = `#3b82f6` exacto (post fix-007) |
| `.active-workout-fab { background: #10b981 }` | `var(--state-success)` | `--state-success` dark = `#10b981` exacto (post fix-007) |

**Lo que NO toco en este fix** (documentado, no es negligencia):
- Los `box-shadow`/`filter: drop-shadow` con rgba a opacidad custom (0.4, 0.5) — no
  existe un token `--state-success-rgb`/`--ds-brand-rgb` (triplete sin alpha) en el
  proyecto para componer `rgba(var(...), X)`. Agregar esos tokens es un cambio de
  alcance mayor (afecta el archivo de tokens compartido) — lo dejo para decisión
  aparte, no lo invento acá.
- El gradiente del FAB de Coach IA (`#6366f1 → #8b5cf6 → #d946ef`, indigo/púrpura/
  fucsia) — es una identidad de color deliberadamente DISTINTA a la marca (para
  diferenciar visualmente "función de IA" del resto de la UI). No es el mismo
  gradiente que `--gradient-hero` (que es azul→indigo→púrpura, sin fucsia). No lo
  fuerzo a encajar en un token que no le corresponde semánticamente.
- `@keyframes coach-fab-pulse` — viola ARCH-07 (debe ser GSAP, no CSS keyframes),
  pero convertir una animación de pulso infinito a GSAP es un cambio de
  comportamiento de motion, no de color — distinta categoría de riesgo. Fuera de
  alcance de este fix.
- `--background: rgba(12, 12, 16, 0.85)` del tab bar (glassmorphism) — no coincide
  con ningún token de superficie existente (`--overlay-backdrop` es
  `rgba(9,9,11,0.4)`, distinto). No invento un valor "parecido".

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` en verde — cambio es 100% visual (mismo valor computado), sin
lógica de negocio involucrada.
