# Spec: Historial en Eclipse, y las etiquetas de ejercicio de Entrenar

> id: 0013-historial
> refs: pendientes del rediseño Eclipse. 0008 unificó el detalle de
>   sesión y dejó fuera "el resto de la página Historial (su lista y su
>   encabezado)". Apilada sobre fix-037 (tipografía de Ionic).
> status: done
> created: 2026-09-19

## Contexto

"Historial Completo" lista todas las sesiones con la misma tarjeta que
"Historial Reciente" de Entrenar (fecha, duración, volumen, series y
ejercicios). Entrenar ya se migró (0002 y 0008); Historial no. Es
**Tier 2 — Trabajo**: revisar.

Medido en navegador antes de tocar nada (2026-09-19, 375×812), con
cuatro sesiones de ejemplo cargadas **solo en memoria** (el usuario no
tiene sesiones):

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 4 — Legibilidad | **13 textos bajo 13px**: contador 12px; unidades ("kg", "series") y etiquetas de ejercicio **11.5px** |
| 4 — Legibilidad | "Todos tus entrenamientos" en **Anton a 16.8px**, debajo de su piso de 28px |
| 7 — Sistema | Etiquetas de ejercicio en el **azul** de la marca anterior (`#93c5fd` sobre azul al 8%). Cifras sin `--font-data` |
| 6 — Intensidad | La vista no declara tier |
| 7 — Sistema | Tarjeta, contador, carga y vacío con estilos propios, distintos de los de Entrenar para la misma información |

Y en Entrenar, **un defecto**: las etiquetas de ejercicio de "Historial
Reciente" (`.card-exercises`, `.exercise-chip`) nunca tuvieron estilos.
Con más de un ejercicio, los nombres salen pegados: "Press de
bancaRemo con barraSentadillaCurl de bíceps". No se había visto porque
la cuenta no tiene sesiones.

## Acceptance Criteria

- **AC-01** — Historial declara `.tier-trabajo`. Ningún texto baja de
  13px y nada en Anton por debajo de su piso.
- **AC-02** — La tarjeta de Historial se ve como la de Entrenar:
  superficie, bordes, cifras en `--font-data` tabulares, unidades a
  13px. Su contenido no cambia (solo diseño visual).
- **AC-03** — Las etiquetas de ejercicio son neutras y separadas, en
  las dos páginas: sin azul, a 13px, y en Entrenar dejan de salir
  pegadas.
- **AC-04** — Cero hex y cero `rgba()` escritos a mano en
  `history.page.ts`. El estado vacío usa `app-empty-state`.
- **AC-05** — `npm run test:ci` pasa y `ng build` compila sin avisos.

## Fuera de alcance

- El texto: "Todos tus entrenamientos", "kg", "series" y el resto se
  mantienen. Por eso la tarjeta no se unifica con la de Entrenar en un
  componente: sus textos difieren ("Volumen", "Ejercicios").
- El detalle de sesión (0008) y la animación de entrada de la lista.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: Historial y Entrenar con
sesiones de ejemplo en memoria, medir tamaños, fuentes y colores, y
abrir el detalle desde una tarjeta. Historial sin sesiones: estado
vacío.
