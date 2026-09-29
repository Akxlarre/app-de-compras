> id: 0008-boleta-cierra-compra
> refs: Punto 4 del plan (boletas/OCR). Conversación de diseño 2026-09-28. Depende de 0007.
> status: in-progress
> created: 2026-09-28

## Problema
Hoy la boleta es un proceso aparte de la compra:
1. Cada línea se busca por nombre **exacto**. Si no existe, se **crea un producto**: "LECHE ENT
   SOPROLE 1L" termina duplicando a "Leche" y el catálogo se llena con los nombres del súper.
2. No toca la compra. El historial (0005) congela `unit_price` con el `last_price` del momento en que
   se finaliza, y como la boleta se escanea después, no lo corrige.
3. No se guarda la boleta (la tabla `receipts` no se usa). El gasto del mes es solo una estimación.

## Decisiones (conversación 2026-09-28)
- **Toda boleta pertenece a una compra.** La boleta es el cierre de la compra y la corrige con la
  realidad.
- **Se guarda la foto** en un bucket privado por familia.
- **La boleta manda en precio y cantidad**, pero no desmarca nada sin preguntar.
- Al catálogo solo entra lo que el usuario marca ("guardar en catálogo").
- **Sin boleta también se cierra con datos reales** (conversación 2026-09-29): feria, almacén, boleta
  perdida o compra online. Al finalizar se ofrece "Sin boleta": el total pagado (opcional) y los
  precios de lo marcado, precargados con el último precio. Cada compra dice de dónde sale su total:
  `receipt`, `manual` o `estimated`.

## Solución
### Flujo
```
Lista → marcar en el súper → Finalizar → ¿Cómo cierras la compra?
   ├─ Escanear boleta → conciliación → compra cerrada (total_source = receipt)
   ├─ Sin boleta      → ¿cuánto pagaste? + precios de lo marcado → cerrada (total_source = manual)
   └─ Ahora no        → como hoy, con precios estimados              (total_source = estimated)
```
La boleta, o el total a mano, se puede agregar después desde el Historial (0009).

### Sin boleta
- Un campo **"¿Cuánto pagaste?"**, opcional. Vacío = no se sabe; la compra queda `estimated`.
- La lista de lo marcado con el **último precio precargado** (`products.last_price`). Solo se editan
  los que cambiaron.
- Al confirmar (RPC `shop.close_list_manual`, dentro de la misma transacción que `complete_list`):
  - fija el `unit_price` de cada ítem marcado con el precio confirmado;
  - actualiza `products.last_price` con los precios que cambiaron;
  - guarda `total_paid` y `total_source = 'manual'` en la compra; si no hay total, queda
    `estimated`.

### Conciliación (función pura `reconcileReceipt(lines, listItems, catalog, aliases)`)
Cada línea `product` de la boleta se cruza, en este orden, contra:
1. **Alias** de la familia (el `raw_text` ya confirmado antes). Coincidencia segura.
2. **Ítems marcados de la compra.** Primero el `matched_list_item` del OCR, después por similitud.
3. **Catálogo de la familia**, por similitud.
4. Si no coincide con nada: **no estaba en la lista**.

La pantalla muestra tres grupos:
- **Coinciden:** confirmados, se pueden corregir.
- **¿Es este?:** el usuario elige entre candidatos o marca "otro".
- **No estaban en la lista:** suman al gasto de la compra y tienen un check opcional "guardar en
  catálogo".

Además:
- Lo marcado en la lista que no aparece en la boleta muestra "¿no lo compraste?", con la opción de
  desmarcarlo (pasa a pendiente).
- Las líneas dudosas de `validateReceipt` (0007) se destacan para revisar.

### Al confirmar la boleta (RPC transaccional `shop.apply_receipt`)
- Crea la fila en `receipts` con `list_id`, `total_amount`, `purchased_at`, `store`, `image_url` y
  `status = 'processed'`.
- Para cada ítem conciliado, fija en `list_items` el `unit_price` y la `quantity` reales.
- Actualiza `products.last_price` (y `last_purchased_at`).
- Guarda en `product_aliases` cada coincidencia **confirmada por el usuario**, con el `raw_text`
  apuntando al producto.
- Agrega a la compra los extras "no estaban en la lista", creando el producto solo si el usuario
  marcó "guardar en catálogo".
- Fija en la compra `total_paid = total de la boleta` y `total_source = 'receipt'`.

### Base de datos (plataforma-db)
- `receipts`: agrega `list_id` (FK a `shopping_lists`, UNIQUE: una boleta por compra), `store`,
  `purchased_at`, `ocr_result jsonb` (la lectura tal cual, con `_model`) y `ocr_check jsonb` (lo que
  dio `validateReceipt` y las correcciones del usuario). Sirve para seguir midiendo el OCR con boletas
  reales (AC5 de 0007): las que no cuadraron o se corrigieron pasan a ser casos del set.
- Tabla nueva `product_aliases (family_id, raw_text normalizado, product_id)`, con PK
  `(family_id, raw_text)` y RLS por familia.
- `list_items.product_id` pasa a ser nullable para los extras que no se guardan en el catálogo. Queda
  a evaluar si en vez de eso se usa un `name` libre.
- `shopping_lists`: agrega `total_paid integer` (null = no se sabe) y `total_source text`
  (`receipt` | `manual` | `estimated`, default `estimated`). Las compras ya completadas quedan
  `estimated`.
- Bucket privado `receipts`, con la ruta `<family_id>/<receipt_id>.jpg` y policies por familia.
- pgTAP: RLS de las tablas nuevas, `apply_receipt` y `close_list_manual` atómicos y aislamiento
  entre familias.

## Fuera de alcance
- Agregar la boleta desde el Historial, la compra no planificada y el gasto real en el Historial:
  spec 0009.

## Acceptance Criteria
- [x] AC1: Migración + pgTAP: `receipts.list_id` único, `product_aliases` con RLS, bucket privado
  por familia y `apply_receipt` transaccional. CI de plataforma-db en verde.
  - Evidencia: plataforma-db #9 (mergeado, CI verde) y #10 (productos conocidos y "no lo
    compraste"); `shop_receipts.test.sql` 31/31 en local.
- [x] AC2: `reconcileReceipt` con tests (`reconcile.utils.spec.ts`, 14):
  - un alias gana siempre;
  - la lista tiene prioridad sobre el catálogo;
  - una línea sin coincidencia queda como "no estaba en la lista";
  - los ítems marcados sin línea en la boleta quedan como "¿no lo compraste?".
- [x] AC3: Al finalizar se ofrecen tres caminos: escanear, sin boleta y ahora no. "Ahora no" mantiene
  el comportamiento actual (`total_source = estimated`).
  - Evidencia: `active-list.page.spec.ts` (tres caminos, pendientes, cancelar).
- [x] AC10: Sin boleta (`purchase-close.facade.spec.ts` + pgTAP `close_list_manual`):
  - los precios de lo marcado vienen precargados y se pueden editar;
  - el total es opcional;
  - la compra queda con `unit_price` reales y `total_paid`/`total_source = manual`, o `estimated` si
    no se ingresó total;
  - `last_price` se actualiza solo con los precios que cambiaron.
- [x] AC4: La pantalla de conciliación muestra los tres grupos y las líneas dudosas, y permite
  corregir.
  - Evidencia: `purchase-close.page` (grupos, "No es este", candidatos + "Otro", precio y cantidad
    editables, borde de advertencia en dudosas); `purchase-close.page.spec.ts`.
- [x] AC5: Al confirmar:
  - la compra queda con los precios y cantidades reales y con su total;
  - los alias quedan guardados;
  - el catálogo no crece con lo que no se marcó "guardar en catálogo".
  - Evidencia: `buildApplyReceipt` (`purchase-close.utils.spec.ts`, 18) + pgTAP `apply_receipt`.
- [~] AC6: La segunda boleta del mismo comercio concilia sola las líneas que ya tienen alias.
  - Lógica cubierta ("un alias gana siempre" + alias guardado por `apply_receipt`). Falta verlo con
    dos boletas reales (junto con AC7).
- [~] AC7: Staging con una boleta real: la compra, el historial y el catálogo quedan consistentes.
  - Pendiente: requiere las migraciones de plataforma-db #10 aplicadas y una compra real.
- [x] AC9: Cada boleta guarda su lectura (`ocr_result`), la revisión y las correcciones
  (`ocr_check`); una consulta lista las que no cuadraron para sumarlas al set de 0007:
  ```sql
  select id, store, purchased_at, total_amount, ocr_result->>'_model' as model,
         ocr_check->'corrections' as corrections
  from shop.receipts
  where (ocr_check->>'totalMatches')::boolean is false
     or jsonb_array_length(coalesce(ocr_check->'corrections', '[]')) > 0
  order by created_at desc;
  ```
- [x] AC8: `test:ci` (364), `lint:arch` (0 errores) y `ng build` en verde; índices actualizados.
