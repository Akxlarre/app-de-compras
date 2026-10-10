> spec: 0021-nota-y-detalle-del-item
> status: done
> created: 2026-10-10

# Plan
Sin cambios de BD: `list_items.notes` ya existe (esquema base de `shop`).

## T1. Datos — AC1, AC3
- `ItemPatch` incluye `notes` (texto o null). `ListItemsRepository.update`, la cola sin conexión
  (`kind: 'patch'`) y `ShoppingListFacade.editItem` ya escriben cualquier campo del patch; se agrega
  un test para la nota.

## T2. Detalle del ítem — AC1, AC5
- `ItemDetailSheetComponent`:
  - campo "Nota" (máx. 80, con contador); vacía se guarda como null;
  - "Ver ficha del producto", que emite `openProduct` con el id del producto;
  - `ItemDetail` suma `notes` y `productId`.
- Test primero en `item-detail-sheet.component.spec.ts`.

## T3. Mi Lista — AC2, AC4, AC5
- Fila: la nota debajo del nombre, en cursiva, una línea (`truncate`), en las dos vistas.
- Pulsación larga (500 ms, sin moverse más de 10 px) abre el detalle y anula el toque que viene
  después. El toque corto sigue marcando.
- `openProduct(id)` navega a `/app/products/:id` y cierra el detalle.
- Test en `active-list.page.spec.ts`.

## T4. Verificación — AC6, AC7
- `test:ci`, `lint:arch`, `ng build`; staging 375×667 con `test5`; índices y `RECORRIDO-UX.md`.
