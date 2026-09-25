> id: 0002-schema-shop
> status: in-progress
> created: 2026-09-25

# App sobre el schema `shop` (ADR-001 fase 2)

## Problema
Las tablas de compras nunca se aplicaron en producción (baseline de plataforma-db, 2026-09-25):
la app hoy falla en producción al leer `public.families`, `public.shopping_lists`, etc.
Plataforma-db#4 las crea en el schema `shop`, que es donde ADR-001 las ubica, y deja
`profiles` y `app_updates` en `public`.

Además, `supabase/migrations/` de esta app sigue existiendo: si alguien la usa con
`supabase db push`, pisa el historial compartido (ADR-001 §2).

## Objetivo
1. Los repositories de compras consultan `shop` (tablas, RPCs y Realtime).
2. Una prueba de arquitectura impide volver a consultar compras en `public` sin darse cuenta.
3. Esta app deja de tener migraciones: el esquema vive solo en plataforma-db.

## Fuera de alcance
- `profiles` y `app_updates` (siguen en `public` hasta la fase de `core`).
- Edge Function `process-receipt` (no usa tablas).
- Bucket de boletas (la app no usa storage de boletas hoy).

## Acceptance Criteria
- [ ] AC1: `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository` y
  `ProductsRepository` hacen `from`/`rpc` sobre `client.schema('shop')`; sus specs fallan si la
  consulta no pasa por `shop`.
- [ ] AC2: `ListItemsRepository.watchList` escucha `postgres_changes` con `schema: 'shop'`.
- [ ] AC3: `architecture.spec.ts` regla (g): en `core/repositories/`, solo
  `profiles.repository.ts` y `app-updates.repository.ts` pueden usar `client.from(`/`client.rpc(`
  directo o `schema: 'public'`. Estaba en rojo antes del cambio.
- [ ] AC4: `supabase/migrations/` eliminado de esta app; README, `indices/DATABASE.md` y la regla
  `database.md` apuntan a plataforma-db.
- [ ] AC5: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.
