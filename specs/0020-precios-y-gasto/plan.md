> spec: 0020-precios-y-gasto
> status: done
> created: 2026-10-10

# Plan
Sin cambios de BD: todo sale de `purchase_lines` (con `receipt_id` → `receipts.store,
purchased_at`), `list_items.unit_price`, `receipts.total_amount` y lo que ya carga
`PurchaseHistoryFacade`.

## Tareas (cada una con su test primero)
### T1. Utils — AC1, AC2, AC3, AC4
- `core/utils/price-insights.utils.ts`:
  - `pricesByStore(rows)` → `{ store, unitPrice, date }[]`: el último precio por tienda, del más barato
    al más caro (solo líneas con tienda).
  - `priceRise(previous, current)` → porcentaje entero si sube ≥ 10%, si no null.
  - `lastRise(purchases)` sobre las compras de la ficha (misma tienda si la última tiene tienda).
- `core/utils/purchase-history.utils.ts`:
  - `monthlyTotals(purchases, endMonth, n = 6)` → `{ month, total, count }[]`.
  - `topProducts(purchases, n = 5)` → `{ name, total }[]` (suma de `items.subtotal` por nombre).
  - `spendByStore(purchases)` → `{ store, total }[]` (por boleta con `total_amount`; sin boleta →
    "Sin boleta").
  - `summarizePurchase`: `receiptTotals: { store, total }[]`.

### T2. Datos
- `ShoppingListsRepository.findCompleted`: `receipts(id, image_url, store, total_amount)`.
- `ProductsRepository.findStorePrices(productId)`: `purchase_lines` del producto (`kind = product`)
  con `unit_price, quantity, amount, receipt:receipts(store, purchased_at)`.
- `ProductSheetFacade`: `storePrices` y `rise` en la ficha.
- `PurchaseCloseFacade`: precio anterior por producto (`last_price` del catálogo que ya carga al
  leer) para marcar "Subió X%" en "Coinciden".
- `PurchaseHistoryFacade`: `chart` (6 meses que terminan en el mes actual), `average`, `top`,
  `byStore` del mes elegido; `goToMonth(month)`.

### T3. UI
- Ficha: sección "Por tienda" y aviso "Subió X% desde la última compra".
- Cierre: etiqueta "Subió X%" en filas de "Coinciden".
- Compras: barras de 6 meses (CSS, sin librería; ver skill dataviz), promedio por compra, "Lo que más
  pesó" y "Por tienda".

### T4. Verificación — AC5, AC6
- `test:ci`, `lint:arch`, `ng build`; staging 375×667 con `test5` (boletas del 05/10); índices y
  `RECORRIDO-UX.md`.
