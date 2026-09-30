# Plan — 0014-sugerencias-reposicion

## 1. plataforma-db (PR propio; staging se despliega al mergear)
- `supabase/migrations/20260930030000_shop_restock.sql`:
  - `alter table shop.products add column restock_snoozed_until timestamptz;`
  - `shop.restock_stats() returns table(product_id uuid, purchase_count int,
    median_interval_days numeric, last_purchased_at timestamptz)` — SECURITY INVOKER, `stable`:
    días distintos (`completed_at::date`) de compras `completed` con `is_checked`, `lag()` para
    intervalos, `percentile_cont(0.5)`; filtra por `shop.get_user_family_ids()`.
  - `grant execute … to authenticated`.
- `supabase/tests/shop_restock.test.sql` (pgTAP): conteo, mediana, null con 1 compra, ítems no
  marcados no cuentan, otra familia no ve filas; UPDATE de `restock_snoozed_until` propio sí,
  ajeno 0 filas.
- `bash scripts/check-migrations.sh` + pgTAP local (Postgres 16 del scratchpad).

## 2. App
- Modelo: `Product.restock_snoozed_until?`; `RestockStat`, `RestockSuggestion` en
  `core/models/restock.model.ts`.
- `ProductsRepository.findRestockStats()` (RPC) y `snoozeRestock(productId, until)` (UPDATE
  `.select('id')`, 0 filas → `not_found`). Specs.
- `core/utils/restock.utils.ts`: `restockSuggestions(...)`, `restockIntervalDays(...)`; se
  mantiene `needsRestock` solo si algo lo usa (si no, se reemplaza). Specs primero.
- `RestockFacade extends BaseFacade<RestockData>`: `fetchData` = productos de la familia + stats
  en paralelo; `snooze(id)` optimista con rollback y toast. Spec.
- `ShoppingListFacade.addProducts(listId, productIds)` → `items.addMany`, refresco. Spec.
- Mi Lista: componente local `features/shopping/active-list/restock-strip.component.ts` (dumb:
  `suggestions` input, `add`/`addAll`/`snooze`/`expand` outputs); la página compone
  `restockSuggestions(restock.data(), ids de la lista)` en un `computed`. Spec de página.
- Catálogo: quitar banner; `ProductsFacade` sin `recommendedProducts`/`generateSmartList` (y sus
  tests); índices.

## 3. Verificación en staging
Semillas por API en la familia de test3: un producto comprado 3 veces cada ~10 días (última hace
12 → toca), otro 2 veces cada 30 (última hace 12 → no toca), uno con 1 compra hace 8 (→ toca).
Playwright: franja, `+`, "Agregar todas", "Todavía tengo" y test4 ya no la ve.
