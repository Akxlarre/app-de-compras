# DATABASE — App de Compras

Fuente: `supabase/migrations/`. Todo aislado por familia vía `public.get_user_family_ids()`
(SECURITY DEFINER, devuelve las familias de `auth.uid()`).

Acceso desde la app: **solo** vía `core/repositories/` → ver `indices/REPOSITORIES.md`.

> ⚠️ **Proyecto Supabase compartido** con app-de-entrenamiento (y futuras apps + hub). Antes de crear
> o cambiar tablas, leer `docs/adr/ADR-001-base-de-datos-compartida.md`: las migraciones nuevas van
> al repo de base de datos compartida, no a `supabase/migrations/` de esta app.

## Tablas

| Tabla | Columnas clave | RLS |
|---|---|---|
| `profiles` | `id` (= auth.users.id), `email`, `role_id` | SELECT autenticados; UPDATE propio. Creada por trigger `on_auth_user_created`. |
| `families` | `id`, `name` | SELECT/UPDATE si soy miembro. **Sin INSERT directo** → `get_or_create_family()`. |
| `family_members` | PK (`family_id`, `user_id`), `role` owner/member | SELECT si soy miembro. **Sin INSERT directo** → RPCs. |
| `products` | `family_id`, `name`, `category`, `last_price`, `estimated_duration_days` | ALL si es de mi familia. |
| `shopping_lists` | `family_id`, `name`, `status` active/completed/archived/template, `completed_at` | ALL si es de mi familia. |
| `list_items` | `list_id`, `product_id`, `quantity`, `is_checked`, `checked_at`, `checked_by` | ALL si la lista es de mi familia. Realtime por `list_id`. |
| `receipts` | `family_id`, `image_url`, `total_amount`, `status` pending_ocr/processed/error | ALL si es de mi familia. |

## RPCs

| Función | Qué hace |
|---|---|
| `get_or_create_family() → uuid` | Devuelve la familia del usuario o crea "Mi Familia" con él como `owner`. |
| `join_family(p_family_id uuid) → uuid` | Une al usuario como `member`; quita sus membresías previas. Falla si la familia no tiene miembros o ya es miembro. |

## Storage

| Bucket | Acceso |
|---|---|
| `receipts` (privado) | INSERT/SELECT solo bajo `<family_id>/…` de tu familia. |
| `releases` | Usado por `AppUpdateService` (APK). No definido en migraciones. |

## Referenciado por la app pero ausente en migraciones
`app_updates` (AppUpdateService, filtra `app_target = 'shop'`) y bucket `releases`.
