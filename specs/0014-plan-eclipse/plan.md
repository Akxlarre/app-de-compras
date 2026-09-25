# Plan técnico — 0014-plan-eclipse

> Deriva de `spec.md`. Orden pensado para que cada paso se pueda
> commitear y medir por separado.

## Antes de escribir código

1. Activar el track: `/spec-activate 0014-plan-eclipse` (el Spec Gate
   bloquea escrituras en `src/` sin track activo).
2. Rama desde `main` actualizado: `feature/plan-eclipse`.
3. Levantar el server con la herramienta de preview (`preview_start`,
   configuración `app-de-entrenamiento`), **nunca** `ng serve` por Bash.
4. Medir la línea base con la consulta de `spec.md` en los tres estados
   y guardar los números: son la mitad del cierre.

## Archivos y qué toca cada uno

| Archivo | Qué cambia |
|---|---|
| `mesocycle.page.ts` | `.tier-trabajo` en la raíz, `app-header`, `data-anim`, `animateTierEnter()`; 10 colores a mano → tokens; `h2` de sección y de semana fuera de Anton; cifras en `--font-data`; estado sin plan → `app-empty-state` |
| `builder/mesocycle-builder.page.ts` | Lo mismo para el creador; 18 colores a mano; campos a 16px y filas ≥ 44px; los tres `h2` de sección fuera de Anton |
| `components/week-detail.component.ts` | 24 colores a mano; tamaños de 0.7/0.75rem al piso; estado de sesión con forma, no solo color |
| `components/meso-timeline.component.ts` | 8 colores a mano; semana activa con el ember de marca, no con el azul anterior |

No se tocan facade, repositorios ni rutas.

## Pasos

1. **Línea base medida** (sin cambios de código) — anotar en el futuro
   `acceptance.md`.
2. **Tokens y color** en los cuatro archivos: reemplazar cada
   `rgba(255,255,255,*)` por la superficie o el texto que corresponde
   (`--bg-surface`, `--bg-elevated`, `--border-subtle`,
   `--text-secondary`, `--text-muted`), el azul por `--ds-brand` donde
   signifique "activo/marca", y el esmeralda por `--state-success` solo
   donde signifique "completado". Commit propio.
3. **Tipografía**: títulos de sección a `--font-body` con peso alto;
   cifras a `--font-data` con `tabular-nums`; subir al piso todo lo que
   esté en 0.7/0.75rem. Commit propio.
4. **Ergonomía**: objetivos a 44px, campos a 16px. Commit propio.
5. **Tier y entrada**: clase de tier, `data-anim`, `animateTierEnter()`,
   `app-header` si encaja con las otras vistas. Commit propio.
6. **Estados vacíos** con `app-empty-state`, mismo texto. Commit propio.
7. **Verificación** completa (los tres estados), `npm run test:ci`,
   `ng build`, `acceptance.md`, cerrar el track y abrir PR.

## Reglas que aplican

- Tokens sí, colores a mano no (`.claude/rules/visual-system.md`).
- `@if` / `@for`, `input()` / `output()`, `OnPush` — sin `*ngIf` ni
  `@Input()` (el Architect Guard bloquea).
- Animaciones por `GsapAnimationsService`; prohibido `@keyframes` y
  `@angular/animations`.
- Botones que mutan estado: `data-llm-action` (LLM-01/LLM-02 bloquean).
- Commits Conventional, atómicos, con archivos puestos a mano
  (`git add <archivo>`, nunca `git add -A`).
- **Nunca** commitear `src/environments/environment.ts`: el server de
  desarrollo lo reescribe con las llaves del `.env`.
- PR contra `main`; prohibido push directo.

## Criterio de "hecho"

Los ocho AC de `spec.md` verificados con medición, `acceptance.md`
escrito, tests en verde, build sin avisos y PR abierto.
