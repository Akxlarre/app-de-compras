> id: 0014-sugerencias-reposicion
> refs: Conversación 2026-09-30 (decisiones: "Mi Lista", "Aprender del historial", "Posponer para
> la familia"). Antecedentes: 0004 (generateSmartList), 0005 (`needsRestock`).
> status: approved
> created: 2026-09-30

## Problema
Las sugerencias de reposición existen pero casi nadie las ve y aciertan poco:

1. **Están escondidas.** Solo aparecen como un banner en Catálogo ("Generar lista"), no donde se
   arma la compra (Mi Lista).
2. **Regla fija de 7 días.** `estimated_duration_days` nunca se llena, así que todo lo comprado
   hace una semana se sugiere: el aceite o el detergente aparecen cada semana.
3. **No se pueden descartar.** Si todavía queda, la sugerencia sigue ahí hasta que se compre.

## Decisiones (del dueño)
- Las sugerencias viven en **Mi Lista**; el banner del Catálogo se quita (un solo lugar).
- **Aprender del historial:** con 2 o más compras de un producto, su intervalo es la mediana de
  días entre compras; con una sola, 7 días (o `estimated_duration_days` si algún día se llena).
- **"Todavía tengo" pospone para toda la familia** hasta que vuelva a tocar (un intervalo más).

## Solución
- **BD (plataforma-db, migración nueva):**
  - `shop.products.restock_snoozed_until timestamptz` (null = no pospuesto). Lo escribe la app
    con un UPDATE normal (RLS de `products` ya limita a la familia).
  - RPC `shop.restock_stats()` (SECURITY INVOKER): por producto de mis familias, `purchase_count`
    (días distintos en que se compró, de compras `completed` con el ítem marcado),
    `median_interval_days` (mediana de días entre esas compras; null con menos de 2) y
    `last_purchased_at`.
- **App:**
  - Util pura `restockSuggestions(products, stats, inListIds, now)`: intervalo = mediana (≥2
    compras) o `estimated_duration_days` o 7; toca si pasaron ≥ intervalo días desde la última
    compra, no está pospuesto, no está en la lista activa y se compró alguna vez. Orden: el más
    atrasado primero. Devuelve también "hace N días" y "cada ~N días".
  - `RestockFacade` (BaseFacade, SWR): productos + `restock_stats`; `snooze(productId)` optimista
    (hasta hoy + intervalo) con rollback.
  - Mi Lista: franja "Te puede faltar" arriba de los productos (y en la lista vacía), hasta 5
    visibles + "Ver N más"; cada una con `+` (agrega 1) y "Todavía tengo" (pospone). "Agregar
    todas" agrega las visibles de una vez (`ShoppingListFacade.addProducts`). Sin sugerencias,
    la franja no aparece.
  - Catálogo: se quita el banner y `ProductsFacade.recommendedProducts` / `generateSmartList`.

## Fuera de alcance
- Editar la duración a mano por producto (la columna existe; spec aparte si hace falta).
- Notificaciones push de "te falta X".
- Sugerir productos que nunca se compraron.

## Acceptance Criteria
- [ ] AC1: `restock_stats()` devuelve, para mis productos, compras (días distintos), mediana de
  intervalo (null con <2) y última compra; otra familia no ve los míos (pgTAP).
- [ ] AC2: `restock_snoozed_until` existe y un miembro puede fijarlo en productos de su familia,
  no en los de otra (pgTAP).
- [ ] AC3: `restockSuggestions` usa la mediana con 2+ compras, 7 días (o la duración estimada) con
  una sola; excluye pospuestos, los que ya están en la lista y los nunca comprados; ordena por
  atraso (tests).
- [ ] AC4: Mi Lista muestra "Te puede faltar" con lo que toca reponer (con "hace N días"); `+`
  agrega el producto y desaparece de la franja; "Agregar todas" agrega las visibles.
- [ ] AC5: "Todavía tengo" la saca de la franja para **los dos** miembros (test3 y test4) y vuelve
  cuando pasa otro intervalo; si falla, vuelve a aparecer con aviso.
- [ ] AC6: Catálogo sin banner de "Generar lista"; nada queda usando `generateSmartList`.
- [ ] AC7: `test:ci`, `lint:arch` (0 errores) y `ng build` en verde; pgTAP en CI de plataforma-db;
  índices (DATABASE, REPOSITORIES, FACADES) actualizados; verificado en staging con test3/test4.
