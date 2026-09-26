> id: 0006-familia
> refs: Auditoría de flujos (2026-09-25), punto 3 del plan: familia
> status: done
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
- [x] AC1: Migración + pgTAP: códigos únicos de 8 caracteres del alfabeto; `preview_family` y
  `join_family_by_code` aceptan el código con guion/minúsculas; `get_family_members` solo devuelve mi
  familia y sin emails; `remove_family_member` solo para el dueño, no a sí mismo, y rota el código
  (el viejo deja de funcionar); un miembro renombra su familia pero no otra. CI de plataforma-db verde.
- [x] AC2: `normalizeInviteCode` / `formatInviteCode` con tests.
- [x] AC3: `FamilyRepository` llama a las RPCs/tablas correctas (specs con `queryMock`).
- [x] AC4: `FamilyFacade`: carga familia + miembros, `isOwner`, `memberNames`, errores de unión
  distinguibles, `removeMember` recarga miembros y código, `rename`.
- [x] AC5: Perfil: código legible con copiar/compartir; unirse pide confirmación con la vista previa;
  miembros visibles; el dueño puede quitar (con confirmación); renombrar.
- [x] AC6: Mi Lista muestra quién marcó cada ítem cuando hay más de un miembro.
- [x] AC7: Staging (Chromium, cuentas A y C): C ve el nombre de la familia de A antes de unirse,
  confirma y ve la lista de A; A ve a C en miembros y "C" en lo que C marca; A quita a C y el código
  cambia; el código viejo ya no sirve.
- [x] AC8: `npm run test:ci`, `npm run lint:arch`, `ng build` en verde; índices actualizados.

## Evidencia (2026-09-26)
- AC1: Akxlarre/plataforma-db#7 (`fe7bcb1`), CI verde (`supabase db lint` + `supabase test db`);
  21/21 también en Postgres 16 local; la migración aplicada dos veces sin error.
- AC2–AC6: `766ac84` en rojo (30 fallos) → `da7d32e` en verde. Los specs de `FamilySectionComponent`
  y `FamilyFacade` cambiaron de contrato en el verde: ARCH-02 no deja inyectar `ToastService` en un
  componente, así que los avisos de quitar/renombrar pasaron al facade y los errores de unirse se
  muestran junto al campo.
- AC8: `test:ci` 266/266, `lint:arch` 0 errores (2 avisos previos), `ng build` OK; índices
  (FACADES, MODELS, USAGE-MAP, DATABASE, REPOSITORIES, DOMAIN_DICTIONARY).
- AC7: staging (Chromium 390×844, cuentas A y C, `scratchpad/verify-0006.mjs`), 12/12 y ningún HTTP
  ≥ 400: A ve `H5P6-KGF2`; C escribe el código en minúsculas y ve «¿Unirte a «Mi Familia»?» con
  "Tiene 2 miembros. Eres el único miembro…"; confirma y vuelve a Mi Lista; agrega "Arroz" del
  catálogo de A y lo marca; A ve "Usuario C" en miembros y bajo "Arroz"; A quita a C, el código pasa
  a `XG66-K4DN` y el viejo da "No hay ninguna familia con ese código". Capturas
  `.claude/temp/audit/v6-*.png`.
  La verificación destapó dos bugs, corregidos con test primero:
  - `findMine()` no filtraba por usuario: RLS deja ver las membresías de toda la familia y un
    miembro recibía el rol del dueño (veía botones para quitar). Ahora filtra por la sesión.
  - Quien es quitado queda sin familia y Perfil no mostraba la sección (ni el campo para unirse):
    `loadMyFamily()` primero llama a `get_or_create_family`, como el resto de la app.
  - Además, ingresar el código de la propia familia avisa "Ya estás en esa familia" sin abrir la
    confirmación. `test:ci` 270/270, `lint:arch` 0 errores, `ng build` OK.
