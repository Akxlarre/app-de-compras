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
| `products` | `family_id`, `name`, `category`, `last_price`, `estimated_duration_days`, `last_purchased_at` | ALL si es de mi familia. |
| `shopping_lists` | `family_id`, `name`, `status` active/completed/archived/template, `completed_at` | ALL si es de mi familia. |
| `list_items` | `list_id`, `product_id`, `quantity`, `is_checked`, `checked_at`, `checked_by`, `unit_price` | ALL si la lista es de mi familia. Realtime (`supabase_realtime`) por `list_id`. Trigger `list_items_track_check`: marcar fija `checked_at`/`checked_by = auth.uid()`, desmarcar los limpia (no se escriben desde el cliente). |
| `receipts` | `family_id`, `image_url`, `total_amount`, `status` pending_ocr/processed/error | ALL si es de mi familia. (Sin uso en la app todavía.) |

`anon` no tiene acceso al schema. Tests de RLS: `plataforma-db/supabase/tests/shop_rls.test.sql`.

## RPCs (`shop`)

| Función | Qué hace |
|---|---|
| `get_or_create_family() → uuid` | Devuelve la familia del usuario o crea "Mi Familia" con él como `owner`. |
| `join_family(p_family_id uuid) → uuid` | Une al usuario como `member`; quita sus membresías previas. Falla si la familia no tiene miembros (`invalid_family_code`) o ya es miembro (`already_member`). |
| `preview_family(p_code text) → (name, member_count)` | Familia de un código (acepta minúsculas/guiones) para confirmar antes de unirse. Vacío si no existe. |
| `join_family_by_code(p_code text) → uuid` | Como `join_family`, por código. Errores `invalid_family_code` (P0002), `already_member` (23505). |
| `get_family_members() → (user_id, name, role, joined_at, is_me)` | Miembros de mi familia; `name` = `display_name` o parte local del email (nunca el email). |
| `remove_family_member(p_user_id uuid)` | Solo el dueño, no a sí mismo; rota el código. Errores `not_owner`, `cannot_remove_self`, `not_member`. Migración `20260926010000_shop_family_invites_members`. |
| `complete_list(p_list_id uuid, p_carry_pending boolean) → uuid` | Finaliza la compra (SECURITY INVOKER, RLS). Fija `unit_price` y `products.last_purchased_at` de lo marcado; los pendientes se mueven a la lista activa (o a una "Compra de la Semana" nueva, sumando cantidades) y devuelve su id, o se borran con `false` (devuelve null). Errores: `list_not_found`, `list_not_active`. Migración `20260925220000_shop_purchase_history`. |

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
