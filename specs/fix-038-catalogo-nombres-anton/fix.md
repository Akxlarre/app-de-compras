# Fix: los nombres del Catálogo salen en Anton a 16px

> id: fix-038-catalogo-nombres-anton
> refs: anotado al cerrar fix-037 (sección "No cambia").
> status: done
> created: 2026-09-20
> closed: 2026-09-20
>
> **Cierre.** `/app/explorer` a 375×812 (md): los 30 nombres pasan de
> Anton 16px a **Archivo 16px con peso 600 real**, y la vista queda con
> **0 textos en Anton bajo 28px**. Forzando Anton sobre esos mismos 30
> para comparar: 2 tomaban dos líneas, ahora son 3 — gana una línea
> "Apretón de manos con placa olímpica de pie". **0 nombres cortados**;
> la fila mide 48px con una línea y 66px con dos. Igual con el chip
> "Pecho" (30), con la búsqueda "press banca" (22) y con los dos juntos
> (15): todos en Archivo a 16px, 0 cortados. Estado vacío: mismo texto
> en `app-empty-state`, 0 textos bajo 13px. Consola sin errores nuevos
> (queda el aviso de CSP por `<meta>`, previo). Tests: 128 en verde.
> `ng build` sin avisos (chunk del Catálogo, 8.58 kB).
>
> **Confirmado al medir:** los `!important` ya no hacían falta — sin
> ellos el tamaño, el peso y el color quedan como se declaran.

## Síntoma

Medido en navegador (375×812, modo md) en `/app/explorer`:

| Texto | Tipografía | Tamaño |
|---|---|---|
| "Catálogo de Ejercicios" (título de vista) | Anton | 28px |
| Nombre de ejercicio × 30 | **Anton** | **16px** |

`--font-display-floor` es 28px: bajo ese tamaño Anton deja de ser
legible. Los 30 nombres visibles lo rompen por 12px. Es además la lista
que más se lee de la app — el Catálogo entero se recorre por el nombre.

El peso tampoco es real: la regla pide `font-weight: 600` y Anton solo
existe en 400. Con `font-synthesis-weight: none` en el `body` el
navegador no lo engorda, así que el 600 no hace nada.

## Causa raíz

`.exercise-name` fija tamaño, peso y color, pero **no** la tipografía,
así que hereda la regla global de `h1, h2` (Anton). Esa regla asume que
todo `h1`/`h2` renderiza por encima del piso; deja de ser cierto en
cuanto un componente le baja el tamaño.

El mismo elemento en el **selector de ejercicios** (spec 0009) ya está
resuelto: es `h3.exercise-name` con `--font-body` a 16px/600. El
Catálogo y el selector muestran la misma fila y hoy no se parecen.

## Cambio

**`src/app/features/explorer/explorer.page.ts`**

- `.exercise-name`: declara `font-family: var(--font-body)`. Mismo
  tamaño (16px), mismo peso pedido (600) — ahora sí existe.
- Se van los `!important` de esa regla: ya no hacen falta (fix-036
  reordenó las capas, los estilos del componente ganan sin ellos).
  Verificado midiendo.
- Se borra `.exercise-icon`: CSS muerto, ninguna plantilla usa esa clase
  (el ícono de la fila es `.exercise-chevron`).

No cambia ningún texto, ni el tamaño, ni la jerarquía de la lista.

## No cambia

- La regla global de `h1, h2`. Auditadas las vistas ya migradas:
  Entrenar, Perfil y el título del Catálogo usan Anton a 28px — justo en
  el piso. El único que lo rompe en esta rama es el Catálogo. (El título
  de sección de Historial, Anton a 16.8px, se arregla en la spec 0013,
  PR #18.)
- El `h2` como etiqueta: cambiarlo a `h3` saltearía un nivel en el
  esquema de la página. La tipografía se declara, el marcado queda.
- `.exercise-meta` conserva su `!important`: es otra regla y no forma
  parte de esta causa.

## Visto al medir, sin tocar

Una fila del Catálogo muestra sus datos sin traducir ("Chest · Barbell ·
Strength" en vez de "Pecho · Barra · Fuerza"). Es dato sembrado, no
estilo: se anota para su propio track.

## Riesgo

Anton es condensada y Archivo no: los nombres pasan a ocupar más ancho.
Hay que medir cuántos ganan una línea o pasan a cortarse, y si cambia el
alto de la fila.

## Test de Regresión

- Navegador a 375×812 en `/app/explorer`: 0 textos en Anton bajo 28px;
  los nombres en Archivo a 16px; ningún nombre cortado; contar los que
  ganan líneas.
- Con filtro activo (chip de grupo + búsqueda) y en el estado vacío.
- `npm run test:ci` + `ng build` (el Catálogo dentro de su presupuesto
  de estilos).
