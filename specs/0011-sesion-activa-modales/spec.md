# Spec: Modales de la sesión activa

> id: 0011-sesion-activa-modales
> refs: segunda parte de la sesión activa; 0010 cubrió la superficie de
>   registro y dejó los modales fuera.
> status: done
> created: 2026-09-18

## Contexto

La sesión activa abre seis modales, todos con el `app-modal`
compartido: descartar, quitar ejercicio, terminar, tipo de serie,
feedback del ejercicio y resumen de la sesión. Se usan **en medio del
entrenamiento** (el tipo de serie se cambia entre series) o al cerrarlo,
todavía en el gimnasio: les corresponde el piso táctil de Tier 3.

Medido en navegador antes de tocar nada (2026-09-18, 375×812),
abriendo cada modal desde el estado de la página con la sesión de
ejemplo de 0010, sin confirmar nada:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 4 — Legibilidad | Los seis títulos en **Anton a 18px**, debajo del piso de 28px. Es el `app-modal` compartido: pasa también en el modal de borrar rutina de Entrenar |
| 5 — Ergonomía | Cerrar mide **32px** en los seis. Feedback: categorías **34px**, calificación **54×34**. Resumen: energía **54×37**, RPE **26×31** (diez botones), notas 44 |
| 7 — Sistema | Selección en el **azul** de la marca anterior (categoría, calificación, energía, RPE). Tipos de serie en **amarillo y morado** |
| 1 — Semántica | "Continuar", "Guardar" y "Terminar y Guardar" en **verde de éxito**: son acciones, no estados. El tipo "Normal" seleccionado también en verde |
| 7 — Sistema | El aviso de series incompletas en amarillo escrito a mano (`#eab308`) en estilos en línea |
| 7 — Sistema | Los estilos de la página pasan el presupuesto de 10 kB (11.06 kB) tras 0010: los modales cargan buena parte |

## Acceptance Criteria

- **AC-01** — Los seis modales viven en Tier 3: todo objetivo mide
  ≥ 56px (cerrar, opciones de tipo de serie, categorías,
  calificaciones, energía, RPE, notas y botones del pie).
- **AC-02** — El título del `app-modal` compartido no usa Anton por
  debajo de su piso: va en la tipografía de cuerpo, en negrita. Su
  botón de cerrar mide `--target-min` fuera de Tier 3 y 56 dentro.
- **AC-03** — Selección en ember, sin azul; tipos de serie neutros
  como en la tabla (0010); acciones principales del pie en ember;
  descartar y quitar en `--state-error-*`; el aviso de series
  incompletas en `--state-warning-*`.
- **AC-04** — Cero hex y cero `rgba()` escritos a mano en
  `active-workout.page.ts`.
- **AC-05** — Los estilos de la página vuelven a entrar en el
  presupuesto de 10 kB: `ng build` sin ese aviso.
- **AC-06** — `npm run test:ci` pasa.

## Fuera de alcance

- El texto: solo diseño visual.
- El drawer del Coach: `app-drawer` cambia en otra rama (0007, PR #10).
- La alerta de error al guardar (`AlertController` de Ionic).

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: abrir los seis modales
desde el estado de la página con la sesión de ejemplo, medir objetivos,
fuentes y colores, y elegir opciones sin confirmar. Abrir también el
modal de borrar rutina de Entrenar (mismo `app-modal`). **No** tocar
"Terminar y Guardar". Borrar la sesión de ejemplo al final.
