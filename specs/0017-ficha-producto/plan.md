> spec: 0017-ficha-producto
> status: approved
> created: 2026-10-10

# Plan

Escrito para que otra sesión, sin el contexto de la conversación, pueda ejecutarlo. Antes de
empezar: lee `spec.md`, `docs/RECORRIDO-UX.md` §3 (Catálogo) y los índices (`DATABASE.md`,
`FACADES.md`, `REPOSITORIES.md`, `COMPONENTS.md`). El esquema vive en el repo **`plataforma-db`**
(migraciones + pgTAP; deploy a staging al mergear a main, producción manual con `deploy.yml`).

## Mapa actual
```
features/shopping/products/products.page.ts   Catálogo: lista alfabética; precio como texto que se
                                              edita al tocar (fix-050) → se reemplaza por D5/D6
core/facades/products.facade.ts               loadProducts(), updatePrice(); products() con
                                              daysSincePurchase
core/repositories/products.repository.ts      findByFamily, searchByName (ilike), create,
                                              findIdByName, updatePrice, findRestockStats, snoozeRestock
core/facades/product-search.facade.ts         buscador de Mi Lista + "Tus esenciales"
core/facades/restock.facade.ts                "Te puede faltar" (restock_stats)
core/repositories/receipts.repository.ts      findAliases(familyId) (product_aliases)
core/utils/tab-chrome.utils.ts                TABS incluye 'products' → products/:id ya marca Catálogo
```
FKs (`plataforma-db/supabase/migrations/20260925183000_shop_schema.sql` y siguientes):
`list_items.product_id ON DELETE SET NULL`, `product_aliases.product_id ON DELETE CASCADE`,
`purchase_lines.product_id ON DELETE SET NULL`, `list_items` único `(list_id, product_id)`.

## Tareas (en orden; cada una con su test primero)

### T1. BD (plataforma-db) — AC12
- Migración `2026101xxxxxx_shop_product_sheet.sql`:
  - `ALTER TABLE shop.products ADD COLUMN archived_at timestamptz;`
  - `restock_stats()`: `WHERE p.archived_at IS NULL`.
  - `merge_products(p_from uuid, p_into uuid) RETURNS integer` (compras movidas), SECURITY INVOKER,
    `search_path = shop, public`:
    1. Ambos visibles por RLS y misma `family_id`, distintos (`same_product`, `product_not_found`,
       `different_family`).
    2. `list_items`: donde ya hay fila de `p_into` en la misma lista → sumar `quantity` (y mantener
       `is_checked` si alguno lo está) y borrar la de `p_from`; el resto → `UPDATE product_id`.
    3. `purchase_lines`, `product_aliases` → `UPDATE product_id` (alias: `ON CONFLICT` no aplica
       porque la PK es `(family_id, raw_text)`; basta el UPDATE).
    4. `p_into.last_price` / `last_purchased_at` = los de la compra más reciente entre ambos
       (`refresh_last_purchased` de 0015 si sirve); `estimated_duration_days` se deja.
    5. `DELETE FROM products WHERE id = p_from`.
- pgTAP `shop_product_sheet.test.sql`: sumar en la misma lista; mover líneas y alias; otra familia
  rechazada; archivado fuera de `restock_stats`.
- PR en plataforma-db; **no mergear ni desplegar sin el visto bueno del dueño**.

### T2. Repositorio y modelo — AC2, AC4, AC6–AC9
- `Product.archived_at?: string | null` (`core/models/product.model.ts`).
- `ProductsRepository`:
  - `findByFamily(familyId, { archived = false })` y `searchByName` con `.is('archived_at', null)`.
  - `findPurchases(productId)`: `list_items` marcados con `product_id` = id en listas `completed`,
    `select('quantity, unit_price, shopping_lists!inner(id, completed_at, status, receipts(store))')`,
    orden por `completed_at` desc.
  - `rename(id, name)`, `remove(id)`, `archive(id)`, `unarchive(id)`, `merge(from, into)` (RPC).
- `ReceiptsRepository.findAliasesOf(productId)` y `removeAlias(familyId, rawText)`.
- Tests de repositorio con el `queryMock` existente.

### T3. Util — AC2, AC9
- `core/utils/product-sheet.utils.ts`:
  - `purchaseHistory(rows)` → `{ date, stores, quantity, unitPrice }[]`.
  - `buyEvery(stats)` → "Lo compras cada ~N días · N compras" o null con < 2.
  - `matchesSearch(name, term)` sin tildes ni mayúsculas (reusar `normalizeReceiptText` si sirve).

### T4. `ProductSheetFacade` (nuevo, `core/facades/product-sheet.facade.ts`)
- `load(id)`: producto, compras, alias, stat de `restock_stats`.
- `addToList()`, `rename(name)` (valida y detecta duplicado → devuelve el id del otro),
  `remove()`, `archive()`, `unarchive()`, `mergeInto(otherId)`, `removeAlias(rawText)`,
  `setEstimatedPrice(price)` (solo sin compras).
- Agregar a la lista: la composición con `ShoppingListFacade` va en la página (un facade no inyecta
  otro); el facade expone el producto y la página llama `ShoppingListFacade.addItem`.

### T5. Página de ficha — AC1–AC8, AC11
- `features/shopping/products/product-sheet.page.{ts,html,spec.ts}`, ruta `products/:id`.
- Encabezado con atrás y ⋯ (`ion-action-sheet`: Renombrar, Juntar con…, Archivar/Borrar).
- "Juntar con…": modal con buscador de productos (excluye el actual) → confirmación con el conteo.
- Archivados: banner "Archivado" + "Reactivar".

### T6. Catálogo — AC9, AC10
- `products.page`: buscador arriba, filtro local, "Crear «texto»", contador, segmento
  "Activos / Archivados", nombre en `line-clamp-2`, precio como texto sin edición, fila → ficha.
- `ProductsFacade`: `archived` y `query` como señales; `filtered` computed.

### T7. Excluir archivados en el resto
- `ProductSearchFacade` (buscador y esenciales) y `RestockFacade` no muestran archivados (la BD ya
  los saca de `restock_stats`; los esenciales salen de `findByFamily`).

### T8. Índices, docs y verificación — AC13, AC14
- `/sync-indices`; `DATABASE.md` (columna y RPC), `REPOSITORIES.md`, `FACADES.md`, `COMPONENTS.md`.
- `docs/RECORRIDO-UX.md`: K1–K7, H1–H3, H6 resueltos; paso 4 hecho.
- Staging 375×667 con la migración ya en staging: juntar, archivar, buscar y crear. Anotar en
  `spec.md` § Verificación.

## Riesgos
- **Juntar es irreversible.** La confirmación dice qué se mueve; no hay deshacer.
- **Productos en plantillas** (`status = 'template'`): `merge_products` también los mueve (son
  `list_items`); archivar no los quita de la plantilla (aparecen con su nombre).
- **Deploy:** la app necesita `archived_at` en producción antes de publicar; si la migración no está,
  `.is('archived_at', null)` falla. Desplegar la BD primero.
