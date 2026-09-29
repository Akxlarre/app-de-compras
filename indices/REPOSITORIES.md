# REPOSITORIES

> Única capa que toca `SupabaseService.client` (queries, RPC, Realtime, Storage, Edge Functions).
> Contrato: un método por operación, retornan modelos de `core/models/`, **lanzan** el error de Supabase.
> Guardia: `src/app/architecture.spec.ts` (corre en `npm run test:ci` / CI).
> Schema: `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository` y `ProductsRepository`
> consultan `shop` (`client.schema('shop')`, regla g); `profiles` y `app_updates` siguen en `public`.
> Mantener a mano: `npm run indices:sync` no escanea `core/repositories/`.

| Repository | Métodos | Tabla / recurso | Archivo |
|---|---|---|---|
| `FamilyRepository` | `getOrCreateFamilyId()`, `findMine()` (id, nombre, código, mi rol; filtra por el usuario de la sesión), `preview(code)`, `joinByCode(code)`, `findMembers()`, `removeMember(userId)`, `rename(familyId, name)` | RPC `get_or_create_family`, `preview_family`, `join_family_by_code`, `get_family_members`, `remove_family_member`; `family_members`, `families` | `src/app/core/repositories/family.repository.ts` |
| `ShoppingListsRepository` | `findLatestActive()`, `findLastCompleted(familyId)`, `findTemplates(familyId)`, `findCompleted(familyId, limit?)`, `create({name, familyId, status})`, `complete(listId, carryPending)`, `closeManual(listId, carryPending, prices, total)` | `shopping_lists` (+ `list_items`, `products` embebidos); RPC `complete_list`, `close_list_manual` | `src/app/core/repositories/shopping-lists.repository.ts` |
| `ListItemsRepository` | `add()`, `addMany()`, `findByList()`, `updateQuantity()`, `setChecked()`, `remove()`, `watchList(listId, cb) → baja` | `list_items` + Realtime | `src/app/core/repositories/list-items.repository.ts` |
| `ProductsRepository` | `findByFamily(familyId, limit?)`, `searchByName(term, limit)`, `create({name, familyId, lastPrice?})`, `findIdByName()`, `updatePrice()` | `products` | `src/app/core/repositories/products.repository.ts` |
| `ReceiptsRepository` | `extractReceipt(images, expectedItems)` → `OcrReceipt`, `uploadImage(familyId, file)` → ruta, `findAliases(familyId)`, `applyReceipt(input)` → id de la boleta | Edge Function `process-receipt`; bucket privado `receipts`; `product_aliases`; RPC `apply_receipt` | `src/app/core/repositories/receipts.repository.ts` |
| `AppUpdatesRepository` | `findLatest(target)`, `getApkPublicUrl(path)` | `app_updates`, bucket `releases` | `src/app/core/repositories/app-updates.repository.ts` |
| `ProfilesRepository` | `findById(id)` → `{ id, email, role_id }` | `profiles` | `src/app/core/repositories/profiles.repository.ts` |

## Quién usa qué

| Consumidor | Repositories |
|---|---|
| `ShoppingListFacade` | Family, ShoppingLists, ListItems |
| `ProductsFacade` | Family, Products, ShoppingLists, ListItems |
| `PurchaseHistoryFacade` | Family, ShoppingLists |
| `ProductSearchFacade` | Products |
| `PurchaseCloseFacade` | Family, ShoppingLists, Receipts, Products |
| `ReceiptScannerFacade` (sin uso desde 0008; pendiente de borrar) | Family, Products, Receipts |
| `FamilyFacade` | Family |
| `AuthFacade` | Profiles (+ API de sesión de `SupabaseService`) |
| `AppUpdateService` | AppUpdates |

## Tests
Specs de repositories usan `src/testing/supabase-query.mock.ts` (`queryMock`, `supabaseServiceMock`).
Los specs de facades mockean repositories, no Supabase.
