> spec: 0019-lista-para-el-super
> status: approved
> created: 2026-10-10

# Plan

## Base de datos (plataforma-db, migración `20261010030000_shop_aisles_units`) — AC1, AC3, AC5
- `shop.suggest_aisle(p_name text) → text`: pasillo por palabras clave sobre el nombre normalizado
  (sin tildes, minúsculas, `normalize_receipt_text`), en el orden de D1; sin coincidencia, `'Otros'`.
  IMMUTABLE.
- `products.category`: se backfillea con `suggest_aisle(name)` cuando sea null o no esté en la lista,
  con CHECK de los 11 pasillos y `NOT NULL DEFAULT 'Otros'`.
- Trigger `BEFORE INSERT` en `products`: si `category` viene null o `'Otros'`, la sugiere. Cubre los
  productos creados a mano, desde la boleta (`apply_receipt` / `create_receipt_purchase`) y por
  `merge_products`.
- `list_items.unit text NOT NULL DEFAULT 'un'` con CHECK (`un, kg, g, L, ml, paquete`).
- pgTAP `shop_aisles_units.test.sql`: sugerencias, backfill, CHECK, trigger, unidad por defecto e
  inválida, y que `complete_list` conserva un `unit_price` anotado.
- PR en plataforma-db **sin mergear** (el usuario decide); staging se actualiza al mergear.

## App
### T1. Utils (test primero) — AC1, AC2, AC3
- `core/utils/aisles.utils.ts`: `AISLES` (orden D1), `aisleIndex(name)`, `groupByAisle(items)` →
  `{ aisle, items }[]` en orden de D1, pendientes primero y marcados al final de cada grupo.
- `core/utils/units.utils.ts`: `UNITS`, `isDecimalUnit(unit)` (kg, L), `formatQuantity(q, unit)`
  ("1,5 kg", "2 un" → "2", "500 g"), `parseQuantity(text, unit)` (coma o punto; > 0; entero en un,
  g, ml, paquete).

### T2. Datos — AC1, AC3, AC4
- `ListItem.unit`, `Product.category` como `Aisle`.
- `ListItemsRepository`: `setQuantityUnit(itemId, quantity, unit)`, `setPrice(itemId, unitPrice)`.
- `ProductsRepository.updateAisle(id, aisle)`.
- `ShoppingListFacade`: `setQuantityUnit`, `setPrice` (optimistas, con rollback y toast; offline:
  van a la cola como los cambios de cantidad si la cola lo admite, si no se piden con señal).
- `ProductSheetFacade.setAisle(aisle)`.
- `PurchaseCloseFacade` (sin boleta): precio inicial `item.unit_price ?? product.last_price`.

### T3. UI — AC2, AC3, AC4
- Mi Lista: interruptor "Por pasillo / Como la agregué" (localStorage, por teléfono); encabezado por
  pasillo; fila con "1,5 kg" y el precio anotado; en kg/L/g/ml la cantidad es un botón (sin
  stepper) que abre el detalle.
- Detalle del ítem (hoja inferior local `item-detail-sheet`): unidad (chips), cantidad (decimal en
  kg/L) y precio.
- Al marcar: barra "¿Precio? $____" unos segundos sobre el botón +, sin foco automático; se cierra
  sola si no se toca. "Total estimado" usa `unit_price ?? last_price`.
- Ficha: "Pasillo" con selector (action sheet de los 11).

### T4. Verificación — AC6, AC7
- `test:ci`, `lint:arch`, `ng build`; migración y pgTAP en Postgres local; staging después de que se
  mergee la migración (o con la migración aplicada en staging si el usuario lo autoriza).
- Índices (DATABASE, REPOSITORIES, FACADES, MODELS), `DOMAIN_DICTIONARY` (Pasillo, Unidad) y
  `RECORRIDO-UX.md`.
