# Spec: Catálogo de Ejercicios como Tier 2

> id: 0004-catalogo-tier-trabajo
> refs: recorrido de flujos con la rúbrica del Manual de Campo.
>   Depende de 0001 (tokens y tiers) y 0003 (movimiento).
> status: done
> created: 2026-09-15
> closed: 2026-09-15
>
> **Cierre.** Verificado en navegador sobre la vista real:
>
> - **AC-01**: la raíz lleva `.tier-trabajo`, y `ngAfterViewInit` llama a
>   `animateTierEnter`.
> - **AC-02**: 24 objetivos táctiles visibles, ninguno bajo 44px.
> - **AC-03**: ningún texto visible bajo 13px; el placeholder del buscador
>   mide 16px.
> - **AC-04**: ver la nota bajo el criterio.
> - **AC-05**: las filas no llevan el círculo; su único icono es el
>   chevron.
> - **AC-06**: buscar algo sin resultados muestra "Ningún ejercicio
>   coincide" con "Limpiar filtros"; el filtro "Pecho" deja solo filas de
>   pecho. Se corrigió un bug del buscador (ver la nota bajo el criterio).
> - **AC-07**: 97 tests en verde. El build compila; su único aviso es el
>   presupuesto de estilos de `workouts.page.ts`, que no es de esta vista.
>
> **Sin provocar en navegador:** el estado "catálogo vacío" (requiere
> vaciar la base) y el de carga (dura lo que tarda la consulta). Los dos
> existen en la plantilla, y lo que separa "sin resultados" de "catálogo
> vacío" es `hayFiltroActivo`, cubierto por test.

## Contexto

Segunda vista migrada. Es **Tier 2 — Trabajo**: el usuario está
buscando un ejercicio, con atención parcial. No es un momento de
ceremonia y no debe competir con la tarea.

Medido en navegador antes de tocar nada:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 5 — Ergonomía | **11 objetivos bajo 44px**: los 10 chips de filtro miden **30px** y el buscador 42px |
| 4 — Legibilidad | Tres tamaños por debajo del piso de 13px: **10.88px**, 12.8px, 12px |
| 7 — Sistema | `#eab308` hardcodeado en iconos, fuera de tokens |
| 6 — Intensidad | La vista **no declara tier**: sin presupuesto gráfico ni entrada animada |

Los chips de filtro son el control más usado de la vista y son los
más chicos: 30px de alto para un dedo, en una fila horizontal donde
además están pegados entre sí.

Observado también: las filas de ejercicio llevan **todas el mismo
círculo idéntico** como icono. Doce elementos decorativos repetidos que
no distinguen nada — exactamente lo que la regla de densidad dice que
debe perder el tratamiento gráfico.

## Acceptance Criteria

- **AC-01** — La raíz declara `.tier-trabajo` y recibe la entrada
  animada de su tier.
- **AC-02** — Todo objetivo táctil de la vista mide ≥ 44px
  (`--target-min`). Incluye los chips de filtro y el buscador.
- **AC-03** — Ningún texto por debajo de `--text-floor` (13px).
- **AC-04** — Cero hex y cero `rgba()` hardcodeados **en la superficie
  de lista** (encabezado, buscador, chips, filas, estados): todo sale
  de tokens.

> **El drawer de detalle queda afuera de AC-04.** `explorer.page.ts`
> aloja también el panel que se abre al tocar una fila: ~130 líneas con
> su propio sistema de color hardcodeado. Es una superficie distinta,
> bajo demanda, y merece el mismo trato que el modal "Detalle de
> Sesión" en 0002: su propio slice, no una limpieza apurada al final de
> este. **No se da por cumplido sobre el drawer.**
>
> **AC-04 cumplido (2026-09-15).** Antes de cerrar se detectaron seis
> valores hardcodeados en la superficie de lista. El track se suspendió
> para priorizar fix-026 (pérdida de datos) y al retomarlo pasaron a
> tokens:
>
> | Selector | Antes | Después |
> |---|---|---|
> | `.explorer-content` | `var(--ion-background-color, #121212)` | Regla eliminada: la global de `ion-content` ya pinta la tinta (fix-028) |
> | `.custom-searchbar` | `var(--text-muted, #a1a1aa)` | `var(--text-muted)` |
> | `.exercise-item`, texto | `var(--text-primary, #fff)` | `var(--text-primary)` |
> | `.exercise-item`, borde | `rgba(255, 255, 255, 0.06)` | `var(--border-subtle)` |
> | `.exercise-item:active` | `rgba(255, 255, 255, 0.05)` | `var(--bg-surface)` |
> | `.empty-state` | `var(--text-muted, #a1a1aa)` | `var(--text-muted)` |
>
> Verificado en navegador: el fondo es `rgb(10, 6, 8)`; el icono del
> buscador y el texto de las filas conservan su color; el borde de fila
> mantiene el mismo alfa, ahora sobre hueso en vez de blanco; y la regla
> `:active` compilada usa `var(--bg-surface)`. En el archivo, todo hex o
> `rgba()` que queda está dentro del drawer, excluido arriba.
>
> **Corrección de lo que se había anotado.** Se había dicho que los
> respaldos `var(--x, #hex)` nunca se usaban porque el token siempre
> existe. Para el fondo era cierto a medias: `--ion-background-color`
> existía, pero valía `#121212`, el gris de la paleta de Ionic, que nunca
> se había mapeado a Eclipse. Se corrigió para toda la app en fix-028.
- **AC-05** — Los iconos repetidos de la lista pierden el tratamiento
  decorativo: o distinguen algo real, o no están.
- **AC-06** — La vista tiene estado vacío y estado de carga
  alcanzables, y "sin resultados de búsqueda" se distingue de "todavía
  no hay ejercicios".

> **Bug encontrado al verificar (2026-09-15).** Después de "Limpiar
> filtros" la lista volvía completa, pero el buscador seguía mostrando lo
> escrito: `ion-searchbar` no estaba enlazado al estado. Ahora se enlaza
> con `[value]`, y `onSearch` guarda el texto tal como se escribe. Antes
> lo pasaba a minúsculas y lo recortaba; con el enlace, eso le borraría
> al usuario el espacio mientras escribe. `ExerciseFacade` ya normaliza
> al filtrar.
>
> Verificado en navegador escribiendo con el teclado: "press banca "
> conserva el espacio final y devuelve 22 filas; después de "Limpiar
> filtros" el buscador queda vacío y vuelven las 30 filas. Queda cubierto
> por `explorer.page.spec.ts`, 3 tests; la vista no tenía spec.
- **AC-07** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El modal `exercise-selector`, que es otra superficie con su propio
  uso (se abre desde la sesión activa). Va en su track.
- La calidad de los datos sembrados (varias filas se llaman igual).
  Es un problema de seed, no de vista.

## Test de Regresión

`npm run test:ci` + `ng build`, y verificación en navegador de: buscar
un texto y ver resultados, filtrar por grupo muscular, y volver a medir
objetivos táctiles y tamaños de fuente.
