> spec: 0022-catalogo-orden-y-filtros
> status: done
> created: 2026-10-10

# Plan
Sin cambios de BD.

## T1. Utils (test primero) — AC1, AC2
- `core/utils/catalog.utils.ts`:
  - `CatalogOrder = 'name' | 'most' | 'oldest'`;
  - `sortCatalog(products, order, counts)`;
  - `filterCatalog(products, { query, aisle, noPrice })`.

## T2. Facade — AC1–AC3
- `ProductsFacade`:
  - `order`, `aisle` (null = todos) y `noPrice`;
  - `counts` (Map productId → compras) desde `findRestockStats`, pedido junto con los productos;
  - `filtered` aplica `filterCatalog` + `sortCatalog`;
  - `hasFilters` y `clearFilters()`.
- El orden y los filtros solo aplican en Activos.

## T3. UI — AC1–AC3
- Bajo el buscador, una fila de chips: "Orden: A–Z ▾", "Pasillo: Todos ▾" (los dos abren un action
  sheet) y "Sin precio" (se activa al tocarlo).
- Si no queda nada: "Nada con estos filtros" y "Quitar filtros".

## T4. Verificación — AC4, AC5
- `test:ci`, `lint:arch`, `ng build`; staging con `test5`; índices.
