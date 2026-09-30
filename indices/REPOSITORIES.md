# REPOSITORIES

> Única capa que toca `SupabaseService.client` (queries, RPC, Realtime, Storage, Edge Functions).
> Contrato: un método por operación, retornan modelos de `core/models/`, **lanzan** el error de Supabase.
> Lista (spec 0011): `ListItemsRepository` y `ShoppingListsRepository` lanzan `MutationError`
> (`core/utils/mutation-error.utils.ts`): `not_found` (también un UPDATE/DELETE que afecta 0 filas,
> que es como RLS bloquea), `list_not_active` u `offline`; el resto pasa tal cual.
> Guardia: `src/app/architecture.spec.ts` (corre en `npm run test:ci` / CI).
> Schema: `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository` y `ProductsRepository`
> consultan `shop` (`client.schema('shop')`, regla g); `profiles` y `app_updates` siguen en `public`.
> Mantener a mano: `npm run indices:sync` no escanea `core/repositories/`.

| Repository | Métodos | Tabla / recurso | Archivo |
|---|---|---|---|
| `FamilyRepository` | `getOrCreateFamilyId()`, `findMine()` (id, nombre, código, mi rol; filtra por el usuario de la sesión), `preview(code)`, `joinByCode(code)`, `findMembers()`, `removeMember(userId)`, `rename(familyId, name)` | RPC `get_or_create_family`, `preview_family`, `join_family_by_code`, `get_family_members`, `remove_family_member`; `family_members`, `families` | `src/app/core/repositories/family.repository.ts` |
| `ShoppingListsRepository` | `findLatestActive()`, `findLastCompleted(familyId)`, `findTemplates(familyId)`, `findCompleted(familyId, limit?)`, `startActive(name) → {id, created}` (la activa; si ya hay, la devuelve), `create({name, familyId, status})` (plantillas), `complete(listId, carryPending)`, `closeManual(listId, carryPending, prices, total)`, `setPurchaseTotal(listId, total, prices)` | `shopping_lists` (+ `list_items`, `products` y, en `findCompleted`, `receipts(id, image_url, store)` embebidos); RPC `start_active_list`, `complete_list`, `close_list_manual`, `set_purchase_total` | `src/app/core/repositories/shopping-lists.repository.ts` |
| `ListItemsRepository` | `add(listId, productId, qty) → fila` (suma si ya está), `addMany(listId, items)`, `findByList()`, `changeQuantity(itemId, delta) → cantidad`, `setChecked()`, `remove()`, `watchList(listId, cb) → baja` | `list_items` + Realtime; RPC `add_list_item`, `add_list_items`, `change_item_quantity` | `src/app/core/repositories/list-items.repository.ts` |
| `ProductsRepository` | `findByFamily(familyId, limit?)`, `searchByName(term, limit)`, `create({name, familyId, lastPrice?})`, `findIdByName()`, `updatePrice()` | `products` | `src/app/core/repositories/products.repository.ts` |
| `ReceiptsRepository` | `extractReceipt(images, expectedItems)` → `OcrReceipt`, `uploadImage(familyId, file)` → ruta, `findAliases(familyId)`, `applyReceipt(input)` → id de la boleta, `attachReceipt(input)`, `createReceiptPurchase(input, name?)`, `getSignedUrl(path)` (1 hora) | Edge Function `process-receipt`; bucket privado `receipts`; `product_aliases`; RPC `apply_receipt`, `attach_receipt`, `create_receipt_purchase` | `src/app/core/repositories/receipts.repository.ts` |
| `AppUpdatesRepository` | `findLatest(target)`, `getApkPublicUrl(path)` | `app_updates`, bucket `releases` | `src/app/core/repositories/app-updates.repository.ts` |
| `ProfilesRepository` | `findById(id)` → `{ id, email, role_id }` | `profiles` | `src/app/core/repositories/profiles.repository.ts` |

## Quién usa qué

| Consumidor | Repositories |
|---|---|
| `ShoppingListFacade` | Family, ShoppingLists, ListItems |
| `ProductsFacade` | Family, Products, ShoppingLists, ListItems |
| `PurchaseHistoryFacade` | Family, ShoppingLists, Receipts (URL firmada de la foto) |
| `ProductSearchFacade` | Products |
| `PurchaseCloseFacade` | Family, ShoppingLists, Receipts, Products |
| `FamilyFacade` | Family |
| `AuthFacade` | Profiles (+ API de sesión de `SupabaseService`) |
| `AppUpdateService` | AppUpdates |

## Tests
Specs de repositories usan `src/testing/supabase-query.mock.ts` (`queryMock`, `supabaseServiceMock`).
Los specs de facades mockean repositories, no Supabase.
