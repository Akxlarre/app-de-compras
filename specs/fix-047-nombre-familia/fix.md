> id: fix-047-nombre-familia
> refs: `docs/QA-EXPLORACION.md` Q40; conversación 2026-10-01 ("q40").
> status: in_progress
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
- Staging: una cuenta nueva ve "Familia de <nombre>" en Perfil y el diálogo de unirse lo muestra;
  la familia de test4 (que era "Mi Familia") quedó renombrada.
