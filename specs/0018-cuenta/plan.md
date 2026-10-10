> spec: 0018-cuenta
> status: draft (se aprueba junto con D1–D7 de la spec)
> created: 2026-10-10

# Plan

Escrito para que otra sesión, sin el contexto de la conversación, pueda ejecutarlo. Antes de
empezar: lee `spec.md`, `docs/RECORRIDO-UX.md` §5 (Perfil), ADR-001 y los índices (`DATABASE.md`,
`FACADES.md`, `REPOSITORIES.md`). El esquema vive en **`plataforma-db`** (compartido con
Entrenamiento: cuidado con todo lo que toque `public.profiles` o `auth.users`).

## Mapa actual
```
features/profile/profile.page.ts                    encabezado grande, familia, "Buscar actualizaciones",
                                                    "Cerrar sesión"
features/profile/family-section/family-section.*    nombre de la familia, código (copiar/compartir con
                                                    navigator.share), miembros, quitar, unirme por código
core/facades/auth.facade.ts                         login, signUp, logout, updatePassword (sin verificar la
                                                    actual), currentUser (name, initials, email)
core/facades/family.facade.ts                       loadMyFamily, preview, joinByCode, removeMember, rename
core/repositories/profiles.repository.ts            findById
core/services/app-update.service.ts                 App.getInfo() (versión instalada en Android)
supabase/functions/process-receipt                  única Edge Function hoy (Deno)
```
BD: `family_members.user_id → public.profiles(id) ON DELETE CASCADE`; `profiles.id → auth.users
ON DELETE CASCADE`; tablas de Entrenamiento con `user_id → auth.users ON DELETE CASCADE`;
`list_items.checked_by → profiles ON DELETE SET NULL`. RLS: `profiles_update_own_safe` deja
actualizar la fila propia sin cambiar el rol (sirve para `display_name`).

## Tareas (en orden; cada una con su test primero)

### T1. BD (plataforma-db) — AC2, AC3, AC10
- Migración `2026101xxxxxx_shop_account_deletion.sql`:
  - `shop.prepare_account_deletion() RETURNS text[]` (SECURITY DEFINER, `search_path = ''`, solo
    `auth.uid()`; `REVOKE` a `anon`): por cada familia del usuario:
    - único miembro → junta las rutas de fotos (`receipts.image_url`) y `DELETE FROM shop.families`
      (cascada a listas, ítems, productos, boletas, líneas, alias);
    - con otros y era `owner` → pasa `owner` al miembro más antiguo (`created_at`) y se borra su fila.
  - Devuelve las rutas de fotos a borrar del bucket.
- pgTAP `shop_account_deletion.test.sql`: único miembro (no queda nada de la familia; devuelve las
  fotos); dueño con otro miembro (traspaso, datos intactos); miembro común (solo sale); otro usuario
  no afecta familias ajenas.

### T2. Edge Function `delete-account` (este repo, `supabase/functions/delete-account`)
- Recibe el JWT del usuario y `{ password }`.
- Verifica la contraseña con `signInWithPassword(email, password)` (cliente anon); si falla →
  401 `wrong_password`.
- Con el cliente del usuario llama `shop.prepare_account_deletion()`; con service role borra las
  fotos del bucket `receipts` y `auth.admin.deleteUser(uid)` (cascada a profile y Entrenamiento).
- Errores claros (`wrong_password`, `not_authenticated`, `failed`). Tests Deno de la lógica pura
  (validación de entrada, orden de pasos con dependencias falsas).
- Secrets: usa `SUPABASE_SERVICE_ROLE_KEY` (ya existe en el entorno de Edge Functions).
- Deploy con el workflow `deploy-functions-staging.yml` / `deploy-functions.yml`.

### T3. Repositorios y facade — AC1, AC4–AC6
- `ProfilesRepository.updateDisplayName(id, name)`.
- `AccountRepository` (nuevo): `deleteAccount(password)` → `functions.invoke('delete-account')`.
- `AuthFacade`:
  - `rename(name)` (1–40; actualiza `currentUser`).
  - `changePassword(current, next)`: re-autentica con `current` y luego `updatePassword(next)`.
  - `deleteAccount(password)`: llama al repo, `sessionScope.clear()`, `signOut`,
    `navigateRoot('/login', { state: { deleted: true } })`.
- `FamilyFacade.invitationMessage()` y `parseInviteCode(text)` en `core/utils/family.utils.ts`
  (ya existe `normalizeInviteCode`: extender para sacar el código de un mensaje pegado).

### T4. Perfil — AC1, AC5–AC9
- Encabezado compacto con "Editar nombre" (alerta con input).
- Sección "Cuenta": Cambiar contraseña (modal con 3 campos), Borrar mi cuenta (modal con el texto de
  D1/D2 y la contraseña; botón destructivo).
- `family-section`: "Invitar" con el mensaje de D6; "¿Te invitaron a otra familia?" plegado; el
  input acepta el mensaje completo.
- "Buscar actualizaciones" muestra la versión (`App.getInfo()` en Android; en web, la de
  `package.json` vía `environment` o se oculta).
- Login: aviso "Tu cuenta fue borrada" si llega con ese estado.

### T5. Índices, docs y verificación — AC11, AC12
- `/sync-indices`; `DATABASE.md` (RPC), `REPOSITORIES.md`, `FACADES.md`, `SERVICES.md` si aplica.
- `docs/RECORRIDO-UX.md`: P1–P7 resueltos; paso 5 hecho.
- Staging con cuentas nuevas (`delete1`, `delete2`, `delete3`): borrar solo, borrar siendo dueño
  con otro miembro, nombre, contraseña, invitar/unirse. Anotar en `spec.md` § Verificación.

## Riesgos
- **Irreversible y compartido.** Borrar la cuenta borra Entrenamiento; la confirmación con
  contraseña y el texto de D1 son la protección. Nunca probar con cuentas reales.
- **Service role en una Edge Function.** Solo borra al usuario del JWT verificado; nunca recibe un
  `user_id` del cliente.
- **Orden de deploy:** migración (plataforma-db) → Edge Function → app.
