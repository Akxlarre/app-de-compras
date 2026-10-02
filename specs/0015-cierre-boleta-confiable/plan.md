> spec: 0015-cierre-boleta-confiable
> status: draft — se aprueba junto con la spec (decisiones D1–D4)
> created: 2026-10-02

# Plan

Escrito para que otra sesión, sin el contexto de la conversación, pueda ejecutarlo. Antes de
empezar: lee `spec.md`, `docs/RECORRIDO-UX.md` §2 y los índices (`indices/DATABASE.md`,
`FACADES.md`, `SERVICES.md`). El esquema de la BD **no vive en este repo**: las migraciones van en
el repo `plataforma-db` (ver `docs/PENDIENTES.md` para cómo se despliegan). Este repo solo tiene
`supabase/functions/` (Edge Function `process-receipt`).

## Mapa del flujo actual (para no buscarlo)

```
purchase-close.page (features/shopping/purchase-close/)
  └─ PurchaseCloseFacade (core/facades/purchase-close.facade.ts)
       scan(files)            → ReceiptsRepository.extractReceipt (Edge Function process-receipt)
                              → validateReceipt()        core/utils/receipt.utils.ts
                              → reconcileReceipt()       core/utils/reconcile.utils.ts  (AUTO_MATCH 0.6, MIN_CANDIDATE 0.4)
                              → initialDecisions()       core/utils/purchase-close.utils.ts
                              → missing = [{item, bought: true}]        ← B4
       confirmReceipt()       → buildApplyReceipt()      core/utils/purchase-close.utils.ts  ← B3 (descarta líneas)
                              → ReceiptsRepository.applyReceipt | attachReceipt | createReceiptPurchase
                                 (RPCs shop.apply_receipt / attach_receipt / create_receipt_purchase)
```

- `scan()` solo pasa `checkedItems()` a `reconcileReceipt` ← B2.
- `OcrReceiptLine.kind`: `product | discount | bag | deposit | other` (`core/models/receipt.model.ts`).
  `validateReceipt` ya distingue los tipos; `initialDecisions` solo crea decisiones para `product`.
- Historial: `features/shopping/history/history.page.ts`; los ítems de una compra salen de
  `ShoppingListsRepository` (`list_items` + `products`).

## Tareas (en orden; cada una con su test primero)

### T1. Util: cruce con pendientes y nombres contenidos (B2 · AC1, AC3, AC4)
- `reconcile.utils.ts`:
  - `reconcileReceipt(lines, checked, catalog, aliases, pending = [])`: los `pending` entran como
    candidatos de ítem con `wasPending: true`. Un marcado gana a un pendiente con el mismo puntaje.
    Un pendiente que no sale **no** va a `missing` (solo los marcados).
  - `similarity`: si todos los tokens de un nombre corto (≥1 token de ≥3 letras) están en la línea,
    puntaje mínimo `MIN_CANDIDATE` (candidato, no auto-match). No cambiar `AUTO_MATCH`.
- `receipt.model.ts`: `wasPending?: boolean` en el target `item` (o en `LineDecision`).
- Tests en `reconcile.utils.spec.ts`: "Arroz" ↔ "ARROZ G1 GRANO LARGO 1KG" es candidato; pendiente
  sale como ítem con `wasPending`; empate marcado/pendiente → marcado; pendiente ausente no está en
  `missing`.

### T2. Facade: pasar pendientes y "¿No lo compraste?" sin elegir (B2, B4 · AC1, AC9)
- `PurchaseCloseFacade.scan()`: pasar también los ítems no marcados como `pending`.
- `MissingDecision.bought: boolean | null`; `scan()` arma `bought: null`.
- `canConfirm` exige además que ningún `missing` tenga `bought === null`.
- Tests en `purchase-close.facade.spec.ts`.

### T3. Util: armar todas las líneas (B3/G2, B4, B5 · AC5, AC10, AC12)
- `buildApplyReceipt()` agrega `lines: ReceiptLineInput[]` con **todas** las líneas de `receipt.lines`
  en orden: `{ index, rawText, kind, quantity, unitPrice, amount, productId | null, itemId | null }`.
  Productos con su decisión; `bag/discount/deposit/other` sin producto. Descuentos con monto negativo.
- Ítems con `wasPending` van en `items` igual que los marcados (la RPC los marca comprados).
- `missing` con `bought: false` → `{ item_id, checked: false }` (ya existe); con `bought: true` → se
  queda marcado y **sin** precio (no tocar `last_price`).
- `purchasedAt`: fecha **y hora** de la boleta (`receipt.date` + `receipt.time` si el OCR la trae;
  revisar `OcrReceipt`). Validar: no futura, no más de 365 días → si no, `null`.
- Tests en `purchase-close.utils.spec.ts`.

### T4. BD en `plataforma-db` (B2, B3/G2, B5 · AC2, AC5, AC11) — según D1
- Tabla `shop.purchase_lines`: `id`, `list_id` → `shopping_lists` (on delete cascade), `receipt_id`
  → `receipts` (cascade), `line_index int`, `raw_text text`, `kind text check (...)`,
  `quantity numeric`, `unit_price int`, `amount int`, `product_id` → `products` null (on delete set
  null), `list_item_id` → `list_items` null (on delete set null). Único `(receipt_id, line_index)`.
  RLS: ALL si la lista es de mi familia (mismo patrón que `list_items`). Índice por `list_id`.
- `apply_receipt`, `attach_receipt`, `create_receipt_purchase`: nuevo parámetro `p_lines jsonb
  default '[]'` (compatible con la app vieja) que inserta las filas; el `list_item_id`/`product_id`
  de las extras creadas se resuelve dentro de la RPC (por `line_index`).
- `apply_receipt`: los `p_items` marcan `is_checked = true` (cubre pendientes; verificar si ya lo
  hace) y actualizan `last_purchased_at`.
- `apply_receipt` / `attach_receipt`: `completed_at = coalesce(<fecha boleta válida>, now())`
  (copiar la regla de `create_receipt_purchase`). Recalcular `last_purchased_at` con esa fecha.
- `delete_purchase`: las líneas se borran en cascada (verificar).
- Actualizar `indices/DATABASE.md` (tabla + firmas de RPC).
- Desplegar a **staging** antes de T5; producción va en `docs/PENDIENTES.md`.

### T5. Repository (AC5)
- `ReceiptsRepository.applyReceipt/attachReceipt/createReceiptPurchase`: mandar `p_lines`.
- Nuevo `findPurchaseLines(listId): Promise<PurchaseLine[]>` (en `ReceiptsRepository` o
  `ShoppingListsRepository`, el que ya lee el detalle). DTO `PurchaseLine` en `core/models/`.
- Tests en `receipts.repository.spec.ts` (forma del payload).

### T6. UI del cierre (B2, B4, B6 · AC1, AC9, AC13, AC14)
- `purchase-close.page.html`:
  - En "Coinciden"/"¿Es este?": nota "estaba pendiente" si `wasPending`.
  - "¿No lo compraste?": reemplazar el checkbox por dos botones "No lo compré" / "Lo compré"
    (estilo de los chips de candidatos). Aviso cuando falta elegir.
  - Sección "Otros cargos" (solo lectura) con las líneas no-producto y su monto.
  - Resumen: "Productos $X · Otros $Y · Total $Z" (computed en el facade o util pura).
- Respetar `.claude/rules/` (sin `*ngIf`, tokens de color, `pb-chrome` ya está).
- Tests en `purchase-close.page.spec.ts` (agrupación, aviso, totales).

### T7. Detalle en el Historial (B3 · AC6, AC7, AC8)
- Si la compra tiene `purchase_lines`, el detalle se arma desde ellas (productos con nombre del
  catálogo o texto de boleta; otros cargos aparte). Si no tiene (sin boleta o compra antigua), igual
  que hoy.
- El conteo "N productos" cuenta las líneas `product`.
- Tests en el facade/page del Historial.

### T8. Cierre
- `npm run test:ci`, `npm run lint:arch`, `ng build`.
- Staging 375×667 con la boleta de AC16; anotar resultados en `spec.md` (como en fix-048).
- Actualizar `indices/` (`/sync-indices`), marcar B2–B6/G2 como resueltos en `docs/RECORRIDO-UX.md`.
- Commits por tarea (Conventional Commits, scope `cierre-boleta`).

## Riesgos
- **Cambio de firma de RPCs:** usar `p_lines default '[]'` para que la app instalada siga
  funcionando hasta actualizarse.
- **Falsos candidatos** con la regla de contención (p. ej. "Pan" en "PANTALLA"): comparar tokens
  enteros, no substrings, y nunca auto-asignar por contención.
- **Fecha/hora del OCR:** si el OCR no trae la hora, usar mediodía local para que el día no cambie
  por zona horaria.
