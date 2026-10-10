# DATABASE — App de Compras

Fuente del esquema: **[plataforma-db](https://github.com/Akxlarre/plataforma-db)**
(`supabase/migrations/20260925183000_shop_schema.sql`). Esta app **no tiene migraciones** (ADR-001).

Todo lo de compras vive en el schema **`shop`**, aislado por familia vía
`shop.get_user_family_ids()` (SECURITY DEFINER, devuelve las familias de `auth.uid()`).
`profiles` y `app_updates` son comunes a todas las apps y siguen en `public`.

Acceso desde la app: **solo** vía `core/repositories/` → ver `indices/REPOSITORIES.md`.
Los repositories de compras usan `client.schema('shop')` (guardia: `architecture.spec.ts` regla g).

> ⚠️ **Proyecto Supabase compartido** con app-de-entrenamiento (y futuras apps + hub). Un cambio de
> tablas es un PR en plataforma-db. Un schema nuevo además debe exponerse en
> *Settings → API → Exposed schemas* de cada proyecto (si no, `PGRST106`).

## Tablas (`shop`)

| Tabla | Columnas clave | RLS (`authenticated`) |
|---|---|---|
| `families` | `id`, `name`, `invite_code` (8 caracteres sin 0/O/1/I, único) | SELECT/UPDATE si soy miembro. **Sin INSERT directo** → `get_or_create_family()`. |
| `family_members` | PK (`family_id`, `user_id` → `public.profiles`), `role` owner/member | SELECT si soy miembro. **Sin INSERT directo** → RPCs. |
| `products` | `family_id`, `name`, `category` (pasillo: uno de 11, NOT NULL default `Otros`; trigger `products_suggest_aisle` lo sugiere con `suggest_aisle(name)` al crear o al renombrar uno en Otros; spec 0019, migración `20261010030000_shop_aisles_units`, plataforma-db #20, en staging; producción pendiente), `last_price`, `estimated_duration_days`, `last_purchased_at`, `restock_snoozed_until` ("Todavía tengo": no sugerir hasta esa fecha, para toda la familia; spec 0014), `archived_at` (archivado: fuera del buscador, del Catálogo y de `restock_stats`; spec 0017, migración `20261010010000_shop_product_sheet` (staging, plataforma-db #18)) | ALL si es de mi familia. |
| `shopping_lists` | `family_id`, `name`, `status` active/completed/archived/template, `completed_at`, `total_paid` (int, null = no se sabe), `total_source` receipt/manual/estimated (default estimated). **Una sola `active` por familia** (índice único parcial `shopping_lists_one_active_per_family`). | ALL si es de mi familia. |
| `list_items` | `list_id`, `product_id`, `quantity` (numeric), `unit` (un/kg/g/L/ml/paquete, default `un`; spec 0019), `is_checked`, `checked_at`, `checked_by`, `unit_price`. **Único `(list_id, product_id)`**; trigger `list_items_merge_duplicate`: un INSERT de un producto que ya está suma a la fila existente. | ALL si la lista es de mi familia. Realtime (`supabase_realtime`) por `list_id`. Trigger `list_items_track_check`: marcar fija `checked_at`/`checked_by = auth.uid()`, desmarcar los limpia (no se escriben desde el cliente). |
| `receipts` | `family_id`, `list_id` (varias boletas por compra desde la spec 0015 D6: una salida por varias tiendas; `apply_receipt` recibe las demás en `p_receipt.others`), `image_url` (ruta en el bucket `receipts`), `total_amount`, `store`, `purchased_at`, `ocr_result` (lectura con `_model`), `ocr_check` (revisión + correcciones del usuario), `status` | ALL si es de mi familia. Se crea con `apply_receipt`. |
| `purchase_lines` | `list_id` (cascade), `receipt_id` (cascade), `line_index` (único por boleta), `raw_text`, `name`, `kind` product/discount/bag/deposit/other, `quantity`, `unit_price`, `amount` (negativo en descuentos), `product_id` (null si no entró al catálogo; set null al borrar el producto). Todas las líneas de la boleta (spec 0015, G2; migración `20261009010000`, en staging). | ALL si la lista es de mi familia; se escribe con `apply_receipt` / `attach_receipt`. |
| `product_aliases` | PK (`family_id`, `raw_text` normalizado con `normalize_receipt_text`), `product_id` | ALL si es de mi familia. Texto de boleta ya confirmado como un producto. |

Storage: bucket privado **`receipts`**, ruta `<family_id>/<uuid>.<ext>`; policies por carpeta de familia.

`anon` no tiene acceso al schema. Tests de RLS: `plataforma-db/supabase/tests/shop_rls.test.sql`.

## RPCs (`shop`)

| Función | Qué hace |
|---|---|
| `get_or_create_family() → uuid` | Devuelve la familia del usuario o crea "Familia de <nombre>" (display_name o parte local del email; `default_family_name`) con él como `owner`. Migración `20261001010000_shop_family_default_name` (fix-047, Q40), que además renombró las "Mi Familia" existentes. |
| `join_family(p_family_id uuid) → uuid` | Une al usuario como `member`; quita sus membresías previas. Falla si la familia no tiene miembros (`invalid_family_code`) o ya es miembro (`already_member`). |
| `preview_family(p_code text) → (name, member_count)` | Familia de un código (acepta minúsculas/guiones) para confirmar antes de unirse. Vacío si no existe. |
| `join_family_by_code(p_code text) → uuid` | Como `join_family`, por código. Errores `invalid_family_code` (P0002), `already_member` (23505). |
| `get_family_members() → (user_id, name, role, joined_at, is_me)` | Miembros de mi familia; `name` = `display_name` o parte local del email (nunca el email). |
| `remove_family_member(p_user_id uuid)` | Solo el dueño, no a sí mismo; rota el código. Errores `not_owner`, `cannot_remove_self`, `not_member`. Migración `20260926010000_shop_family_invites_members`. |
| `complete_list(p_list_id uuid, p_carry_pending boolean) → uuid` | Finaliza la compra (SECURITY INVOKER, RLS). Fija `unit_price` y `products.last_purchased_at` de lo marcado; los pendientes se mueven a la lista activa (o a una "Compra de la Semana" nueva, sumando cantidades) y devuelve su id, o se borran con `false` (devuelve null). Errores: `list_not_found`, `list_not_active`, `nothing_checked` (sin ítems marcados, spec 0012; lo heredan `close_list_manual` y `apply_receipt`). La lista de pendientes se llama "Lista de compras". Migración `20260925220000_shop_purchase_history`. |
| `close_list_manual(p_list_id, p_carry_pending, p_prices jsonb, p_total int) → uuid` | Cierre sin boleta: fija `unit_price` confirmados (`[{item_id, unit_price}]`), actualiza `last_price` solo si cambió, llama `complete_list` y guarda `total_paid` (`manual`; sin total queda `estimated`). Error `invalid_total`. |
| `apply_receipt(p_list_id, p_carry_pending, p_receipt jsonb, p_items jsonb, p_extras jsonb) → uuid` | Cierre con boleta (transaccional): `p_items` `[{item_id, unit_price, quantity, raw_text, save_alias}]` o `{item_id, checked:false}` ("no lo compraste"); `p_extras` `[{product_id?, raw_text, name, unit_price, quantity}]` (con `product_id` usa el producto conocido, sin él lo crea); guarda alias, la boleta y `total_paid` (`receipt`). Errores `list_not_found`, `list_not_active`, `product_not_found`. Migraciones `20260929010000`/`20260929020000`. **Spec 0015** (`20261009010000`, plataforma-db#17, en staging; producción pendiente): un ítem **pendiente** en `p_items` sin `checked:false` queda comprado; `completed_at` = fecha de la boleta (`receipt_purchase_time`); `last_purchased_at` se recalcula (`refresh_last_purchased`). |
| `attach_receipt(p_list_id, p_receipt, p_items, p_extras) → uuid` | Como `apply_receipt` sobre una compra **ya `completed`** sin boleta (Historial → "Agregar boleta"); no mueve pendientes. Errores `list_not_completed`, `receipt_exists` (23505). Spec 0015: también toma la fecha de la boleta. |
| `save_purchase_lines(p_list_id, p_receipt_id, p_lines jsonb, p_created jsonb) → void` | Guarda `p_receipt.lines` en `purchase_lines` (producto del ítem, del producto indicado o del creado para esa línea, solo de la familia). La llaman `apply_receipt` / `attach_receipt`; los extras traen `line_index`. Spec 0015 (G2). |
| `receipt_purchase_time(p_receipt jsonb) → timestamptz` | Fecha de compra según la boleta (`purchased_at` del último año y no futura, a las 12:00) o null. Spec 0015. |
| `refresh_last_purchased(p_list_id) → void` | `last_purchased_at` de lo comprado en la lista = la compra cerrada más reciente que lo incluye. Spec 0015. |
| `create_receipt_purchase(p_receipt, p_extras, p_name) → uuid` | Compra no planificada: crea la compra `completed` (fecha de la boleta si es del último año) y le aplica la boleta. No toca la lista activa. |
| `add_list_item(p_list_id, p_product_id, p_quantity) → list_items` | Agrega a la lista activa; si ya está, suma (`ON CONFLICT`). Errores `list_not_found`, `list_not_active`. Migración `20260930010000_shop_list_integrity` (spec 0011). |
| `add_list_items(p_list_id, p_items jsonb)` | En lote (`[{product_id, quantity}]`) a una lista activa o plantilla, sumando. |
| `change_item_quantity(p_item_id, p_delta) → numeric` | Suma el incremento en la BD (mínimo 1) y devuelve la cantidad final. Errores `item_not_found`, `list_not_active`. |
| `start_active_list(p_name) → (id, created)` | La lista activa de mi familia ("Lista de compras" por defecto); la crea si no hay. Si ya hay, la devuelve con `created = false`. |
| `delete_purchase(p_list_id) → text` | Borra una compra `completed` (ítems y boleta en cascada), recalcula `products.last_purchased_at` y devuelve la ruta de la foto (o null). Errores `list_not_found`, `list_not_completed`. Migración `20260930020000_shop_purchase_model` (spec 0012). |
| `rename_purchase(p_list_id, p_name)` | Nombre propio de una compra `completed` (1 a 60 caracteres). Errores `invalid_name`, `list_not_found`, `list_not_completed`. |
| `restock_stats() → (product_id, purchase_count, median_interval_days, last_purchased_at)` | Por producto de mis familias: días distintos en que se compró (compras `completed`, ítem marcado), mediana de días entre compras (null con <2) y última compra. SECURITY INVOKER. Migración `20260930030000_shop_restock` (spec 0014). |
| `merge_products(p_from uuid, p_into uuid) → integer` | Junta un duplicado (spec 0017 D4): mueve `list_items` (sumando si coinciden en una lista), `purchase_lines` y `product_aliases` a `p_into`, recalcula su `last_price`/`last_purchased_at` y borra `p_from`. Devuelve cuántas compras cerradas se movieron. SECURITY INVOKER. Errores `same_product`, `product_not_found`, `different_family`. Da `UPDATE (product_id)` en `purchase_lines` a `authenticated`. Migración `20261010010000_shop_product_sheet`. |
| `public.set_my_display_name(p_name text) → text` | Nombre propio (spec 0018): SECURITY DEFINER, solo `display_name` de la fila de `auth.uid()`, 1 a 40 caracteres. Existe porque la policy `profiles_update_own_safe` es recursiva (42P17) y nadie puede hacer UPDATE en su perfil. Errores `invalid_name`, `profile_not_found`, `not_authenticated`. Migración `20261010020000_core_set_my_display_name` (staging; plataforma-db #19). |
| `set_purchase_total(p_list_id, p_total, p_prices)` | "Ingresar total" de una compra cerrada sin boleta: `total_paid`, `total_source = manual` y precios confirmados. Errores `invalid_total`, `list_not_completed`, `has_receipt`. Migración `20260929030000_shop_receipts_history`. |

## `public` (común)

| Objeto | Uso en esta app |
|---|---|
| `profiles` | `ProfilesRepository` (`id`, `email`, `role_id`). Creada por trigger `on_auth_user_created`. |
| `app_updates` | `AppUpdatesRepository`, filtra `app_target = 'shop'`. |
| bucket `releases` | APK de actualización (`AppUpdatesRepository.getApkPublicUrl`). |

## Edge Functions (en este repo)

| Función | Qué hace |
|---|---|
| `process-receipt` | OCR de boletas con Gemini. No lee ni escribe tablas. Secret `GEMINI_API_KEY`. |
