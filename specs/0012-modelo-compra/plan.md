# Plan 0012 — Modelo de compra: sin compras vacías, nombre por fecha y borrar/renombrar

## 0. Decisiones
- **El nombre automático se decide al mostrar, no en la BD.** Guardar "Compra del 30 sep" en la
  BD fijaría la zona horaria del servidor. `purchaseTitle(list)` usa la fecha local si el nombre
  es uno de los automáticos; renombrar guarda el texto del usuario y desde ahí se muestra ese.
  Las compras que ya existen ("Compra de la Semana") pasan a verse por fecha sin migrar datos.
- **`nothing_checked` vive en `complete_list`**: `close_list_manual` y `apply_receipt` la llaman
  después de fijar precios y extras, así una boleta con extras sí cierra aunque no hubiera nada
  marcado a mano. La UI lo bloquea antes; la BD cubre a otro miembro u otra pantalla.
- **Borrar compra = RPC + Storage.** `delete_purchase` borra la fila (ítems y boleta en cascada),
  recalcula `last_purchased_at` y devuelve la ruta de la foto; la app la borra del bucket con la
  policy "Family receipts delete" que ya existe. Si borrar la foto falla, la compra igual queda
  borrada (la foto huérfana no se ve en ningún lado); se registra en consola.
- **"Vaciar lista" borra los ítems de la lista activa** (DELETE por `list_id`, RLS). No es una RPC:
  una sola sentencia; 0 filas no es error (ya estaba vacía).

## 1. Base de datos (plataforma-db, migración `shop_purchase_model` + pgTAP)
1. `complete_list`: igual que hoy más `nothing_checked` (P0001) si no hay ítems marcados; la lista
   que recibe pendientes se crea como "Lista de compras" (con `ON CONFLICT` sobre el índice de
   lista activa única de la 0011).
2. `start_active_list(p_name DEFAULT 'Lista de compras')`.
3. Limpieza: `DELETE` de compras `completed` sin `list_items` y sin boleta.
4. `delete_purchase(p_list_id) → text` (SECURITY INVOKER): `list_not_found` si no se ve,
   `list_not_completed` si no está cerrada. Guarda los `product_id` marcados y la ruta de la foto,
   borra la lista y recalcula `products.last_purchased_at = max(completed_at)` de las compras que
   quedan donde el producto estaba marcado (null si ninguna).
5. `rename_purchase(p_list_id, p_name) → void`: `invalid_name` si vacío o > 60; solo `completed`.
6. pgTAP `shop_purchase_model.test.sql`: cierre sin marcados rechazado (las 3 RPCs), boleta con
   extras cierra, limpieza de vacías, borrar recalcula `last_purchased_at`, borrar una activa o
   plantilla → `list_not_completed`, otra familia → `list_not_found` en borrar y renombrar,
   renombrar vacío/largo → `invalid_name`. Ajustar tests que cerraban listas sin marcados.

## 2. Núcleo
- `core/utils/purchase-name.utils.ts` (TDD): `AUTO_LIST_NAMES`, `purchaseTitle(name, completedAt,
  hasReceiptWithoutList?)` → "Compra del mié 30 sep" / nombre propio; `disambiguateTitles(list)`
  agrega la hora si dos títulos automáticos coinciden el mismo día (AC4).
- `toMutationError`: `nothing_checked`, `invalid_name`, `list_not_completed` como códigos nuevos.

## 3. Repositories
- `ShoppingListsRepository.deletePurchase(listId) → imagePath | null`,
  `renamePurchase(listId, name)`.
- `ListItemsRepository.clearList(listId)`.
- `ReceiptsRepository.removeImage(path)`.
- Specs: llamadas y traducción de errores.

## 4. Facades
- `ShoppingListFacade`: `clearList()` (optimista, revierte si falla; requiere red);
  `completeList` avisa "Marca lo que compraste para finalizar" ante `nothing_checked`;
  `hasChecked` computed para la página. Nombres por defecto → "Lista de compras".
- `PurchaseHistoryFacade`: `deletePurchase(id)` (optimista: sale de la lista y del mes; si falla,
  vuelve y avisa; luego borra la foto), `renamePurchase(id, name)`; `PurchaseSummary.title`
  calculado con `purchaseTitle` + desambiguación.
- `PurchaseCloseFacade`: el aviso de `nothing_checked` si llegara desde el cierre.

## 5. UI
- Mi Lista: Finalizar deshabilitado sin marcados, con "Marca lo que compraste para finalizar"
  debajo; menú de lista con "Vaciar lista" (alerta de confirmación, `data-llm-action`).
- Historial: título = `purchase.title`; en el detalle, "Renombrar" (alerta con input, valida
  largo) y "Borrar compra" (alerta destructiva: "Se borra también su boleta y deja de contar en
  el gasto del mes").
- Cierre con boleta: nombre por defecto "Compra sin lista" se mantiene (se muestra con fecha).

## 6. Tests (TDD, antes del código)
- `purchase-name.utils.spec`, repos, `shopping-list.facade.spec` (vaciar, `nothing_checked`),
  `purchase-history.facade.spec` (borrar optimista y rollback, renombrar, título), páginas
  (Finalizar deshabilitado, confirmaciones).

## 7. Verificación y cierre
- `test:ci`, `lint:arch`, `ng build`; pgTAP local (Postgres 16) y en CI de plataforma-db.
- Staging con test3/test4: cierre sin marcados bloqueado (UI y API), vaciar lista, títulos por
  fecha, renombrar visto por el otro miembro, borrar con boleta (foto fuera del bucket) y
  "última compra" recalculada.
- Índices: DATABASE, REPOSITORIES, FACADES.

## Orden
1 (PR plataforma-db, mergear y aplicar en staging) → 2 → 3 → 4 → 5 → 7.
