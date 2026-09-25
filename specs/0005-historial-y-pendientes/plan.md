# Plan — 0005-historial-y-pendientes

## 0. Base de datos (plataforma-db) — hecho en rama local
`20260925220000_shop_purchase_history.sql` + `shop_purchase_history.test.sql` (22 tests, validados
en Postgres 16 local con stubs de `auth`/pgTAP). Falta: push/PR, merge → staging, exponer
`complete_list` en la Data API.

## 1. Modelos
- `shopping-list.model.ts`: `ListItem.unit_price?: number | null`.
- `product.model.ts`: `Product.last_purchased_at?: string | null`.
- `purchase-history.model.ts` (UI): `PurchasedItem { name, quantity, unitPrice, subtotal }`,
  `PurchaseSummary { id, name, completedAt, itemCount, total, items }`,
  `MonthlySpending { total, count }`.

## 2. Funciones puras (`core/utils/`, con spec)
- `date.utils.ts`: `daysSince(iso, now) → number` (días de calendario locales),
  `formatDaysAgo(days) → 'hoy' | 'ayer' | 'hace N días'`.
- `restock.utils.ts`: `needsRestock({ last_purchased_at, estimated_duration_days }, now)`;
  default 7 días; nunca comprado ⇒ false.
- `purchase-history.utils.ts`: `summarizePurchase(list)` (solo ítems marcados; subtotal =
  cantidad × `unit_price ?? 0`), `spendingInMonth(purchases, now)`.

## 3. Repository
- `ShoppingListsRepository.complete(listId, carryPending): Promise<string | null>` →
  `db.rpc('complete_list', { p_list_id, p_carry_pending })`.
- `findCompleted(familyId, limit = 50)`: `status = completed`, `completed_at desc`.

## 4. Facades
- `ShoppingListFacade.completeList(listId, carryPending): Promise<boolean>`: toast éxito/error;
  al terminar `reset()` + `initialize()` + `loadTemplates()`.
- `PurchaseHistoryFacade extends BaseFacade<PurchaseSummary[]>` (Family + ShoppingLists repos):
  `fetchData` = `findCompleted` → `summarizePurchase`; `thisMonth = computed(spendingInMonth)`.
- `ProductsFacade`: `ProductWithStatus.daysSincePurchase: number | null`;
  `recommendedProducts` = `needsRestock`.

## 5. UI
- Mi Lista: `completeList` → alerta con 3 botones si hay pendientes (Pasar / Descartar /
  Cancelar); 2 si no. Botón historial (ícono `history`) en `slot=actions` del header.
- `features/shopping/history/history.page.ts|html`: header con volver (`NavController.back`),
  tarjeta "Este mes", lista de compras con detalle desplegable; skeleton / vacío / error.
- Ruta `app/history`. Ícono `History` registrado en `app.config.ts`.
- Catálogo: texto `Comprado {{ formatDaysAgo }}` / "Sin compras aún"; banner: "no compras hace
  un tiempo".

## 6. Orden (commits)
1. `test`: specs en rojo (utils, repository, facades, page).
2. `feat`: implementación → verde.
3. Staging: tras merge en plataforma-db + exponer RPC → verificación en Chromium.
4. `docs`: índices + DOMAIN_DICTIONARY + DATABASE.
