# DOMAIN DICTIONARY — App de Compras

Lenguaje ubicuo. Usar estos términos en código, UI y specs.

| Término (UI) | Código / tabla | Definición |
|---|---|---|
| Familia | `families` | Grupo que comparte listas, catálogo y boletas. Unidad de aislamiento (RLS por `family_id`). |
| Miembro | `family_members` | Usuario dentro de una familia. Rol `owner` (creador) o `member` (unido por código). Un usuario pertenece a **una** familia. |
| Código de familia | `families.invite_code` | 8 caracteres (`ABCD-EFGH`, sin 0/O/1/I) para que otro usuario se una (`join_family_by_code`). Cambia cuando el dueño quita a un miembro. |
| Dueño | `family_members.role = 'owner'` | Quien creó la familia. Puede quitar miembros. |
| Producto | `products` | Ítem del catálogo de la familia. Guarda `last_price` y `estimated_duration_days`. |
| Tus Esenciales | `ProductSearchFacade.loadEssentials` | Productos sugeridos al abrir el buscador. |
| Lista | `shopping_lists` | Una compra. Estados: `active`, `completed`, `archived`, `template`. |
| Lista activa | `status = 'active'` | La compra en curso (la más reciente). |
| Plantilla | `status = 'template'` | Lista reutilizable (ej. "Asado"). Se clona a la lista activa. |
| Repetir última compra | `lastCompletedList` | Clonar la última lista `completed`. |
| Ítem | `list_items` | Producto + cantidad dentro de una lista. `is_checked` = ya está en el carro. |
| Tachar / marcar | `toggleItemCheck` | Marcar un ítem como comprado. Se propaga por Realtime. La BD guarda quién y cuándo (`checked_by`, `checked_at`). |
| Pendiente | `is_checked = false` | Ítem de la lista que aún no está en el carro. |
| Finalizar compra | `completeList(id, carryPending)` → RPC `complete_list` | La lista pasa a `completed` con lo marcado; los pendientes pasan a la próxima lista o se descartan. |
| Precio pagado | `list_items.unit_price` | Precio del producto al finalizar la compra (el `last_price` de ese momento). |
| Historial | `PurchaseHistoryFacade`, `/app/history` | Compras finalizadas con su total y el gasto del mes. Cada compra dice si su total es de la **boleta**, **ingresado** o **estimado**; en las estimadas se puede "Agregar boleta" o "Ingresar total". |
| Gasto real | `total_paid ?? estimado` | El gasto del mes suma lo pagado de verdad y cuenta cuántas compras siguen estimadas. |
| Compra sin lista | `create_receipt_purchase`, `startNew()` | Compra no planificada: la boleta crea la compra (ya finalizada), conciliada contra catálogo y alias. |
| Reponer | `needsRestock` | Producto comprado hace al menos su `estimated_duration_days` (7 si no tiene). Nunca comprado ⇒ no se sugiere. |
| Boleta | `receipts` | Ticket del súper. Siempre cierra una compra (una por compra). Se lee con OCR (Edge Function `process-receipt`, Gemini) y se concilia con la compra. |
| Cerrar compra | `PurchaseCloseFacade`, `/app/close` | Al Finalizar: **Escanear boleta**, **Sin boleta** (total y precios a mano) o **Ahora no** (precios estimados). |
| Origen del total | `shopping_lists.total_source` | `receipt` (boleta), `manual` (lo escribió el usuario) o `estimated` (suma de últimos precios). |
| Conciliación | `reconcileReceipt` | Cruce de líneas de la boleta con la compra: alias → lista → catálogo → "no estaba en la lista". |
| Alias | `product_aliases` | Texto de boleta ("LCH ENT SOP") ya confirmado como un producto; la próxima boleta lo reconoce sola. |
