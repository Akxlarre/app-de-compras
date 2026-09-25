# Spec: Selector de ejercicios en Eclipse

> id: 0009-selector-ejercicios
> refs: pendiente anotado en 0007 ("la lista del selector conserva 45
>   colores escritos a mano, incluido un arcoíris por músculo"). 0004 lo
>   dejó fuera de alcance por ser otra superficie.
> status: done
> created: 2026-09-18

## Contexto

El selector es el modal que se abre con "Añadir" en el editor de rutinas
y en la sesión activa. Es la misma tarea que el Catálogo (buscar un
ejercicio) con otra salida: tocar la fila lo elige.

Es **Tier 2 — Trabajo**, también cuando se abre desde la sesión activa:
lo que se hace ahí es buscar, no registrar una serie. El Catálogo ya se
migró (0004) y el selector tiene que verse como él: son los mismos
ejercicios.

Medido en navegador antes de tocar nada (2026-09-18, 375×812), abierto
desde "Nueva Rutina" sin guardar:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 5 — Ergonomía | **18 objetivos bajo 44px** en la primera pantalla: cerrar (**32px**), los 10 chips (**30px**), los botones de info (**40px**) |
| 4 — Legibilidad | Subtítulo **12px**, chips **12.8px**, contador **11.5px** |
| 4 — Legibilidad | Título en Anton a **20px**, debajo del piso de 28px, y en peso 800, que Anton no tiene: el navegador lo engorda a mano |
| 7 — Sistema | Fondo `#0d0d11` y encabezado `#111116`, no la tinta. **45** hex y `rgba()` escritos a mano, entre ellos un azul (`59, 130, 246`) de la marca anterior en foco, chips y fila activa |
| 1 — Semántica | Miniaturas con un color por músculo: pecho en **rojo de error**, espalda en **verde de éxito**, abdomen amarillo, hombro naranja, brazos violeta, glúteos rosa. Isquiotibiales: ícono ember sobre fondo azul |
| 6 — Densidad | Las miniaturas no distinguen: `activity` se repite en piernas, bíceps, tríceps y cardio; `circle` en abdomen y glúteos. Lo que distinguía era el color, y el músculo ya está escrito en la fila |
| 3 — Accesibilidad | El botón de info es solo un ícono, sin `aria-label` |

## Acceptance Criteria

- **AC-01** — Todo objetivo táctil del selector mide ≥ 44px: cerrar,
  chips, info y borrar búsqueda.
- **AC-02** — Ningún texto baja de 13px. El título usa Anton a
  `--font-display-floor` y en su único peso.
- **AC-03** — Las filas pierden las miniaturas, como en el Catálogo
  (AC-05 de 0004: los íconos repetidos distinguen algo real o no están).
  El músculo sigue en la fila, en texto.
- **AC-04** — Cero hex y cero `rgba()` escritos a mano en el selector:
  fondo en tinta, chips iguales a los del Catálogo, foco del buscador en
  ember, sin azul.
- **AC-05** — El botón de info se anuncia con el nombre del ejercicio.
- **AC-06** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El texto visible: solo diseño visual. `aria-label` del botón de info
  es para lectores de pantalla, usa el nombre del ejercicio.
- El `ion-modal { --background: #0d0d11 }` global de `styles.scss`:
  afecta a todos los modales. El selector pinta su propio fondo.
- La lógica de búsqueda y de carga infinita.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: abrir el selector desde
"Nueva Rutina" **sin guardar**, medir objetivos, tamaños y colores;
filtrar por un chip, buscar sin resultados y abrir un detalle. **No**
elegir ejercicios desde la sesión activa: se agregarían a la sesión real
del usuario.
