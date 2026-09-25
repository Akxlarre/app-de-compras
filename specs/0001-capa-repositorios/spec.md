> id: 0001-capa-repositorios
> status: done
> created: 2026-09-25

# Capa de Repositories + guardia arquitectónica

## Problema
`.claude/rules/architecture.md` exige `UI → Facade → Repository → SupabaseService`, pero:
- 42 llamadas a `supabase.client` viven en 7 facades, `AppUpdateService` y una página
  (`reset-password.page.ts`, que además nunca cancela su `onAuthStateChange`).
- La resolución de "mi familia" está triplicada (`ShoppingListFacade`, `ProductsFacade`,
  `ReceiptScannerFacade`), dos de ellas con `family_members … limit(1)`.
- `ProfilesRepository` existe pero nadie lo usa y consulta columnas inexistentes.
- **Nada lo impide**: `architect.js` (protegido) solo detecta imports de `@supabase/supabase-js` en UI.

## Objetivo
1. Toda query/RPC/Edge Function/Storage/Realtime pasa por `core/repositories/`.
2. Una prueba de arquitectura en `test:ci` (que corre en CI) impide que vuelva a pasar.

## Fuera de alcance
- Migrar `FamilyFacade`/`ProductsFacade`/`ProductSearchFacade`/`ReceiptScannerFacade` a `BaseFacade`
  (cambia su API pública y los templates). Track aparte.
- Cambios de UI o de esquema.

## Acceptance Criteria
- [x] AC1: `src/app/architecture.spec.ts` falla si:
  - (a) se usa `.client` de `SupabaseService` fuera de `core/repositories/**` o `supabase.service.ts`;
  - (b) `features/`, `shared/` o `layout/` importan `SupabaseService` o un Repository;
  - (c) un facade distinto de `AuthFacade` importa `SupabaseService`;
  - (d) se importa `@supabase/supabase-js` fuera de `core/repositories/`, `core/services/infrastructure/` o `core/models/`;
  - (e) un facade importa otro facade (salvo `BaseFacade`) — regla de `facades.md`. Hoy lo violan
    `ProductsFacade` y `ReceiptScannerFacade` (inyectan `ShoppingListFacade`; el segundo sin usarlo).
- [x] AC2: La prueba estaba en rojo antes del refactor y queda en verde después.
- [x] AC3: Repositories con un método por operación, tipados, que lanzan en error:
  `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository`, `ProductsRepository`,
  `ReceiptsRepository`, `AppUpdatesRepository`, `ProfilesRepository` (corregido a `id, email, role_id`).
- [x] AC4: La familia se resuelve en un solo lugar (`FamilyRepository.getOrCreateFamilyId()` → RPC).
- [x] AC5: `reset-password.page.ts` no toca Supabase; usa `AuthFacade.onPasswordRecovery()` y
  cancela la suscripción al destruirse.
- [x] AC6: API pública de los facades sin cambios (templates intactos salvo `reset-password`).
- [x] AC7: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.
- [x] AC8: `architecture.md` e `indices/` documentan la capa y la guardia.

## Evidencia (2026-09-25)
- AC1/AC2: `architecture.spec.ts` en rojo en f668df8 (9 violaciones), 6/6 verde tras el refactor.
- AC3: 7 repositories con 41 tests (`src/app/core/repositories/*.spec.ts`).
- AC4: `FamilyRepository.getOrCreateFamilyId()` único; sin `family_members … limit(1)` en facades.
- AC5: `reset-password.page.spec.ts` cubre PASSWORD_RECOVERY y la baja al destruir.
- AC6: sin cambios en templates salvo `reset-password` (solo su clase).
- AC7: `test:ci` verde, `lint:arch` 0 errores (avisos 4 → 2), `ng build` OK.
- AC8: `architecture.md`, `facades.md`, `swr-pattern.md`, `database.md`, `models.md`,
  skill `supabase-data-model`, `indices/REPOSITORIES.md`, `indices/DATABASE.md`.

## Pendiente para el humano (archivos de guardrails; el agente no puede modificarlos)
- **Hook ARCH-12** (`.claude/hooks/pre-write-guard.js`): solo detectaba `client.from(` en una
  línea; el código real encadena en varias o usa rpc/channel/functions → nunca disparaba.
  Parche listo en `arch-12-hook.patch` y tests en `arch-12-repository-boundary.test.js`:
  ```bash
  git apply specs/0001-capa-repositorios/arch-12-hook.patch
  mv specs/0001-capa-repositorios/arch-12-repository-boundary.test.js .claude/tests/
  node --test .claude/tests/arch-12-repository-boundary.test.js
  ```
  Mientras tanto `src/app/architecture.spec.ts` cubre lo mismo en `test:ci`.
- **Espejo `.agents/`** (protegido): copiar `architecture, database, facades, models, swr-pattern`
  de `.claude/rules/` a `.agents/rules/` y `.claude/skills/supabase-data-model/SKILL.md` a
  `.agents/skills/supabase-data-model/`. (`.agent/` ya quedó sincronizado.)
