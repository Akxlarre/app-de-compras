> id: fix-048-cerrar-tapado-y-buscador
> refs: `docs/RECORRIDO-UX.md` B1 y L1; conversación 2026-10-01 ("si" al arreglo rápido).
> status: done
> closed: 2026-10-01
> created: 2026-10-01

## Síntomas
- **B1.** En la pestaña Boletas (`/app/receipt`), "Cerrar compra" queda debajo de la barra de
  pestañas en un teléfono de 375×667: el toque cae en la pestaña Catálogo y no se cierra la compra.
  "Es otra compra (no de esta lista)" queda cortado bajo la barra en la pantalla inicial.
- **L1.** En el buscador, después de "Crear y añadir", el campo se vacía cuando responde el
  servidor (~1–2 s). Si ya se empezó a escribir el siguiente producto, se borra.

## Causa raíz
- **B1.** `purchase-close.page.html` reserva solo `pb-8` al final. En `/app/close` la barra se
  oculta (spec 0013), pero la misma página en `/app/receipt` es una pestaña y la barra flotante
  (`--chrome-bottom`) tapa lo último.
- **L1.** `ProductSearchComponent.createNewProduct()` vacía `searchTerm` y llama `facade.clear()`
  después de `await createProduct()` y `await addItem()`, sin mirar si el campo cambió mientras tanto.

## Cambio
- **B1.** El `<main>` del cierre usa `pb-chrome` (la regla única de espacio para la barra).
- **L1.** El campo se vacía al tocar "Crear y añadir" (antes de ir al servidor). Al terminar, no se
  toca lo que se haya escrito mientras tanto. Si la creación falla y el campo sigue vacío, vuelve el
  texto. Un segundo toque mientras se crea no hace nada (el campo ya está vacío).

## ACs afectados
- 0013 (Q1/Q10: lo último queda sobre la barra) — se extiende a la pestaña Boletas.
- 0013 (Q9: "Crear y añadir" deja el buscador listo para el siguiente) — se cumple también al
  escribir rápido.

## Test de regresión
- `purchase-close.page.spec.ts`: el contenido reserva el espacio de la barra (`pb-chrome`).
- `product-search.component.spec.ts`: el campo se vacía al tocar; lo escrito mientras se crea se
  conserva y no se limpian sus resultados; si falla con el campo vacío, vuelve el texto; si falla
  con algo nuevo escrito, no lo pisa.
- Staging (375×667): en `/app/receipt` con boleta, el punto central de "Cerrar compra" ya no cae
  en la barra; en el buscador, escribir durante la creación conserva el texto.

## Verificación (2026-10-01)
- `npm run test:ci`: 580 pasan (5 tests nuevos en el buscador, 1 en el cierre; 4 fallaban
  antes del cambio: 3 del buscador y el del cierre). `npm run lint:arch` sin errores.
- Staging, 375×667, cuenta `test5`:
  - `/app/receipt` inicial: "Es otra compra" en y 542–562, sobre la barra (579–651).
  - Con la boleta leída: el punto central de "Cerrar compra" cae en el botón
    (`cerrar-compra-con-boleta`); antes caía en la pestaña Catálogo.
  - Buscador: "Crear y añadir" con "Galletas 5551" deja el campo vacío al tocar; se escribió
    "Mante" mientras respondía el servidor y quedó "Mante". Galletas quedó en la lista.
