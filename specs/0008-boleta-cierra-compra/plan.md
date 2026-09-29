# Plan — 0008-boleta-cierra-compra

## 0. Decisiones de implementación
- Los **extras que no se guardan en el catálogo no se agregan como ítems**: `list_items.product_id`
  sigue siendo obligatorio. Su monto queda dentro de `total_paid` (el total de la boleta) y su línea
  en `receipts.ocr_result`. Así no hay que tocar las queries que asumen producto.
- Las dos RPCs de cierre reutilizan `shop.complete_list`: primero fijan `unit_price` / `quantity` /
  `last_price` de lo marcado y después la llaman (complete_list solo completa los `unit_price` en
  NULL). Mismo manejo de pendientes que hoy.
- "¿No lo compraste?" se resuelve en la app antes de cerrar (desmarca con el `setChecked` existente).
- Normalización de textos de boleta para alias: `shop.normalize_receipt_text(text)` = mayúsculas,
  espacios colapsados, sin espacios en los bordes. La app usa la misma regla (`normalizeReceiptText`).

## 1. Base de datos — plataforma-db (`20260929010000_shop_receipts_close_purchase.sql`)
- `shopping_lists`: `total_paid integer` (null) y `total_source text NOT NULL DEFAULT 'estimated'`
  (CHECK receipt/manual/estimated).
- `receipts`: `list_id uuid UNIQUE` (FK shopping_lists ON DELETE CASCADE), `store text`,
  `purchased_at date`, `ocr_result jsonb`, `ocr_check jsonb`.
- `product_aliases (family_id, raw_text, product_id, created_at)`, PK `(family_id, raw_text)`,
  FK a families/products ON DELETE CASCADE, RLS ALL por `shop.get_user_family_ids()`.
- `shop.normalize_receipt_text(text)` IMMUTABLE.
- `shop.close_list_manual(p_list_id, p_carry_pending, p_prices jsonb, p_total integer)` →
  uuid (lo mismo que complete_list). `p_prices = [{item_id, unit_price}]`. SECURITY INVOKER.
- `shop.apply_receipt(p_list_id, p_carry_pending, p_receipt jsonb, p_items jsonb, p_extras jsonb)`
  → receipt id. `p_receipt = {store, purchased_at, total, image_path, ocr_result, ocr_check}`,
  `p_items = [{item_id, unit_price, quantity, raw_text, save_alias}]`,
  `p_extras = [{raw_text, name, unit_price, quantity}]` (solo los que van al catálogo: crea producto,
  lo agrega marcado a la compra y guarda alias). SECURITY INVOKER.
- Bucket privado `receipts`, ruta `<family_id>/<archivo>`; policies INSERT/SELECT/DELETE por familia.
- pgTAP `shop_receipts.test.sql`: columnas y defaults; RLS de product_aliases entre familias;
  close_list_manual (precios, last_price solo si cambió, total/manual, sin total → estimated);
  apply_receipt (precios+cantidades reales, alias normalizados, extras al catálogo, receipt con
  list_id único, total_source = receipt); aislamiento entre familias.

## 2. Modelos y funciones puras (app)
- `receipt.model.ts`: `TotalSource`, `ReconciledLine`, `ReconciliationResult`, payloads de cierre.
- `receipt.utils.ts`: `normalizeReceiptText`, `reconcileReceipt(lines, checkedItems, catalog, aliases)`
  (alias > lista > catálogo > "no estaba"; ítems marcados sin línea → "¿no lo compraste?"), con
  similitud simple por tokens (sin dependencias).

## 3. Repositories
- `ShoppingListsRepository.closeManual(listId, carryPending, prices, total)`.
- `ReceiptsRepository.applyReceipt(...)`, `uploadImage(familyId, file) → path`,
  `findAliases(familyId)`.

## 4. Facade y UI
- `PurchaseCloseFacade` (nuevo): estado del cierre (modo, líneas conciliadas, precios manuales),
  `prepareManual(list)`, `scanAndReconcile(files, list)`, `confirmManual()`, `confirmReceipt()`.
- Mi Lista → Finalizar: hoja con tres opciones (Escanear boleta / Sin boleta / Ahora no).
- Pantalla "Sin boleta": total opcional + lista de marcados con precio editable.
- Pantalla "Conciliación": tres grupos, líneas dudosas destacadas, "¿no lo compraste?".

## 5. Verificación
- TDD en utils, repositories, facade y componentes; `test:ci`, `lint:arch`, `ng build`.
- Staging (Chromium): cerrar sin boleta (con y sin total) y con boleta del set de 0007.
