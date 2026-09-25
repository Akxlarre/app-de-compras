# Spec: Detalle de ejercicio y drawer compartido

> id: 0007-detalle-ejercicio
> refs: pendientes del rediseño Eclipse. El drawer del Catálogo quedó
>   fuera de 0004; el título del drawer, fuera de 0006.
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Medido en navegador con el mismo script de la línea base:
>
> - **AC-01**: título del drawer en Anton a 28px, en el Catálogo y en el
>   Coach; cerrar mide 44×44. Con el nombre más largo encontrado (78
>   caracteres) el título ocupa 3 líneas parejas, y cerrar sigue dentro de
>   pantalla.
> - **AC-02**: el Catálogo y el selector renderizan `app-exercise-detail`.
>   Las 4 funciones viven en `exercise-detail.utils.ts` con 10 tests. Del
>   `getIconName` del selector se tomó la versión más amplia (reconocía
>   hamstring, calves y deltoid).
> - **AC-03**: ningún texto del detalle bajo 13px.
> - **AC-04**: cero colores prohibidos renderizados (morado, azul, verde,
>   negro o blanco puros). `explorer.page.ts` queda sin ningún hex ni
>   `rgba()` en todo el archivo.
> - **AC-05**: los 5 pasos son neutros; sin verde.
> - **AC-06**: "Seleccionar Ejercicio" mide 44px, tinta sobre ember
>   (7.0:1), sin sombra. Se verificó abriendo el detalle desde el
>   selector, sin tocar filas: la sesión del usuario siguió con 0
>   ejercicios.
> - **AC-07**: 112 tests en verde; el build compila.
>
> **Sin verificar en navegador:** el aviso de "sin traducir"; no se
> encontró un ejercicio sin traducción a mano. Su estilo usa los tokens
> de aviso y la decisión la cubren los tests.
>
> **Queda pendiente, fuera de alcance:** la **lista** del selector de
> ejercicios conserva 45 colores escritos a mano, incluido un arcoíris
> de colores por músculo en `getIconStyle`. Es otra superficie.

## Contexto

El detalle de un ejercicio se abre desde dos lugares: al tocar una fila
del Catálogo, y desde el ícono de info del selector de ejercicios (en la
sesión activa). Las dos versiones son **copias casi idénticas**, 249 y
258 líneas, que solo difieren en el botón "Seleccionar Ejercicio" del
selector. También están duplicados los cuatro métodos que usan.

Ambas viven dentro de `app-drawer`, el panel compartido que también usa
el Coach.

Medido en navegador antes de tocar nada (2026-09-18), detalle de "3/4
abdominales" en el Catálogo:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 4 — Legibilidad | Título del drawer en **Anton a 24px** (piso 28). "Instrucciones paso a paso" a **11px**; número y etiqueta de cada paso a **10px** |
| 5 — Ergonomía | Cerrar el drawer mide **32×32px** |
| 7 — Sistema | La tarjeta "Categoría" es **morada**, un color que Eclipse no tiene. El consejo de técnica usa `--color-primary-rgb`, que no existe, y cae a **azul**. Los números de paso van en **negro puro**. Las fotos se apoyan sobre **blanco** |
| 1 — Semántica | El último paso ("Finalización") va en **verde**, y en Eclipse el verde significa "logrado" |
| 7 — Sistema | El detalle está duplicado en dos componentes |

## Acceptance Criteria

- **AC-01** — El título del drawer no baja de `--font-display-floor`
  (28px) y su botón de cerrar mide ≥ 44px. Vale para todo drawer.
- **AC-02** — El detalle de ejercicio existe **una sola vez**: un
  componente que usan el Catálogo y el selector. Su lógica vive en
  funciones puras con tests.
- **AC-03** — Ningún texto del detalle baja de 13px.
- **AC-04** — Cero hex, `rgba()` y colores de paleta de Tailwind
  (`bg-white`) en el detalle, y ninguna variable inexistente.
- **AC-05** — El verde no aparece: los pasos son neutros y el orden lo
  dan los números. El aviso de "sin traducir" usa el oro semántico como
  contorno.
- **AC-06** — "Seleccionar Ejercicio" en el selector: tinta sobre ember,
  ≥ 44px, sin la sombra azul.
- **AC-07** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El contenido de las instrucciones y su traducción.
- El texto de la vista: solo diseño visual.
- La lista del selector de ejercicios (otra superficie).

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: abrir el detalle desde el
Catálogo y medir tamaños, objetivos y colores. **No** tocar filas del
selector dentro de la sesión activa: agregan ejercicios a la sesión real
del usuario.
