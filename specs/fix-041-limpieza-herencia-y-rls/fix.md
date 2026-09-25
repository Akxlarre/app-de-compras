> id: fix-041-limpieza-herencia-y-rls
> refs: Análisis inicial del repo (sesión 2026-09-25)
> status: in-progress
> created: 2026-09-25

## Síntoma
1. `supabase db reset` falla: `supabase/seed.sql` inserta en `public.exercises`, tabla que no existe.
2. El repo arrastra código, scripts y specs de la app de entrenamiento de la que se clonó
   (utils de ejercicios, pipe de traducción, Edge Function `mcp-server` de rutinas, scripts sueltos,
   tracks 0001–0015 / fix-001–040, nombre del paquete).
3. Cualquier usuario autenticado puede insertarse en cualquier familia **con rol `owner`**
   (la política de INSERT de `family_members` solo exige `user_id = auth.uid()`).
4. Al unirse a otra familia el usuario queda en dos familias y los facades eligen una
   arbitraria con `.limit(1)`.
5. Las políticas de storage del bucket `receipts` no filtran por familia.
6. Las plantillas se guardan como `archived` + prefijo `[TEMPLATE] ` aunque la migración
   `20260925000000` ya agregó el estado `template`.

## Causa raíz
Clon desde otro proyecto sin poda + políticas RLS escritas para el camino feliz.

## Solución
- Seed vacío con comentario; borrar residuos de entrenamiento (no se tocan `.agent/`, `.agents/`, `.claude/`).
- Migración `20260925100000_family_rls_harden_membership.sql`:
  - Sin INSERT directo en `families` / `family_members` (un chequeo "familia sin miembros"
    dentro de la policy no funciona: el SELECT de RLS oculta membresías ajenas).
  - RPC `get_or_create_family()` SECURITY DEFINER: devuelve la familia o crea "Mi Familia" + owner.
  - RPC `join_family(p_family_id)` SECURITY DEFINER: valida que exista, quita las otras
    membresías del usuario y lo inserta como `member`.
  - Storage `receipts`: lectura/escritura solo bajo la carpeta `<family_id>/`.
  - Plantillas: migra `archived` + `[TEMPLATE] ` → `status = 'template'` sin prefijo.
- `FamilyFacade.joinFamily` usa la RPC; `ShoppingListFacade` usa `status = 'template'`.

## Acceptance Criteria
- [x] AC1: `supabase/seed.sql` no referencia tablas inexistentes.
- [ ] AC2: No quedan referencias a ejercicios/rutinas en `src/`, `supabase/` ni scripts raíz.
      _Pendiente: el borrado de archivos requiere permiso explícito del humano (ver lista abajo)._
- [x] AC3: Un usuario no puede insertarse en una familia existente sin pasar por `join_family`.
- [x] AC4: `join_family` deja al usuario con una sola membresía.
- [x] AC5: Storage `receipts` restringido a la carpeta de la familia.
- [x] AC6: Plantillas usan `status = 'template'`; test de facade lo cubre.
- [x] AC7: `npm run test:ci` en verde (87 passed; incluye arreglo del spec de `ActiveListPage`, que fallaba antes por falta de `ChangeDetectorRef`).

## Pendiente de borrar (AC2)
- `specs/0001…0015`, `specs/fix-001…040`, `specs/PENDIENTES-ECLIPSE.md`
- `src/app/core/utils/{exercise-detail,set-type}.utils(.spec).ts` + sus exports en `core/utils/index.ts`
- `src/app/shared/pipes/translate-exercise.pipe.ts`
- `supabase/functions/mcp-server/` (+ su paso de deploy en `.github/workflows/release.yml`), `supabase/config.toml.bak`
- Raíz: `fix*.py`, `find_*.py`, `modify_*.py`, `fix.js`, `snap.js`, `scratch_meso.sql`, `test-mcp.{ts,mjs}`
- `scripts/`: `fetch_images.js`, `fix-ionic.js`, `fix_sql.js`, `restore-ionic.js`, `seed-exercises.mjs`,
  `test-coach-poc.mjs`, `translate_instructions.js`, `list_models.js`, `test_key.js`, `temp_db`
- `.agent/temp/qa/`, `.agents/temp/qa/` (protegido por el File Protector)

## Test de regresión
`src/app/core/facades/family.facade.spec.ts` (joinFamily llama a la RPC) y
`shopping-list.facade.spec.ts` (saveAsTemplate/loadTemplates usan `status = 'template'`).
