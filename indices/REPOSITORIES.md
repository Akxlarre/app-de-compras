# REPOSITORIES

> Única capa que toca `SupabaseService.client` (queries, RPC, Realtime, Storage, Edge Functions).
> Contrato: un método por operación, retornan modelos de `core/models/`, **lanzan** el error de Supabase.
> Guardia: `src/app/architecture.spec.ts` (corre en `npm run test:ci` / CI).
> Schema: `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository` y `ProductsRepository`
> consultan `shop` (`client.schema('shop')`, regla g); `profiles` y `app_updates` siguen en `public`.
> Mantener a mano: `npm run indices:sync` no escanea `core/repositories/`.

| Repository | Métodos | Tabla / recurso | Archivo |
|---|---|---|---|
| `FamilyRepository` | `getOrCreateFamilyId()`, `findMine()` (id, nombre, código, mi rol), `preview(code)`, `joinByCode(code)`, `findMembers()`, `removeMember(userId)`, `rename(familyId, name)` | RPC `get_or_create_family`, `preview_family`, `join_family_by_code`, `get_family_members`, `remove_family_member`; `family_members`, `families` | `src/app/core/repositories/family.repository.ts` |
| `ShoppingListsRepository` | `findLatestActive()`, `findLastCompleted(familyId)`, `findTemplates(familyId)`, `findCompleted(familyId, limit?)`, `create({name, familyId, status})`, `complete(listId, carryPending)` | `shopping_lists` (+ `list_items`, `products` embebidos); RPC `complete_list` | `src/app/core/repositories/shopping-lists.repository.ts` |
| `ListItemsRepository` | `add()`, `addMany()`, `findByList()`, `updateQuantity()`, `setChecked()`, `remove()`, `watchList(listId, cb) → baja` | `list_items` + Realtime | `src/app/core/repositories/list-items.repository.ts` |
| `ProductsRepository` | `findByFamily(familyId, limit?)`, `searchByName(term, limit)`, `create({name, familyId, lastPrice?})`, `findIdByName()`, `updatePrice()` | `products` | `src/app/core/repositories/products.repository.ts` |
| `ReceiptsRepository` | `extractItems(imageBase64, mimeType)` | Edge Function `process-receipt` | `src/app/core/repositories/receipts.repository.ts` |
| `AppUpdatesRepository` | `findLatest(target)`, `getApkPublicUrl(path)` | `app_updates`, bucket `releases` | `src/app/core/repositories/app-updates.repository.ts` |
| `ProfilesRepository` | `findById(id)` → `{ id, email, role_id }` | `profiles` | `src/app/core/repositories/profiles.repository.ts` |

## Quién usa qué

| Consumidor | Repositories |
|---|---|
| `ShoppingListFacade` | Family, ShoppingLists, ListItems |
| `ProductsFacade` | Family, Products, ShoppingLists, ListItems |
| `PurchaseHistoryFacade` | Family, ShoppingLists |
| `ProductSearchFacade` | Products |
| `ReceiptScannerFacade` | Family, Products, Receipts |
| `FamilyFacade` | Family |
| `AuthFacade` | Profiles (+ API de sesión de `SupabaseService`) |
| `AppUpdateService` | AppUpdates |

## Tests
Specs de repositories usan `src/testing/supabase-query.mock.ts` (`queryMock`, `supabaseServiceMock`).
Los specs de facades mockean repositories, no Supabase.
