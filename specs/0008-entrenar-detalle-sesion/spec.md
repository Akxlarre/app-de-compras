# Spec: Detalle de sesión unificado y cierre de colores de Entrenar

> id: 0008-entrenar-detalle-sesion
> refs: pendientes del rediseño Eclipse. El modal "Detalle de Sesión" y
>   AC-05b quedaron fuera de 0002.
> status: done
> created: 2026-09-18

## Contexto

El detalle de una sesión pasada se abre desde el historial de Entrenar y
desde la página Historial. Las dos son **copias idénticas** de ~165
líneas, escritas enteras con estilos en línea.

Medido en navegador antes de tocar nada (2026-09-18), en Entrenar:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 4 — Legibilidad | En el detalle, "Fecha", "Duración", "Volumen (kg)" y "Series Totales" miden **12.8px**. Las insignias de tipo de serie, **10.4px** |
| 7 — Sistema | Insignias de serie en **amarillo** (`#eab308`) y **morado** (`#a855f7`), colores que Eclipse no tiene, y en rojo de `rgba` a mano |
| 1 — Semántica | El rojo de "al fallo" lee como error, y llegar al fallo es una decisión de entrenamiento, no una falla |
| 5 — Ergonomía | El botón del estado vacío ("Crear rutina") mide **14px** de alto. Es el `app-empty-state` compartido: afecta también a "Limpiar filtros" en el Catálogo |
| 7 — Sistema | Entrenar conserva **19 `rgba()`** a mano en tarjetas de rutina, botones de editar y borrar, tarjetas del historial y estado de carga |

Las tarjetas de rutina no se pudieron ver en pantalla: el usuario tiene
0 rutinas. Se revisan en el código.

## Acceptance Criteria

- **AC-01** — El detalle de sesión existe **una sola vez**: un
  componente que usan Entrenar e Historial.
- **AC-02** — Ningún texto del detalle baja de 13px. Los números van en
  `--font-data` con cifras tabulares.
- **AC-03** — Las insignias de tipo de serie son neutras, sin amarillo,
  morado ni rojo: la letra dice el tipo y un `aria-label` lo nombra
  completo.
- **AC-04** — El botón de `app-empty-state` mide ≥ 44px.
- **AC-05** — Cero hex y cero `rgba()` escritos a mano en
  `workouts.page.ts` y en el detalle.
- **AC-06** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El resto de la página Historial (su lista y su encabezado): es otra
  vista.
- El texto: solo diseño visual. Las letras W/D/F se mantienen.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: abrir el detalle desde
Entrenar y desde Historial, medir tamaños y colores; medir el botón del
estado vacío.
