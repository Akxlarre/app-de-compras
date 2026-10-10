> id: 0024-lista-compartida
> refs: `docs/RECORRIDO-UX.md` §1 Mi Lista (F6, X1). Orden acordado en la spec 0021.
> status: done (2026-10-10; decisiones tomadas por Claude a pedido del dueño: "continúa hasta
> terminar todas las spec")
> created: 2026-10-10

## Problema
- En una lista de familia no se sabe quién pidió cada cosa, y es a esa persona a quien hay que
  preguntarle "¿qué detergente?". Ya se muestra quién marcó, pero no quién agregó.
- Si quien va al súper no usa la app, no hay cómo pasarle la lista.

## Decisiones
- **D1. Quién agregó (F6)**: la base guarda quién agregó cada ítem (`list_items.added_by`, lo fija
  la base al crearlo; si el producto ya estaba y se suma, queda quien lo agregó primero).
  - En la fila de un pendiente: "Pedido por Ana", si la familia tiene más de un miembro y no lo
    agregaste tú. En un marcado sigue apareciendo quién lo marcó, como hoy.
  - En el detalle del ítem: "Lo agregó Ana" (o "Lo agregaste tú").
  - Los ítems agregados antes de este cambio no lo muestran.
- **D2. Compartir (X1)**: "Compartir" en las acciones de la lista arma un texto con los pendientes,
  por pasillo, y abre WhatsApp con ese texto (en el teléfono, o WhatsApp Web en el navegador).
  - Formato, para que se lea bien en WhatsApp:
    ```
    *Lista de compras*
    _Frutas y verduras_
    • Palta × 3
    • Plátano 1,5 kg (maduros)
    _Lácteos y huevos_
    • Leche × 2
    ```
  - La cantidad va solo si no es 1 un; la nota, entre paréntesis.
  - Sin pendientes, el botón no aparece.
  - Si no se pudo abrir WhatsApp, se copia el texto y se avisa.

## Fuera de alcance
- Filtrar la lista por quién agregó.
- Recibir de vuelta lo que marque alguien sin la app.

## Criterios de aceptación
- [x] AC1. Agregar un ítem guarda quién lo agregó; la fila de un pendiente agregado por otro miembro
  dice "Pedido por <nombre>", y el detalle dice quién lo agregó.
- [x] AC2. "Compartir" abre WhatsApp con los pendientes por pasillo en el formato de D2.
- [x] AC3. Migración en plataforma-db con pgTAP (compartida con 0023 y 0025).
- [x] AC4. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC5. Verificado en staging a 375×667 con `test5`.

## Cierre (2026-10-10)
- AC3: plataforma-db #21, mergeada y aplicada en staging (pgTAP `shop_who_and_budget`).
- AC4: 844 tests, `lint:arch` sin errores y `ng build` sin avisos.
- AC5, en staging a 375×667 con la familia `test3` + `test4` (`test5` está sola en su familia y no
  muestra nombres, como dice D1):
  - `test4` agregó Yogurt × 2; `test3` ve "Pedido por test4" en la fila, y el detalle dice "Lo
    agregó test4"; Arroz (agregado antes del cambio) no dice nada;
  - "Compartir" abrió `wa.me` con `*Lista de compras*` / `_Lácteos y huevos_` / `• Yogurt × 2` /
    `_Despensa_` / `• Arroz`.
- El Yogurt de prueba se cerró y la compra se borró; la lista de `test3` quedó con lo que tenía.
- En el teléfono `wa.me` lo abre Capacitor fuera de la app; no se probó en un Android real.
