# Plan técnico — 0009-selector-ejercicios

## Estrategia

Llevar el selector al lenguaje del Catálogo, que ya pasó la rúbrica: los
mismos chips, la misma fila sin miniatura y los mismos tokens. Lo único
que el selector tiene de más es su encabezado de modal (título, cerrar,
buscador nativo) y el botón de info por fila.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/explorer/exercise-selector/exercise-selector.component.ts` | Plantilla y estilos; salen `getIconStyle`, `getIconName` y el CSS muerto (`.exercise-badges-row`, `.badge-*`, `.exercise-category-tag`, que ninguna plantilla usa) |

Un solo archivo. `getExerciseIcon` sigue en `core/utils`: lo usa el
detalle de ejercicio.

## Orden

1. Raíz `tier-trabajo`; fondo, encabezado y lista en `--bg-base`, con
   separador `--border-subtle`.
2. Encabezado: título en Anton a `--font-display-floor`; subtítulo y
   contador a `--text-xs`; cerrar y borrar búsqueda a `--target-min`.
3. Buscador: `--bg-surface` y `--border-default`; foco con borde ember y
   `--shadow-focus`.
4. Chips: los mismos valores que el Catálogo.
5. Filas: sin miniatura, nombre y meta como el Catálogo; info a
   `--target-min` con `aria-label`.
6. Estados de carga y vacío: textos a `--text-muted`.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El título en 28px no entra junto al botón de cerrar | Anton es condensada; se mide en 375px |
| La fila pierde el ancla visual de 44px | La fila entera sigue siendo el objetivo; se mide su alto |
| Elegir un ejercicio en la prueba lo agrega a una sesión real | Se prueba solo desde "Nueva Rutina", sin guardar |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: el mismo script de la línea base.
