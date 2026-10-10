> id: 0021-nota-y-detalle-del-item
> refs: `docs/RECORRIDO-UX.md` §1 Mi Lista (F1, F2). Sigue a la spec 0019, que creó la hoja de
> detalle del ítem.
> status: draft (falta que el dueño confirme D1–D4)
> created: 2026-10-10

## Problema
1. **Sin nota por ítem** (F2). En una lista compartida, quien compra no es quien anotó: "Leche" no
   dice "sin lactosa", ni "Detergente" dice "el de 3 L". Hoy hay que avisarlo por WhatsApp.
2. **El detalle del ítem está a medias** (F1). Desde la 0019 se cambian unidad, cantidad y precio,
   pero no se puede escribir una nota ni llegar a la ficha del producto para corregir su nombre o su
   pasillo. Además, el detalle solo se abre tocando la cantidad.

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. Nota por ítem**, en el detalle: texto libre de hasta 80 caracteres, opcional. Vale solo para
  ese ítem de esa lista; no pasa al producto. Usa `list_items.notes`, que ya existe en la BD (no hay
  migración).
- **D2. La nota se ve en la fila**, debajo del nombre, en cursiva y en una sola línea (cortada con
  "…" si es larga). Quien marca la ve sin abrir nada.
- **D3. Abrir el detalle**: además de tocar la cantidad, con una pulsación larga en la fila. El
  toque corto sigue marcando, como hoy.
- **D4. Nombre y pasillo, en la ficha**: el detalle tiene "Ver ficha del producto". El nombre no se
  edita desde la lista porque cambia el producto en todas las listas y compras; eso se hace en la
  ficha (spec 0017).

## Fuera de alcance
- Notas en plantillas y en "Repetir última compra": la nota es de esa compra.
- Quién agregó cada ítem (F6): necesita una columna nueva y va en otra spec.

## Criterios de aceptación
- [ ] AC1. En el detalle del ítem se escribe una nota de hasta 80 caracteres y se guarda con
  "Listo". Vacía, se borra.
- [ ] AC2. La nota se ve en la fila de Mi Lista, en las dos vistas (por pasillo y como se agregó).
- [ ] AC3. Sin conexión, la nota se guarda en la cola y se envía al volver, como la cantidad.
- [ ] AC4. Una pulsación larga en la fila abre el detalle; el toque corto sigue marcando.
- [ ] AC5. "Ver ficha del producto" abre la ficha del producto del ítem.
- [ ] AC6. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [ ] AC7. Verificado en staging a 375×667 con `test5`: escribir una nota, verla en la fila,
  borrarla, y abrir la ficha desde el detalle.

## Lo que viene después (orden propuesto, una spec por línea)
| Spec | Qué | Cubre | BD |
|---|---|---|---|
| 0022 | **Catálogo con orden y filtros**: más comprados, comprados hace tiempo, sin precio, por pasillo. | H5 | No |
| 0023 | **Compras útiles**: "Agregar a la lista" desde cualquier compra pasada, buscar en el historial y quién cerró la compra. | R8, R10, R9 | R9 sí (quién cerró) |
| 0024 | **Lista compartida**: quién agregó cada ítem y compartir los pendientes por WhatsApp como texto. | F6, X1 | F6 sí (`added_by`) |
| 0025 | **En el súper**: modo supermercado (pantalla encendida, filas grandes, solo pendientes) y presupuesto de la compra ("vas en $X de $Y"). | X3, X2 | X2 sí (tope por lista) |
| 0026 | **Gasto en familia**: exportar el mes a CSV y dividir el gasto entre miembros. | Y3, Y5 | Y5 sí |
