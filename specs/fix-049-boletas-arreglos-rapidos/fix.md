> id: fix-049-boletas-arreglos-rapidos
> refs: revisión UX de Boletas con capturas (2026-10-09, staging 375×667, boleta real de Aroca);
> el dueño eligió "arreglos rápidos primero" y luego la pestaña Compras (A).
> status: done
> closed: 2026-10-09
> created: 2026-10-09

## Síntomas (capturas `ux-boletas/01`–`09`)
- **E1. El error de lectura no se ve.** "No pudimos leer la boleta" queda bajo el recuadro de la foto
  y la barra de pestañas: la pantalla queda igual, como si no hubiera pasado nada.
- **E2. "Cancelar" en una pestaña.** En Boletas no hay nada que cancelar antes de leer; después de
  leer, "Cancelar" lleva a Mi Lista en vez de descartar la boleta.
- **E3. "Es otra compra" queda bajo la barra** (el recuadro de la foto mide hasta 420 px).
- **E4. Lo que hay que decidir está al final.** Con la boleta de Aroca, "¿No lo compraste?" queda
  después de 30 tarjetas (8,7 pantallas); "Cerrar compra" está deshabilitado y no se ve por qué.
- **E5. "Pasar el pendiente a la próxima lista" se pregunta antes de leer la boleta.**
- **E6. "Guardar en catálogo" de a uno.** Con 30 productos nuevos nadie lo marca: el catálogo no
  aprende de las boletas.
- **E7. Texto repetido.** Sin nombre en el catálogo, la tarjeta muestra el mismo texto de boleta como
  título y subtítulo.
- **E8. Resumen confuso.** "$58.900 · Productos $58.900" repite el número cuando cuadra; con dos
  boletas, "$81.700 · Productos $58.900" no explica que la feria no trae detalle.
- **E9. "Cerrar compra" al final de 8 pantallas.**

## Causa raíz
La pantalla se diseñó para boletas cortas desde "Finalizar" y se reusó como pestaña (spec 0013) sin
adaptar entrada, orden ni acciones.

## Cambio
- E1: el error va arriba, antes de la foto y del resultado.
- E2: en la pestaña Boletas no hay "Cancelar" antes de leer; después de leer dice "Descartar" y vuelve
  a la foto (empieza de nuevo con la compra activa). Desde "Finalizar" sigue "Cancelar".
- E3: el recuadro de la foto mide como máximo 300 px.
- E4: orden: "¿Es este?", "¿No lo compraste?", "Coinciden", "No estaban en la lista", "Otros cargos".
- E5: "Pasar pendientes" va junto al cierre (abajo), no arriba.
- E6: "Guardar todos en el catálogo" / "Ninguno" en "No estaban en la lista".
- E7: el subtítulo (texto de la boleta) solo si es distinto del título.
- E8: el resumen dice "Cuadra con la boleta" si cuadra y no hay otros cargos; con varias boletas,
  una fila por boleta con su tienda y total ("sin detalle" en el voucher).
- E9: "Cerrar compra" (con su aviso) queda fijo abajo, sobre la barra de pestañas.

Fuera de este fix (spec de la pestaña Compras): juntar líneas repetidas en una tarjeta, editar solo al
tocar, flujo a pantalla completa, lectura en segundo plano.

## ACs afectados
- 0013 Q1/Q10 (nada queda bajo la barra): E3, E9.
- 0015 AC9 (aviso cuando falta elegir): ahora visible siempre (E4, E9).

## Test de regresión
- `purchase-close.facade.spec.ts`: `saveAllToCatalog` marca/desmarca solo lo nuevo; `receiptSummaries`
  da tienda, total y "sin detalle" por boleta.
- `purchase-close.page.spec.ts`: en la pestaña no hay "Cancelar" y "Descartar" reinicia el cierre;
  desde Finalizar, "Cancelar" vuelve a Mi Lista.
- Staging 375×667 con la boleta de Aroca: error visible arriba; "¿No lo compraste?" en la primera
  pantalla después del resumen; "Cerrar compra" visible sin hacer scroll.

## Verificación (2026-10-09)
- `npm run test:ci`: 626 pasan (4 tests nuevos fallaban antes: `receiptSummaries`, `saveAllToCatalog`,
  `inTab`, `discard`). `npm run lint:arch` y `ng build` limpios.
- Staging 375×667, cuenta `test5`, boleta de Aroca (OCR simulado con el caso 14 del eval):
  - Entrada a la pestaña: sin "Cancelar" ni "Pasar pendientes"; "Es otra compra" visible (y 500).
  - Error de lectura: tarjeta roja arriba, antes de la foto.
  - Resultado: resumen "Comercializadora Aroca $58.900 · Cuadra con la boleta"; "¿No lo compraste?"
    (Palmitos, Pan) en la primera pantalla; "Descartar" arriba a la derecha.
  - Pie fijo (84 px) termina en y 575, sobre la barra (579); con dos boletas el resumen muestra
    "Comercializadora Aroca $58.900" y "El Nene Jr SPA · sin detalle · $22.800".
  - Desde "Finalizar" (`/app/close`, sin barra) el pie queda pegado al borde (583–667).
- Encontrado fuera de alcance: `--brand-gold` vale `#3b82f6` (azul) y es el color de aviso
  (`--state-warning`) en toda la app → plan de coherencia.
