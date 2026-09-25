# Fix: corregir --state-error + barrido de tokens en el resto de features/**

> id: fix-012-tokens-error-y-barrido-restante
> refs: continúa fix-007..011, mismo método, ahora con autorización de "seguir sin
>   parar" del usuario — cubre TODOS los archivos restantes con colores hardcodeados
>   de la familia ya corregida (marca/éxito/error/texto).
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31 test files / 76 tests, 0 failures (constante en todo el
barrido). Cubiertos: exercise-selector, login, reset-password, explorer,
mesocycle-builder, app-update-modal, profile, rest-timer, history, mesocycle,
meso-timeline, week-detail, tabs-layout (residuales), app-header. `markdown.pipe.ts`
y `drawer.component.ts` resultaron falsos positivos del grep original (entidad
HTML `&#039;` y variable de plantilla `#backdrop`, no colores) — sin cambios.

## Root Cause (parte 1 — token error)

Mismo patrón que marca/éxito: `--state-error` dark es `#f87171` (red-400, 5 usos
reales) pero el uso dominante real es `#ef4444` (red-500, 26 usos en 13 archivos).
Light mode (`#dc2626`, red-600) YA coincide con el patrón "-100 escalón" esperado —
no necesita cambiar.

Contraste WCAG: `#ef4444` sobre `--bg-surface` dark (`#18181b`) = **4.71:1** (AA,
mismo margen que blue/success ya corregidos).

## Cambio — token

`_variables.scss`, bloque `[data-mode='dark']`:
- `--state-error: #f87171` → `#ef4444`
- `--state-error-bg: rgba(248, 113, 113, 0.1)` → `rgba(239, 68, 68, 0.1)`
- `--state-error-border: rgba(248, 113, 113, 0.2)` → `rgba(239, 68, 68, 0.2)`

Light mode sin cambios (ya correcto).

**NO toco `--state-warning`**: verifiqué que `#eab308` (12 usos) no es un color de
"advertencia del sistema" — es el color del set-type "Calentamiento" (warmup), un
concepto de dominio (tipo de serie: normal/warmup/dropset/failure), no un estado
semántico genérico. Mapearlo a `--state-warning` sería semánticamente incorrecto.
Mismo criterio para `#a855f7`/`#c084fc` (dropset) — no hay token de sistema para
"dropset", es una paleta propia del dominio de entrenamiento sin representación en
el design system. Recomendación (no ejecutada): crear tokens dedicados
`--set-type-warmup`/`--set-type-dropset` si se quiere formalizar esto — decisión de
diseño, no la tomo unilateralmente.

## Cambio — barrido de archivos restantes

Aplico el mismo set de sustituciones ya validado (exacto o imperceptible) a TODOS
los archivos que todavía tienen `#3b82f6`/`#60a5fa`/`#2563eb`/`#10b981`/`#ef4444`/
`#fff`/`#ffffff` como color de texto/fondo/borde sólido:

`exercise-selector.component.ts`, `login.component.ts`, `reset-password.page.ts`,
`explorer.page.ts`, `mesocycle-builder.page.ts`, `app-update-modal.component.ts`,
`profile.page.ts`, `rest-timer.component.ts`, `history.page.ts`, `mesocycle.page.ts`,
`meso-timeline.component.ts`, `week-detail.component.ts`, `tabs-layout.component.ts`
(residuales), `app-header.component.ts`, `markdown.pipe.ts`, `drawer.component.ts`.

Mismas exclusiones documentadas en fix-009/010/011: `#eab308`/`#a855f7`/`#c084fc`
(set-type, fuera de alcance semántico), `#93c5fd` (sin token de tint), todo
`rgba(*, X)` con opacidad custom sin infraestructura de token `-rgb`.

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` en verde después del token fix y después del barrido completo.
