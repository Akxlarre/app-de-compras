# DOMAIN DICTIONARY — App de Compras

Lenguaje ubicuo. Usar estos términos en código, UI y specs.

| Término (UI) | Código / tabla | Definición |
|---|---|---|
| Familia | `families` | Grupo que comparte listas, catálogo y boletas. Unidad de aislamiento (RLS por `family_id`). |
| Miembro | `family_members` | Usuario dentro de una familia. Rol `owner` (creador) o `member` (unido por código). Un usuario pertenece a **una** familia. |
| Código de familia | `families.id` | UUID que se comparte para que otro usuario se una vía RPC `join_family`. |
| Producto | `products` | Ítem del catálogo de la familia. Guarda `last_price` y `estimated_duration_days`. |
| Tus Esenciales | `ProductSearchFacade.loadEssentials` | Productos sugeridos al abrir el buscador. |
| Lista | `shopping_lists` | Una compra. Estados: `active`, `completed`, `archived`, `template`. |
| Lista activa | `status = 'active'` | La compra en curso (la más reciente). |
| Plantilla | `status = 'template'` | Lista reutilizable (ej. "Asado"). Se clona a la lista activa. |
| Repetir última compra | `lastCompletedList` | Clonar la última lista `completed`. |
| Ítem | `list_items` | Producto + cantidad dentro de una lista. `is_checked` = ya está en el carro. |
| Tachar / marcar | `toggleItemCheck` | Marcar un ítem como comprado. Se propaga por Realtime. |
| Finalizar compra | `completeList` | Pasa la lista a `completed`. |
| Boleta | `receipts` | Ticket del súper. Se lee con OCR (Edge Function `process-receipt`, Gemini). |
