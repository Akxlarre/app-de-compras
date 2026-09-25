# Fix: el botón de arranque presionado usa un token que no existe

> id: fix-031-token-bone-pressed
> refs: pendiente anotado al cerrar 0004.
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Verificado en navegador: `--bone-pressed` vale `#ffffff`
> en `:root`. No queda ningún `var(--bone-pressed, ...)` con respaldo en
> `src/`. Tests: 107 en verde. El build compila; el exceso de presupuesto
> de Entrenar bajó a 2 bytes y lo resuelve fix-032.

## Síntoma

En Entrenar, el botón del bloque de arranque pide
`var(--bone-pressed, #ffffff)` al presionarse. `--bone-pressed` no está
definido en ningún archivo (medido: vale vacío en `:root`), así que
siempre rinde el respaldo: un blanco puro escrito a mano, fuera de los
tokens.

## Causa raíz

La regla se escribió en la migración de Entrenar (spec 0002) apuntando a
un token que nunca se creó.

## Cambio

1. **`_variables.scss`**: se define `--bone-pressed` en la capa de marca,
   junto a los tokens de acción, con el valor que ya se ve (`#ffffff`):
   sobre el suelo carmesí, el hueso se enciende al presionar.
2. **`workouts.page.ts`**: la regla pasa a `var(--bone-pressed)`, sin
   respaldo.

No cambia nada visible: el token toma el valor que hoy rinde el
respaldo.

## Test de Regresión

- Navegador: `--bone-pressed` definido en `:root`.
- Ningún `var(--bone-pressed, ...)` con respaldo en `src/`.
- `npm run test:ci` + `ng build`.
