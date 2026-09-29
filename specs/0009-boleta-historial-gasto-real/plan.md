# Plan 0009 — Boleta desde el Historial, compra no planificada y gasto real

## 0. Decisiones
- **Reutilizo la conciliación de 0008.** `reconcileReceipt`, `buildApplyReceipt` y la pantalla de cierre
  sirven igual; cambia a qué compra se aplica (`kind`): `active` (0008), `completed` (Historial) o
  `new` (compra sin lista).
- **Tres RPCs nuevas** (plataforma-db, `SECURITY INVOKER`, RLS), todas sobre una compra `completed`
  sin boleta:
  - `attach_receipt(list, receipt, items, extras)`: igual que `apply_receipt` pero sin `complete_list`
    (la compra ya está cerrada); error `receipt_exists` si ya tiene boleta.
  - `create_receipt_purchase(receipt, extras, name)`: crea la compra `completed` (fecha = fecha de la
    boleta) y llama `attach_receipt`. No toca la lista activa.
  - `set_purchase_total(list, total, prices)`: "Ingresar total" (sin boleta) sobre una compra cerrada
    con estimados; `total_source = manual`. Error `has_receipt` si ya tiene boleta.
- **Gasto real:** `total = total_paid ?? estimado`. El mes marca cuántas compras son estimadas.
- **Foto:** bucket privado → URL firmada de 1 hora (`createSignedUrl`), solo se pide al tocar "Ver boleta".
- **Compra sin lista:** las líneas que no se reconocen entran al catálogo por defecto (si no, la
  compra quedaría sin productos); el usuario puede desmarcarlo.
- **Fuera de alcance:** "precio al marcar" (opcional de la spec) queda para después.

## 1. Base de datos (plataforma-db)
Migración `shop_receipts_history` + pgTAP (`shop_receipts_history.test.sql`): las 3 RPCs, aislamiento
entre familias, `receipt_exists`, `has_receipt`, compra sin lista con fecha de la boleta.

## 2. Núcleo funcional
- `purchase-history.utils`: `summarizePurchase` con `total_paid`, origen y boleta; `spendingInMonth`
  con `estimatedCount`.
- `purchase-close.utils`: extras por defecto al catálogo en compra nueva.

## 3. Repositories
- `ShoppingListsRepository.findCompleted` embebe `receipts(id, image_url, store)`;
  `setPurchaseTotal`, `createReceiptPurchase`.
- `ReceiptsRepository.attachReceipt`, `getSignedUrl(path)`.

## 4. Facades y UI
- `PurchaseCloseFacade.start(list, carry, mode, kind)` según el destino.
- `PurchaseHistoryFacade.receiptUrl(path)`.
- Historial: total real con etiqueta "Estimado", mes con "N estimadas", acciones "Agregar boleta",
  "Ingresar total" y "Ver boleta".
- Boletas (pestaña): sin compra activa ofrece "Escanear compra sin lista"; con una, sigue el cierre.

## 5. Verificación
`test:ci`, `lint:arch`, `ng build`, pgTAP local; índices; staging diferido a la primera compra real.
