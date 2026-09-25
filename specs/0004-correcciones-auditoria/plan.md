# Plan — 0004-correcciones-auditoria

## 1. Estado por sesión
- `core/services/auth/session-scope.service.ts`: `register(reset)` / `clear()`; una limpieza que
  falla no corta las demás.
- `BaseFacade`: en su inicialización registra `() => { this.dispose(); this.reset(); }`.
- `ShoppingListFacade.reset()`: además vacía `templates` y `lastCompletedList`.
- `ProductSearchFacade`, `ProductsFacade`, `FamilyFacade`, `ReceiptScannerFacade`: registran su
  `reset()` en el constructor (los que no lo tienen lo ganan).
- `AuthFacade`: `scope.clear()` en `logout()`, en `SIGNED_OUT` y si llega una sesión de otro usuario.
- `architecture.spec.ts` regla (h): facade que no extiende `BaseFacade` ⇒ usa `SessionScopeService`
  (excepto `auth.facade.ts`, `app-update.facade.ts`).

## 2. Error que tapa la lista
- `BaseFacade.refreshSilently()`: tras `_data.set(...)` exitoso, `_error.set(null)`.
- `ShoppingListFacade`: los `catch` de mutaciones usan `ToastService.error(...)` (patrón de
  `swr-pattern.md`), no `_error`. `loadTemplates` falla en silencio (son atajos opcionales).

## 3. Precio
- `core/utils/price.utils.ts` → `parsePrice(raw): number | null` (vacío, NaN, negativo ⇒ null;
  redondea a entero CLP).
- `ProductsFacade.updatePrice(id, price): Promise<boolean>`: no llama al repository si el precio es
  igual al actual; toast si falla.
- `ProductsPage.onPriceBlur`: `parsePrice`; si es null o no se guardó, restaura el valor mostrado.

## 4. Lista inteligente
- `ProductsFacade.generateSmartList()`: `lists.findLatestActive()`; si existe, agrega solo los
  recomendados que no están en ella; si no, crea "Compra Inteligente".

## Orden (commits)
1. `test`: specs en rojo (scope, base, shopping-list, products, auth, family, search, receipt,
   price utils, regla h).
2. `fix`: implementación → verde.
3. Repro en staging (Chromium) de los 4 síntomas + `test:ci`, `lint:arch`, `ng build`.
