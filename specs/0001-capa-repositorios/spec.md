> id: 0001-capa-repositorios
> status: in-progress
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
- [ ] AC1: `src/app/architecture.spec.ts` falla si:
  - (a) se usa `.client` de `SupabaseService` fuera de `core/repositories/**` o `supabase.service.ts`;
  - (b) `features/`, `shared/` o `layout/` importan `SupabaseService` o un Repository;
  - (c) un facade distinto de `AuthFacade` importa `SupabaseService`;
  - (d) se importa `@supabase/supabase-js` fuera de `core/repositories/`, `core/services/infrastructure/` o `core/models/`.
- [ ] AC2: La prueba estaba en rojo antes del refactor y queda en verde después.
- [ ] AC3: Repositories con un método por operación, tipados, que lanzan en error:
  `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository`, `ProductsRepository`,
  `ReceiptsRepository`, `AppUpdatesRepository`, `ProfilesRepository` (corregido a `id, email, role_id`).
- [ ] AC4: La familia se resuelve en un solo lugar (`FamilyRepository.getOrCreateFamilyId()` → RPC).
- [ ] AC5: `reset-password.page.ts` no toca Supabase; usa `AuthFacade.onPasswordRecovery()` y
  cancela la suscripción al destruirse.
- [ ] AC6: API pública de los facades sin cambios (templates intactos salvo `reset-password`).
- [ ] AC7: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.
- [ ] AC8: `architecture.md` e `indices/` documentan la capa y la guardia.
