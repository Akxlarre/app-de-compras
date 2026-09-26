# Plan — 0006-familia

## 0. Base de datos — Akxlarre/plataforma-db#7
Migración `20260926010000_shop_family_invites_members` + `shop_family.test.sql` (21 tests, verdes en
Postgres local). Falta: CI, merge → staging, exponer 4 funciones.

## 1. Modelos (`family.model.ts`)
- `FamilyInfo { id, name, inviteCode, myRole }`.
- `FamilyMemberView { userId, name, role, joinedAt, isMe }`.
- `FamilyPreview { name, memberCount }`.
- `JoinFamilyResult = 'joined' | 'invalid_code' | 'already_member' | 'error'`.

## 2. Funciones puras (`core/utils/family.utils.ts`)
- `normalizeInviteCode(input)`: mayúsculas, sin separadores; null si no son 8 caracteres del alfabeto.
- `formatInviteCode(code)`: `ABCD-EFGH`.

## 3. Repository (`FamilyRepository`)
- `findMine()`: `family_members.select('role, families(id, name, invite_code)')`.
- `preview(code)`: rpc `preview_family` → `FamilyPreview | null`.
- `joinByCode(code)`: rpc `join_family_by_code`.
- `findMembers()`: rpc `get_family_members`.
- `removeMember(userId)`: rpc `remove_family_member`.
- `rename(familyId, name)`: `families.update({ name }).eq('id', familyId)`.
- Se quita `join(familyId)` (UUID); la RPC vieja queda en la BD sin uso.

## 4. Facade (`FamilyFacade`)
- `currentFamily`, `members`, `isOwner`, `memberNames: Map<userId, name>` (el propio como "Tú"),
  `hasOtherMembers`.
- `loadMyFamily()`: familia + miembros en paralelo.
- `preview(code)`, `joinByCode(code): JoinFamilyResult` (P0002 → invalid_code, 23505 →
  already_member), `removeMember(userId): boolean` (recarga), `rename(name): boolean`.

## 5. UI
- `features/profile/family-section/family-section.component.ts` (smart local): nombre + renombrar
  (alert con input), código formateado + copiar + compartir, miembros (Tú / Dueño / quitar),
  unirse (input → preview → alert de confirmación con advertencia).
- `ProfilePage`: usa el componente; sale el bloque inline de familia.
- Mi Lista: `checkedByName(item)` desde `FamilyFacade.memberNames` cuando `hasOtherMembers`.

## 6. Orden (commits)
1. `test` rojo (utils, repository, facade, family-section, active-list).
2. `feat` verde.
3. Staging tras merge + exposición.
4. `docs` índices.
