> id: 0006-familia
> refs: Auditoría de flujos (2026-09-25), punto 3 del plan: familia
> status: in-progress
> created: 2026-09-26

## Problema
1. **Unirse a otra familia es destructivo y sin aviso.** Un toque en "Unirse" saca al usuario de su
   familia; si era el único miembro, sus listas, catálogo e historial quedan inaccesibles. No se
   muestra a qué familia se va a unir.
2. **El código de invitación es un UUID** (36 caracteres). La pantalla muestra solo 8 y pide "el
   código completo": hay que copiarlo y pegarlo sí o sí; no se puede dictar.
3. **No se ven los miembros** ni hay forma de quitar a alguien. Quien conoce el código puede volver
   a entrar para siempre.
4. **La familia se llama "Mi Familia"** y no se puede renombrar desde la app.
5. **No se ve quién compró qué** en la lista compartida (`checked_by` ya se guarda desde 0005).
6. Los errores de unirse se mezclan en un solo mensaje ("Código inválido o ya estás en esta familia").

## Solución
### Base de datos (plataforma-db, migración nueva)
- `families.invite_code text NOT NULL UNIQUE`: 8 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
  (sin 0/O/1/I), aleatorio (`extensions.gen_random_bytes`). Default `shop.new_invite_code()`;
  backfill de las familias existentes.
- RPCs (SECURITY DEFINER, `search_path = ''`, solo `authenticated`/`service_role`). Todas normalizan
  el código (mayúsculas, sin guiones ni espacios):
  - `preview_family(p_code) → (name, member_count)`: vacío si el código no existe.
  - `join_family_by_code(p_code) → uuid`: misma semántica que `join_family` (quita la membresía
    anterior). Errores `invalid_family_code`, `already_member`.
  - `get_family_members() → (user_id, name, role, joined_at, is_me)`: solo de mi familia; `name` =
    `profiles.display_name` (o la parte local del email). No expone emails.
  - `remove_family_member(p_user_id)`: solo el `owner`; no puede quitarse a sí mismo. **Rota el
    código** para que el quitado no vuelva a entrar. Errores `not_owner`, `cannot_remove_self`,
    `not_member`.
- Renombrar: UPDATE directo sobre `families` (la policy ya lo permite a los miembros).
- Tests pgTAP `supabase/tests/shop_family.test.sql`.
- Paso manual: exponer las 4 funciones nuevas en la Data API de staging y producción.

### App
- `family.utils.ts`: `normalizeInviteCode(input) → string | null` y `formatInviteCode('ABCDEFGH') →
  'ABCD-EFGH'`.
- `FamilyRepository`: `findMine()` (id, nombre, código, mi rol), `preview(code)`, `joinByCode(code)`,
  `findMembers()`, `removeMember(userId)`, `rename(familyId, name)`.
- `FamilyFacade`: `currentFamily`, `members`, `isOwner`, `memberNames` (id → nombre);
  `loadMyFamily()` carga familia + miembros; `preview`, `joinByCode` (errores distintos: código
  inválido / ya eres miembro / otro), `removeMember`, `rename`.
- Perfil → sección Familia (componente `FamilySectionComponent`):
  - Nombre de la familia con botón para renombrar.
  - Código `ABCD-EFGH` grande, con copiar y compartir (Web Share si existe).
  - Lista de miembros: nombre, "Tú", "Dueño"; el dueño puede quitar a otros (con confirmación).
  - Unirse: campo de código → vista previa → alerta de confirmación que dice a qué familia se une
    (nombre, N miembros) y advierte que deja la actual (y que si es el único miembro no podrá volver
    a ver sus listas).
- Mi Lista: en los ítems marcados muestra quién los marcó ("Tú" o el nombre) cuando la familia tiene
  más de un miembro.

### Fuera de alcance
- Salir de la familia sin unirse a otra, transferir el rol de dueño, fusionar catálogos al unirse.
- La policy `public.profiles_select_public` (cualquier autenticado lee todos los perfiles) es común a
  todas las apps: se reporta aparte.

## Acceptance Criteria
- [ ] AC1: Migración + pgTAP: códigos únicos de 8 caracteres del alfabeto; `preview_family` y
  `join_family_by_code` aceptan el código con guion/minúsculas; `get_family_members` solo devuelve mi
  familia y sin emails; `remove_family_member` solo para el dueño, no a sí mismo, y rota el código
  (el viejo deja de funcionar); un miembro renombra su familia pero no otra. CI de plataforma-db verde.
- [ ] AC2: `normalizeInviteCode` / `formatInviteCode` con tests.
- [ ] AC3: `FamilyRepository` llama a las RPCs/tablas correctas (specs con `queryMock`).
- [ ] AC4: `FamilyFacade`: carga familia + miembros, `isOwner`, `memberNames`, errores de unión
  distinguibles, `removeMember` recarga miembros y código, `rename`.
- [ ] AC5: Perfil: código legible con copiar/compartir; unirse pide confirmación con la vista previa;
  miembros visibles; el dueño puede quitar (con confirmación); renombrar.
- [ ] AC6: Mi Lista muestra quién marcó cada ítem cuando hay más de un miembro.
- [ ] AC7: Staging (Chromium, cuentas A y C): C ve el nombre de la familia de A antes de unirse,
  confirma y ve la lista de A; A ve a C en miembros y "C" en lo que C marca; A quita a C y el código
  cambia; el código viejo ya no sirve.
- [ ] AC8: `npm run test:ci`, `npm run lint:arch`, `ng build` en verde; índices actualizados.
