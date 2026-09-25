# Plan — 0001-capa-repositorios

## Contrato de un Repository
- `@Injectable({ providedIn: 'root' })`, inyecta `SupabaseService` y usa `.client`.
- Un método por operación, retorna tipos de `core/models/` (nunca `{ data, error }`).
- **Lanza** el error de Supabase; el facade decide cómo mostrarlo.
- Realtime: `watchX(id, onChange): () => void` (devuelve la función de baja).

## Repositories
| Repository | Métodos |
|---|---|
| `FamilyRepository` | `getOrCreateFamilyId()`, `join(familyId)`, `findMine()` |
| `ShoppingListsRepository` | `findLatestActive()`, `findLastCompleted(familyId)`, `findTemplates(familyId)`, `create(input)`, `complete(listId)` |
| `ListItemsRepository` | `add(listId, productId, qty)`, `addMany(items)`, `findByList(listId)`, `updateQuantity(id, qty)`, `setChecked(id, checked)`, `remove(id)`, `watchList(listId, cb)` |
| `ProductsRepository` | `findByFamily(familyId, limit?)`, `searchByName(term, limit)`, `create(name, familyId, lastPrice?)`, `findIdByName(familyId, name)`, `updatePrice(id, price)` |
| `ReceiptsRepository` | `extractItems(imageBase64, mimeType)` (Edge Function `process-receipt`) |
| `AppUpdatesRepository` | `findLatest(target)`, `getApkPublicUrl(path)` |
| `ProfilesRepository` | `findById(id)` → `{ id, email, role_id }` |

`SupabaseService` gana `onAuthStateChange(cb): () => void` y `updatePassword(pw)` para que
`AuthFacade` no toque `.client`.

## Orden (commits)
1. `test(architecture)`: `architecture.spec.ts` en rojo (lista las violaciones actuales).
2. `refactor(repositories)`: repositories + specs (las aserciones de query se mudan aquí).
3. `refactor(facades)`: facades y `AppUpdateService` usan repositories; specs de facades mockean
   repositories. `reset-password` vía `AuthFacade.onPasswordRecovery`. Guardia en verde.
4. `docs`: `architecture.md`, `indices/REPOSITORIES.md`, `DATABASE.md`.

## Riesgos
- `ProductsFacade.loadProducts` y `ReceiptScannerFacade.confirmAndSavePrices` pasan de
  "error si no hay familia" a "crea la familia" (misma RPC que la lista). Es el comportamiento
  que ya tiene la pantalla principal, así que es más consistente.
