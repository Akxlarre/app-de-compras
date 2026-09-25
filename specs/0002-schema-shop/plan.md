# Plan — 0002-schema-shop

## Acceso al schema
Cada repository de compras declara su punto de entrada y no usa `client.from/rpc` directo:

```ts
private get db() { return this.supabase.client.schema('shop'); }
```

`SupabaseService` no cambia (sin getter `shop`: la regla (a) solo vigila `.client`, un getter nuevo
la esquivaría).

| Repository | Schema |
|---|---|
| `FamilyRepository`, `ShoppingListsRepository`, `ListItemsRepository`, `ProductsRepository` | `shop` |
| `ProfilesRepository`, `AppUpdatesRepository` | `public` (fase `core`, más adelante) |
| `ReceiptsRepository` | — (Edge Function) |

Realtime: `watchList` usa `schema: 'shop'`.

## Tests (TDD)
- `supabaseServiceMock()` expone `shop = { from, rpc }` y `client.schema(name)` que devuelve
  `shop` solo para `'shop'` (lanza con otro nombre). Las specs de los 4 repositories aseveran
  sobre `mock.shop.*`: si un repository olvida `.schema('shop')`, `mock.shop.from` no se llama y
  el test falla.
- `architecture.spec.ts` regla (g) (ver spec AC3).

## Orden (commits)
1. `test`: mock + specs de repositories + regla (g) → rojo.
2. `refactor(repositories)`: `.schema('shop')` → verde.
3. `chore(db)`: borrar `supabase/migrations/`; docs e índices.

## Despliegue
La app nueva solo funciona cuando plataforma-db#4 está aplicado y `shop` expuesto en
Settings → API de cada proyecto. Hoy producción no tiene las tablas de compras en ningún
schema, así que no hay versión anterior que romper.
