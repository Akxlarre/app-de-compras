> spec: 0023-compras-utiles
> status: approved
> created: 2026-10-10

# Plan
BD: `shopping_lists.completed_by` en plataforma-db #21 (compartida con 0024 y 0025).

## T1. Modelos
- `ShoppingList.completed_by?: string | null`; `PurchaseSummary.completedBy: string | null`.

## T2. Utils (test primero) — AC1, AC2
- `purchase-history.utils.ts`:
  - `summarizePurchase` copia `completedBy`;
  - `purchasedProducts(list)` → `{ product_id, quantity }[]`: productos de la boleta (para eso el
    Historial pide `product:products(id, name)` en `purchase_lines`) + lo marcado que no estaba;
  - `searchPurchases(purchases, query)` → `{ purchase, match }[]`: coincide con título, nombre,
    tienda o un producto (`matchesSearch`); `match` es el producto que coincidió ("Pilas AA · 2 ×
    $3.990") o null; de la más nueva a la más vieja.

## T3. Facades — AC1, AC2
- `ShoppingListFacade.addToList(items)`: `startActive` (crea o reusa la activa) + `addMany` +
  refresco. @returns la cantidad agregada o null si falló.
- `PurchaseHistoryFacade`: `query` y `results` (computed con `searchPurchases`); `reset` lo limpia.

## T4. Páginas — AC1–AC3
- Compras: buscador arriba; con texto, lista de resultados en vez del mes (y "Sin resultados").
- Detalle de compra: "Agregar a la lista (N)" y "Cerrada por <nombre>" con
  `FamilyFacade.memberNames` si hay otros miembros.

## T5. Validar y cerrar — AC4–AC6
