> spec: 0016-pestana-compras
> status: draft (se aprueba junto con D1–D6 de la spec)
> created: 2026-10-09

# Plan

Escrito para que otra sesión, sin el contexto de la conversación, pueda ejecutarlo. Antes de
empezar: lee `spec.md`, `docs/RECORRIDO-UX.md` §6 y §4, `specs/fix-049-boletas-arreglos-rapidos/fix.md`
y los índices (`indices/FACADES.md`, `COMPONENTS.md`, `MODELS.md`). **No hay cambios de BD**: todo
sale de lo que ya trae `ShoppingListsRepository.findCompleted` (incluye `receipts` y `purchase_lines`).

## Mapa actual (para no buscarlo)

```
app.routes.ts  /app → TabsLayoutComponent
  active   → ActiveListPage        (ícono reloj → /app/history, active-list.page.ts:405)
  receipt  → PurchaseClosePage     (pestaña "Boletas"; inTab = routeConfig.path === 'receipt')
  close    → PurchaseClosePage     (desde "Finalizar", active-list.page.ts:369-370)
  history  → HistoryPage           (features/shopping/history/)
  products → ProductsPage
  profile  → ProfilePage
core/utils/tab-chrome.utils.ts   TABS = ['active','receipt','products','profile']
                                 SUB_PAGES: history → tab active; close → tab active, hideBar
layout/tabs-layout/tabs-layout.component.ts   ion-tab-button tab="receipt" "Boletas" receipt-outline
core/facades/purchase-close.facade.ts   providedIn root → el estado ya sobrevive a salir de la página
   scan()/addReceipt() → read(files, append)   (isScanning, error, decisions, parts)
core/facades/purchase-history.facade.ts   thisMonth = spendingInMonth(data)  (solo mes actual)
core/repositories/shopping-lists.repository.ts:136   findCompleted(familyId, limit = 50)
core/services/ui/toast.service.ts   action(summary, actionLabel, onAction)  (ion-toast con botón)
purchase-close.page.html:181 y :465   <input capture="environment">  → abre solo la cámara
```

## Tareas (en orden; cada una con su test primero)

### T1. Navegación: pestaña Compras (D1 · AC1, AC2)
- `tab-chrome.utils.ts`: `TABS = ['active','purchases','products','profile']`;
  `SUB_PAGES.close = { tab: 'purchases', hideBar: true }`; quitar `history`. Agregar
  `purchases/<id>` → tab `purchases` (el segmento ya resuelve, verificar con test).
- `app.routes.ts`: ruta `purchases` (nueva `PurchasesPage`, T3) y `purchases/:id` (detalle, T4);
  `receipt` y `history` → `redirectTo: 'purchases'`. `close` queda igual.
- `tabs-layout.component.ts`: `tab="purchases"`, label "Compras", ícono `bag-handle-outline`
  (registrar en `addIcons`).
- `active-list.page.*`: quitar el botón de reloj (`aria-label="Historial de compras"`) y su método.
- Tests: `tab-chrome.utils.spec.ts` (purchases, purchases/x, close → purchases + hideBar, history
  ya no existe); test de rutas que `/app/receipt` y `/app/history` redirigen.

### T2. Util: gasto por mes (D4 · AC5, AC6)
- `purchase-history.utils.ts`:
  - `spendingInMonth(purchases, month: Date)` (hoy usa `now`): total, count, estimatedCount,
    `noPriceCount` (total 0 y sin boleta).
  - `monthComparison(purchases, month)` → `{ current, previous, diff }` (diff = current − previous;
    `previous` null si no hay compras ese mes).
  - `purchasesInMonth(purchases, month)`.
  - `PurchaseSummary.storeLabel`: tiendas de sus boletas unidas con " · " (ya existe la unión, ver
    `receiptsOf`); `totalSource` gana `'none'` cuando el total es 0 y no hay boleta → la vista dice
    "Sin precios" (R3).
- `findCompleted`: subir `limit` a 200 o filtrar por fecha (`completed_at >= inicio de 12 meses
  atrás`). Elegir el filtro por fecha; el test del repo verifica el `gte`.
- `PurchaseHistoryFacade`: `month = signal(startOfMonth(now))`, `prevMonth()`, `nextMonth()`
  (no pasa del mes actual), `canGoNext`, `selected = computed(monthComparison)`,
  `visible = computed(purchasesInMonth)`. `thisMonth` se elimina (buscar usos con grep).
- Tests: `purchase-history.utils.spec.ts` (cambio de año dic→ene, mes sin compras, sin precios,
  diff positiva/negativa); `purchase-history.facade.spec.ts` (no avanza más allá del mes actual).

### T3. Página Compras (D2, D4 · AC3, AC4, AC5, AC6)
- Nueva `features/shopping/purchases/purchases.page.{ts,html,spec.ts}` (reemplaza a
  `history.page`; mover lo reutilizable y borrar `history/` al final).
- Arriba: "Gastado en <mes>" con `‹ ›` (aria-label "Mes anterior"/"Mes siguiente"), el total, "N
  compras · M estimadas" y "$X más/menos que <mes anterior>" (oculto si no hubo compras ese mes).
- Lista del mes: fila por compra con fecha corta, tienda(s) (`storeLabel`, o el nombre de la lista
  si no hay boleta), total y su origen ("Boleta" / "Estimado" / "Sin precios"). Tocar → detalle (T4).
- Botón principal "Escanear boleta" (pie fijo `sticky-above-chrome`, como fix-049) → T6
  (elige foto o galería) → `PurchaseCloseFacade`: si la lista activa tiene marcados,
  `start(active, true, 'receipt')`; si no, `startNew()`. Luego `navigateForward('/app/close')`
  y `scan(files)` (la lectura arranca en el cierre, ver T7). Se elimina "Registrar una compra sin
  lista".
- Vacío (sin ninguna compra): ícono, "Aquí verás lo que gastas", "Escanea la boleta al terminar de
  comprar" y el mismo botón (R6). Mes sin compras (pero con otras): "Sin compras en <mes>".
- Tests de página: vacío, cambio de mes, "Escanear boleta" con y sin marcados llama `start`/`startNew`.

### T4. Detalle de una compra (AC7)
- Ruta `purchases/:id` → `purchase-detail.page` (o sección expandible si queda más simple; preferir
  página por la URL y el botón atrás de Android).
- Contenido: miniaturas de boletas (tocar amplía, `ion-modal` con la imagen), líneas (de
  `purchase_lines`, ya armadas por `purchase-history.utils`), otros cargos, total.
- Acciones visibles: "Agregar boleta" (si no tiene) / "Ingresar total" (si no tiene precios).
  Menú ⋯ (`ion-action-sheet`): Renombrar, Borrar (con confirmación). Reusar los métodos que hoy
  están en `history.page.ts`.
- Tests: acciones según el estado de la compra; el menú llama renombrar/borrar.

### T5. Util: agrupar líneas repetidas (AC10)
- Nueva `core/utils/close-groups.utils.ts`:
  - `groupDecisions(decisions)` → `{ key, indexes: number[], count, decision }[]`; misma clave =
    mismo `raw_text` normalizado + mismo destino + mismo precio unitario. Editar el grupo aplica a
    todos sus `indexes`.
  - `closeSections(facade)` → contadores y totales de "Coinciden", "Otros productos", "Otros cargos"
    y `toDecide` (= `¿Es este?` abiertos + `missingUnchosen`).
- Tests: Aroca (caso 14 del eval) da menos filas que líneas; dos líneas iguales con distinto precio
  no se juntan; la decisión editada se propaga a cada índice.

### T6. Foto o galería (D5 · AC13)
- `purchase-close.page.html` (los dos inputs) y la página Compras: un `ion-action-sheet` "Tomar
  foto" / "Elegir de la galería"; dos `<input type="file" accept="image/*">`, uno con
  `capture="environment"` y otro sin `capture` (y `multiple`).
- Test: cada opción hace click en su input.

### T7. Cierre a pantalla completa y por grupos (D3 · AC8, AC9, AC11, AC12)
- `purchase-close.page.html`:
  - Sin barra siempre (`/app/close` ya tiene `hideBar`); se elimina el modo pestaña (`inTab`,
    `discard()` pasan a ser "Cancelar" = descartar y volver). Pie siempre `sticky-bottom-edge`.
  - Volver al origen: guardar `from` en el facade (`'active' | 'purchases'`) al empezar; cancelar o
    cerrar hace `navigateBack('/app/' + from)`.
  - Encabezado: "N por decidir" (de `closeSections.toDecide`).
  - "¿Es este?" y "¿No lo compraste?" abiertos; "Coinciden", "No estaban en la lista" (con Guardar
    todos/Ninguno), "Otros cargos" como `<details>`/acordeón cerrado con "nombre · cantidad · total".
  - Filas de `groupDecisions`: "Leche Soprole 1L × 2 · $2.580"; cantidad y precio como texto; tocar
    la fila abre la edición en línea (un `expanded = signal<string|null>(key)`).
  - Tienda y fecha por boleta (resumen de fix-049): tocar abre edición (input texto + `type="date"`).
    En el facade: `setReceiptMeta(index, { store, date })` que modifica `parts()[index].receipt`;
    `buildApplyReceipt`/`splitByReceipt` ya toman tienda y fecha de ahí (verificar con test).
- Tests de página: AC8 (vuelve a `from`), AC9 (contador y grupos cerrados), AC11 (no hay inputs
  hasta tocar), AC12 (la fecha editada llega a `applyReceipt`).

### T8. Lectura en segundo plano (D6 · AC14, AC15)
- El facade ya es `root`: si la página se destruye, `read()` termina igual. Agregar:
  - `previewUrl` (`URL.createObjectURL` de la primera foto; revocar en `reset`).
  - `readyNotice`: al terminar `read()`, si la ruta actual no es `/app/close` (inyectar `Router`
    en el facade o, mejor, que la página marque `visible` en `ngOnInit`/`ngOnDestroy` →
    `facade.setVisible(bool)`), llamar `toast.action('Tu boleta está lista', 'Ver', () =>
    nav.navigateForward('/app/close'))`. Si falló, `toast.action('No pudimos leer la boleta',
    'Ver', …)`.
  - `ngOnInit` de la página **no** reinicia el cierre si `isScanning()` o ya hay resultado sin
    cerrar (hoy `start`/`startNew` en `ngOnInit` borraría la lectura).
- Plantilla mientras lee: miniatura, "Leyendo la boleta (puede tardar un minuto)" y "Puedes seguir
  usando la app" con un botón "Seguir en la app" → vuelve al origen sin cancelar.
- Tests: facade avisa solo si no está visible; volver a la página no reinicia la lectura.

### T9. Limpieza, índices y verificación (AC16, AC17)
- Borrar `features/shopping/history/` y cualquier referencia a `/app/history`, `/app/receipt`,
  "Boletas", "Historial" (grep en `src/` y `e2e/` si existe).
- `/sync-indices`: COMPONENTS (PurchasesPage, PurchaseDetailPage), FACADES (PurchaseHistoryFacade
  con mes, PurchaseCloseFacade from/visible/setReceiptMeta), utils nuevos.
- `docs/RECORRIDO-UX.md` §6: marcar N1–N4, R1–R7, G1, G3, G4 como resueltos.
- `npm run test:ci`, `npm run lint:arch`, `ng build`.
- Staging 375×667 (`npx ng serve --configuration staging --port 4300`, cuenta de prueba; OCR
  simulado con `page.route` y los casos 12–15 del eval porque el proxy corta a los 30 s):
  - barra con 4 pestañas; `/app/history` → Compras;
  - meses con flechas y diferencia;
  - cierre con Aroca: contar pantallas con los grupos cerrados (< 3);
  - salir mientras lee → aviso "Ver" → vuelve con el resultado;
  - galería ofrecida.
  Anotar la evidencia en `spec.md` ("Verificación en staging").

## Riesgos
- **Reinicio del cierre en `ngOnInit`** (T8): es el cambio más delicado; hoy entrar a la página
  siempre reinicia. Cubrirlo con test antes de tocar.
- **Ionic tabs y redirects**: `ion-tabs` mantiene las páginas en caché; verificar que `/app/receipt`
  en una sesión abierta (PWA ya instalada) no deje una pestaña huérfana.
- **`findCompleted`**: con 12 meses el payload crece (líneas de boleta). Si pesa, pedir las líneas
  solo en el detalle (T4) y dejar en la lista solo `receipts(store)`.
