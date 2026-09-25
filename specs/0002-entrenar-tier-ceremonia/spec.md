# Spec: Entrenar como Tier 1 + navegación al pie

> id: 0002-entrenar-tier-ceremonia
> refs: Fase 1 del plan (artifact "Manual de Campo"). Depende de
>   specs/0001-sistema-visual-eclipse, que dejó tokens, tipografía y
>   clases de tier listos.
> status: in-progress
> created: 2026-09-15

## Contexto

Primera vista migrada al sistema Eclipse. El usuario eligió empezar por
**Entrenar** (`/app/workouts`, la home real) en vez del piloto doble del
plan, para ver el sistema aplicado de punta a punta antes de invertir en
las demás.

Durante el reconocimiento aparecieron dos problemas de shell que la vista
no puede resolver sola:

1. **La barra de tabs vive en `slot="top"`**, flotando como píldora y
   reservando 88px + safe-area en todas las pantallas vía
   `--layout-top-offset`. En móvil la navegación va al pie: es el default
   de Ionic y el criterio 5 de la rúbrica (alcance del pulgar).
2. **Quedaron huérfanos del cambio de marca**: el ícono de tab
   seleccionado conserva `drop-shadow(... rgba(59,130,246,.5))` — el
   resplandor azul del brand anterior — y el FAB de sesión activa usa
   `--state-success`, que en el sistema nuevo significa "logrado", no
   "en curso".

El usuario decidió **bajar la barra al pie**.

## Alcance

### Slice 1.1 — Shell
- `ion-tab-bar` pasa a `slot="bottom"` y se repinta con tokens Eclipse
- Se elimina `--layout-top-offset` y el degradado de máscara superior
- El FAB de sesión activa se convierte en **barra de sesión en curso**
  anclada sobre los tabs, mostrando ejercicio y tiempo en vez de un
  ícono mudo
- El FAB del Coach se reubica para no chocar con la barra de tabs

### Slice 1.2 — Vista Entrenar
- Raíz en `.tier-ceremonia`
- Las ocho casillas de la rúbrica
- Estados que hoy no existen: vacío y carga
- Barrido de hex, `rgba()` y estilos inline **solo de esta vista**

## Acceptance Criteria

- **AC-01** — `ion-tab-bar` usa `slot="bottom"`. No queda ningún
  `--layout-top-offset` ni máscara de degradado superior.
- **AC-02** — Ningún color de marca anterior sobrevive en el shell ni en
  Entrenar: cero `rgba(59, 130, 246, …)` y cero hex de la paleta vieja.
- **AC-03** — El estado "sesión en curso" se comunica en ember, no en
  verde. El verde no aparece en ninguna de las dos superficies.
- **AC-04** — La superficie de Entrenar y el shell no tienen atributos
  `style="…"` inline con color.

> **Alcance de AC-04 — el modal de detalle queda afuera.** `workouts.page.ts`
> aloja también el modal "Detalle de Sesión" (182 líneas, fuertemente
> inline). Esa no es parte de Entrenar: en el Manual de Campo figura como
> **Resumen de sesión**, una vista Tier 1 con su propia fila en la matriz.
> Migrarla apurada al final de este track sería peor que migrarla bien en
> el suyo. Sus estilos inline ya usan tokens (`var(--bg-base)`,
> `var(--text-muted)`), así que renderiza correcto en la paleta Eclipse —
> lo que falta es la forma, no el color. **AC-04 no se da por cumplido
> sobre el modal**; se traslada al track de Resumen de sesión.
- **AC-05** — Todo objetivo táctil de ambas superficies mide ≥ 44px
  (`--target-min`).
- **AC-06** — Entrenar tiene estado vacío (sin rutinas y sin historial) y
  estado de carga, ambos diseñados y alcanzables.
- **AC-07** — Ningún texto de Entrenar por debajo de `--text-floor`
  (13px), y la tipografía de impacto no se usa por debajo de
  `--font-display-floor` (28px) ni sobre datos.
- **AC-08** — `npm run test:ci` pasa sin regresiones y `ng build` compila.

> **AC-05b heredado de 0001** — verificar que los cuatro estados
> semánticos se distinguen renderizados sin depender del tono. Entrenar
> no renderiza alertas, así que **no se puede verificar acá sin
> inventarle un uso**. Se traslada al primer track que toque una vista
> con alertas o formularios (login o sesión activa). No se da por
> cumplido.

## Fuera de alcance

- Las otras nueve vistas. Se migran en tracks propios.
- El barrido global de los 115 hex / 213 estilos inline: acá solo caen
  los de estas dos superficies.
- Eliminar `_view-transitions.scss` (huérfano desde fix-022).

## Test de Regresión

`npm run test:ci` + `ng build`, y verificación en navegador de:
navegación entre los tres tabs, arranque de sesión libre, y la barra de
sesión en curso apareciendo y llevando a la sesión activa.
