> id: fix-047-nombre-familia
> refs: `docs/QA-EXPLORACION.md` Q40; conversación 2026-10-01 ("q40").
> status: done
> closed: 2026-10-01
> created: 2026-10-01

## Síntoma
Todas las familias se llaman "Mi Familia". Al invitar a alguien, el diálogo dice "¿Unirte a «Mi
Familia»? … eres el único miembro de «Mi Familia»" y no se sabe de quién es la familia.

## Causa raíz
`shop.get_or_create_family()` (plataforma-db, migración `20260925183000_shop_schema`) crea la
familia con el nombre fijo `'Mi Familia'`. La app solo muestra lo que devuelve la BD.

## Solución
plataforma-db#16, migración `20261001010000_shop_family_default_name`:
- `shop.default_family_name(user)`: "Familia de <nombre>" con la misma regla de nombre que
  `get_family_members` (display_name o parte local del email).
- `get_or_create_family()` lo usa al crear.
- Las familias que siguen llamándose "Mi Familia" se renombran con el nombre de su dueño más
  antiguo; las renombradas a mano no cambian.

En la app no cambia código de comportamiento: solo el comentario de `FamilyRepository` y los
índices/QA.

## ACs afectados
Ninguno de specs activas (spec 0006-familia muestra el nombre que devuelve la BD).

## Test de regresión
- pgTAP `supabase/tests/shop_family.test.sql` (plataforma-db): la familia nace como "Familia de
  Ana", `preview_family` lo muestra, y con `display_name` usa ese nombre.
- Staging: una cuenta nueva ve "Familia de <nombre>" en Perfil y el diálogo de unirse lo muestra.
- Postgres local: una familia existente "Mi Familia" pasa a "Familia de <dueño>" y una renombrada a
  mano no cambia.

## Verificación (staging, 2026-10-01)
plataforma-db#16 mergeado y desplegado (run 36793197756). pgTAP `shop_family` 23/23 en CI.
- Cuenta nueva `test5` creada desde la app: Perfil muestra "Familia de Test5"; en la BD
  `families.name = 'Familia de Test5'`.
- test3 escribe el código de test5: `preview_family` → "Familia de Test5" y el diálogo dice
  "¿Unirte a «Familia de Test5»? Tiene 1 miembro. Dejarás «Casa QA»…".
- Renombre de familias existentes: probado en Postgres local ("Mi Familia" → "Familia de Beto";
  "Los Rojas" sin cambios).
