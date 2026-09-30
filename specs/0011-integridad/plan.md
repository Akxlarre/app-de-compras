# Plan 0011 — Integridad de la lista y cola sin conexión

## 0. Decisiones
- **La BD es la única que decide "¿ya está?" y "¿cuánto hay?".** El cliente deja de mandar valores
  absolutos de cantidad y deja de insertar filas sueltas en `list_items`: todo alta pasa por RPCs que
  suman (`add_list_item`, `add_list_items`) y toda cantidad por `change_item_quantity(delta)`.
- **0 filas = error, sin distinguir en el repo.** Con RLS un ítem ajeno y uno borrado se ven igual
  (0 filas). El repo lanza `MutationError('not_found')`; el facade decide si fue por perder la familia
  comparando la familia de la lista con `FamilyRepository.findMine()`. Las RPCs lanzan
  `list_not_found` / `item_not_found` / `list_not_active`, que el repo traduce al mismo tipo.
- **"Te quitaron" se detecta al fallar una mutación y al recargar**, no por Realtime: un DELETE de
  `family_members` no llega filtrado por RLS al quitado (sin `replica identity full` no trae
  `user_id`). Suficiente para AC6; Realtime de familia queda fuera.
- **Persistencia en `localStorage`** (el WebView de Capacitor la conserva al cerrar la app), clave por
  usuario. Sin plugin nuevo. Se guarda la cola y **una foto de la última lista activa**: sin ella, al
  reabrir sin red no habría lista sobre la que aplicar la cola (AC8).
- **Red:** `navigator.onLine` + eventos `online`/`offline` + "falló por red" (`TypeError` de `fetch`
  / `FetchError` de supabase-js) que marca offline hasta el próximo `online` o una petición exitosa.
  Sin `@capacitor/network`.
- **Crear lista activa es idempotente**: `start_active_list` devuelve `{id, created}`. Los atajos
  (repetir compra, plantilla, lista inteligente) copian ítems **solo si `created`**, para que un doble
  toque no duplique cantidades.

## 1. Base de datos (plataforma-db, migración `shop_list_integrity` + pgTAP)
Repo aparte: se agrega a la sesión con `add_repo` y va en su propio PR.
1. **Limpieza previa (AC4)**, en la misma transacción:
   - Listas `active` sobrantes por familia: los ítems pasan a la más nueva (sumando si el producto ya
     está), las sobrantes quedan `archived`.
   - Duplicados `(list_id, product_id)`: queda la fila más antigua con `quantity = sum`,
     `is_checked = bool_or`, `checked_at/by` de alguna marcada, `unit_price` de la más reciente no nula;
     el resto se borra.
2. `create unique index list_items_list_product_uniq on shop.list_items (list_id, product_id)`
   (los `product_id` null no chocan, correcto).
3. `create unique index shopping_lists_one_active on shop.shopping_lists (family_id) where status = 'active'`.
4. RPCs (`SECURITY INVOKER`, RLS de siempre):
   - `add_list_item(p_list_id, p_product_id, p_quantity) → list_items`: `insert … on conflict
     (list_id, product_id) do update set quantity = list_items.quantity + excluded.quantity`.
     `list_not_found` si la lista no es visible; `list_not_active` si no está activa.
   - `add_list_items(p_list_id, p_items jsonb) → int` (misma regla en lote; para clonar y la lista
     inteligente).
   - `change_item_quantity(p_item_id, p_delta) → int`: `update … set quantity = greatest(1, quantity
     + p_delta) returning quantity`; `item_not_found` si 0 filas.
   - `start_active_list(p_name) → (id uuid, created boolean)`: familia de `auth.uid()`; `insert … on
     conflict do nothing` sobre el índice parcial y, si no insertó, devuelve la activa existente.
5. `complete_list`: el traspaso de pendientes usa `on conflict … do update` (suma). `close_list_manual`
   y `apply_receipt` lo heredan.
6. pgTAP: duplicado suma, carrera simulada (dos inserts), mínimo 1, segunda activa rechazada por el
   índice y aceptada por `start_active_list`, aislamiento entre familias (otra familia → `list_not_found`),
   limpieza de datos previos (fixture con duplicados y dos activas).
7. Aplicar en staging y revisar la cuenta `test1` (dos Leche → una con cantidad sumada).

## 2. Núcleo
- `core/models/mutation-error.model.ts`: `MutationError extends Error` con
  `code: 'not_found' | 'list_not_active' | 'offline'`, y `toMutationError(e)` (mapea los
  mensajes de las RPCs y el fallo de red).
- `core/utils/offline-queue.utils.ts` (puro, TDD): `enqueue(queue, op)` compacta — marcado: último
  valor por ítem; cantidad: deltas sumados por ítem (se borra si suma 0) —; `applyQueue(list, queue)`
  para superponer la cola sobre la foto de la lista.

## 3. Servicios (`core/services/infrastructure/`)
- `NetworkStatusService`: `online` (signal), `reportNetworkFailure()`, `reportSuccess()`; escucha
  `online`/`offline` de `window`.
- `OfflineStoreService`: `localStorage` con try/catch, clave `offline:<userId>`: `queue` y
  `listSnapshot`. Se limpia al cerrar sesión (`SessionScopeService`).

## 4. Repositories (AC5)
- `ListItemsRepository`:
  - `add` → RPC `add_list_item`; `addMany(listId, items)` → RPC `add_list_items`.
  - `changeQuantity(itemId, delta): Promise<number>` → RPC; reemplaza `updateQuantity`.
  - `setChecked` y `remove` con `.select('id')`: 0 filas → `MutationError('not_found')`.
  - Todos pasan el error por `toMutationError`.
- `ShoppingListsRepository`: `startActive(name) → {id, created}` (RPC); `create` queda solo para
  plantillas. `complete`/`closeManual` traducen `list_not_active`.
- Specs: por cada mutación, caso 0 filas / error de RPC → `MutationError` con su código.

## 5. Facades
- `ShoppingListFacade`:
  - `addItem`: siempre `items.add` (RPC). Si ya está en pantalla, patch optimista `+quantity` y
    luego refresco; si no, refresco. Doble toque: dos RPCs, una fila (AC1).
  - `updateItemQuantity(itemId, delta)` (antes valor absoluto): patch optimista, RPC, fija la
    cantidad devuelta; rollback con el delta si falla (AC2).
  - `createList` / `startListFrom` → `startActive`; copia solo si `created` (AC3).
  - `cloneListItems` / `saveAsTemplate` → `addMany` con merge.
  - Errores: `handleMutationError(e)` — `offline` → encolar (si la op es encolable) o aviso;
    `not_found` → `checkMembership()`; otros → toast como hoy.
  - `checkMembership()`: `getOrCreateFamilyId()`; si difiere de `family_id` de la lista cargada →
    toast "Ya no eres parte de «X»" (nombre guardado al cargar con `findMine`), una sola vez por
    familia, y `reloadAfterClose()` (AC6). Si no difiere → "Ese producto ya no está en la lista" y
    refresco.
  - Sin conexión (AC7–AC9): `toggleItemCheck` y `updateItemQuantity` con `online() === false` (o al
    fallar por red) aplican el patch, `enqueue` y guardan la foto. `fetchData` sin red usa la foto +
    `applyQueue`. `effect` sobre `online`: al volver, `flushQueue()` en orden; los rechazos
    (`not_found`, `list_not_active`) se cuentan y descartan; un fallo de red corta y deja el resto.
    Al terminar: refresco y, si hubo rechazos, un toast "N cambios no se pudieron guardar".
  - Expone `isOnline` y `pendingChanges` (cuenta de la cola).
- `ProductsFacade.generateSmartList`: `startActive` + `addMany` (merge; ya no hace falta filtrar
  "los que ya están", pero se mantiene para no sumar cantidades a lo existente).
- `PurchaseCloseFacade`: sin cambios de lógica; su error `list_not_active` pasa por `toMutationError`.

## 6. UI
- Mi Lista: aviso discreto bajo el header "Sin conexión: tus cambios se guardan y se envían al
  volver" (+ "N pendientes") con tokens del sistema; se oculta con red.
- Sin red se deshabilitan con texto explicativo (AC10): buscador/alta de productos, borrar (swipe),
  Finalizar/Cerrar compra, Crear lista, atajos y plantillas, "Generar lista inteligente".
- Los `+`/`−` de cantidad pasan a emitir delta (`+1` / `−1`) en vez del valor final.

## 7. Tests (TDD, antes del código)
- `offline-queue.utils.spec`: compactación y superposición.
- `network-status.service.spec`, `offline-store.service.spec` (storage que lanza → no rompe).
- Repos (AC5): 0 filas, errores de RPC, red caída → códigos.
- `shopping-list.facade.spec`: doble `addItem` (dos RPCs, sin crear filas locales), delta y rollback,
  `startListFrom` que no copia si `created = false`, `not_found` con familia cambiada → aviso y
  recarga, cola offline → flush con un rechazo → un toast con el conteo, reapertura sin red usa foto.
- Página de lista: acciones deshabilitadas sin red, aviso visible.

## 8. Verificación y cierre
- `npm run test:ci`, `npm run lint:arch` (0 errores), `ng build`.
- Staging con `test1` y `test2` (AC1–AC4, AC6, AC7 con DevTools offline, AC8 cerrando la pestaña,
  AC9 borrando el ítem desde la otra cuenta).
- Índices: `DATABASE.md` (índices y RPCs nuevas), `REPOSITORIES.md`, `FACADES.md`, `SERVICES.md`,
  `MODELS.md`. Commit junto con `docs/QA-EXPLORACION.md` y `.claude/launch.json` pendientes.

## Orden
1 (PR plataforma-db) → 2 → 3 → 4 → 5 → 6 → 8. La app no se despliega antes de que la migración
esté en staging: `add_list_item` y `start_active_list` no existirían.
