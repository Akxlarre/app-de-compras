> id: 0005-historial-y-pendientes
> refs: Auditoría de flujos (2026-09-25), punto 2 del plan: lógica central
> status: in-progress
> created: 2026-09-25

## Problema
1. **Los pendientes se pierden al finalizar.** "Finalizar" pasa la lista a `completed` con los
   ítems sin marcar adentro; la próxima lista empieza vacía y "Repetir última compra" clona también
   lo que no se compró.
2. **No se sabe quién compró ni cuándo.** `list_items.checked_by` / `checked_at` existen pero nadie
   los llena.
3. **"Es momento de reponer" usa la fecha del último cambio de precio**, no la de la última compra.
   Editar un precio "repone" el producto; un producto que se compra cada semana sin tocar su precio
   aparece como "no lo compras hace más de una semana".
4. **No hay historial ni gasto.** Las listas `completed` no se ven en ninguna parte y el precio que
   se pagó no queda guardado (solo `products.last_price`, que cambia).

## Solución
### Base de datos (plataforma-db, migración nueva)
- `list_items.unit_price numeric(10,2)`: precio pagado, se fija al finalizar.
- `products.last_purchased_at timestamptz`: última compra finalizada que lo incluyó. Backfill desde
  las listas `completed` existentes.
- Trigger `shop.list_items_track_check` (BEFORE INSERT/UPDATE): al marcar fija `checked_at = now()` y
  `checked_by = auth.uid()`; al desmarcar los limpia; si `is_checked` no cambia conserva los valores
  (el cliente no puede falsificarlos).
- RPC `shop.complete_list(p_list_id uuid, p_carry_pending boolean) → uuid` (SECURITY INVOKER: RLS
  aplica). En una transacción: fija `unit_price` de lo comprado, actualiza `last_purchased_at`,
  pasa la lista a `completed`, y los pendientes:
  - `true` → se **mueven** a la lista activa de la familia (si hay otra) o a una nueva
    "Compra de la Semana"; si el producto ya está en esa lista, se suman las cantidades.
    Devuelve el id de esa lista.
  - `false` → se borran (la lista finalizada queda = lo que se compró). Devuelve `null`.
  Errores: `list_not_found` (no existe o es de otra familia), `list_not_active`.
- Tests pgTAP `supabase/tests/shop_purchase_history.test.sql`.
- Paso manual: exponer `complete_list` en la Data API de staging y producción.

### App
- `ShoppingListsRepository.complete(listId, carryPending)` → RPC; `findCompleted(familyId, limit)`.
- `ShoppingListFacade.completeList(listId, carryPending)`: toast de éxito; recarga la lista activa
  (la de los pendientes, si se pasaron) y "Repetir última compra".
- Mi Lista: al finalizar con pendientes se elige **Pasarlos a la próxima lista** / **Descartarlos** /
  Cancelar. Sin pendientes, confirmación simple. Botón de historial en el encabezado.
- `PurchaseHistoryFacade` + página `/app/history`: gasto del mes, compras finalizadas (nombre, fecha,
  N productos, total) con detalle desplegable (producto, cantidad, precio pagado).
- Funciones puras: `purchase-history.utils.ts` (resumen de compra, gasto del mes),
  `restock.utils.ts` (`needsRestock`), `date.utils.ts` (`daysSince`, `formatDaysAgo`).
- Catálogo: "Es momento de reponer" = comprado hace ≥ `estimated_duration_days` (7 si no hay dato);
  nunca comprado ⇒ no se recomienda. Cada producto muestra "Comprado hoy / ayer / hace N días" o
  "Sin compras aún" (arregla "Hace 1 días").

### Fuera de alcance
- Mostrar el **nombre** de quien marcó (requiere leer perfiles de otros miembros → punto 3, familia).
- Boletas/OCR (punto 4). Realtime de borrados.

## Acceptance Criteria
- [ ] AC1: Migración + pgTAP: el trigger fija/limpia `checked_at`/`checked_by` y no se puede falsificar;
  `complete_list` mueve pendientes (lista nueva o activa existente, sumando cantidades), descarta con
  `false`, fija `unit_price` y `last_purchased_at`, y rechaza listas de otra familia o no activas.
  CI de plataforma-db en verde.
- [ ] AC2: `ShoppingListsRepository.complete` llama a la RPC `complete_list` con `p_carry_pending`;
  `findCompleted` trae las listas `completed` de la familia, más recientes primero.
- [ ] AC3: `ShoppingListFacade.completeList(id, carry)`: si la RPC falla, toast de error y la lista
  sigue; si sale bien, recarga la lista activa y la última compra.
- [ ] AC4: Mi Lista ofrece pasar o descartar pendientes cuando los hay; sin pendientes, confirmación
  simple.
- [ ] AC5: `PurchaseHistoryFacade` + `purchase-history.utils`: total = Σ cantidad × `unit_price` de lo
  marcado; gasto del mes cuenta solo compras del mes en curso.
- [ ] AC6: Página Historial en `/app/history`, accesible desde Mi Lista, con estados de carga, vacío
  y error.
- [ ] AC7: Reponer por fecha de compra (`needsRestock`) y textos "Comprado hace N días" con singular
  correcto.
- [ ] AC8: Verificación en staging (Chromium): finalizar con pendientes → aparecen en la lista nueva;
  la compra aparece en Historial con su total; `checked_by` queda con el usuario.
- [ ] AC9: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde; índices actualizados.

## Tests
`restock.utils.spec.ts`, `purchase-history.utils.spec.ts`, `date.utils.spec.ts`,
`shopping-lists.repository.spec.ts`, `shopping-list.facade.spec.ts`,
`purchase-history.facade.spec.ts`, `products.facade.spec.ts`, `active-list.page.spec.ts`.
