# COMPONENTS

> Sección auto-generada por `npm run indices:sync`. No editar entre marcadores.

<!-- AUTO-GENERATED:BEGIN -->
| Selector | Inputs | Outputs | Archivo |
|----------|--------|---------|---------|
| `app-alert-card` | `severity`, `title`, `actionLabel`, `dismissible` | `action`, `dismissed` | `src/app/shared/components/alert-card/alert-card.component.ts` |
| `app-header` | `title`, `showStreak`, `showBack` | `backClicked` | `src/app/shared/components/app-header/app-header.component.ts` |
| `app-update-modal` | `visible`, `updateInfo`, `isDownloading`, `downloadProgress`, `error` | `startUpdate`, `dismiss` | `src/app/shared/components/app-update-modal/app-update-modal.component.ts` |
| `app-confirm-modal` | — | — | `src/app/shared/components/confirm-modal/confirm-modal.component.ts` |
| `app-drawer` | `isOpen`, `title`, `icon`, `hasFooter`, `noPadding` | `closed` | `src/app/shared/components/drawer/drawer.component.ts` |
| `app-empty-state` | `message`, `subtitle`, `icon`, `actionLabel`, `actionIcon`, `actionVariant` | `action` | `src/app/shared/components/empty-state/empty-state.component.ts` |
| `app-error-state` | `title`, `message`, `retryLabel` | `retry` | `src/app/shared/components/error-state/error-state.component.ts` |
| `app-icon` | `name`, `size`, `color`, `ariaHidden`, `ariaLabel` | — | `src/app/shared/components/icon/icon.component.ts` |
| `app-kpi-card` | `value`, `label`, `suffix`, `prefix`, `trend`, `trendLabel`, `accent`, `icon`, `size`, `color` | — | `src/app/shared/components/kpi-card/kpi-card.component.ts` |
| `app-modal` | `isOpen`, `title`, `dismissible`, `showCloseButton` | `closed` | `src/app/shared/components/modal/modal.component.ts` |
| `app-skeleton-block` | `variant`, `width`, `height` | — | `src/app/shared/components/skeleton-block/skeleton-block.component.ts` |

<!-- AUTO-GENERATED:END -->

## Componentes y páginas de features (manual)

| Selector / clase | Inputs | Outputs | Archivo |
|---|---|---|---|
| `app-receipt-picker` (`ReceiptPickerComponent`) | — (`open()` muestra "Tomar foto / Elegir de la galería") | `picked: File[]` (solo imágenes, máx. 5) | `src/app/features/shopping/purchase-close/receipt-picker.component.ts` — spec 0016 D5; lo usan Compras y el cierre |
| `app-purchases-page` (`PurchasesPage`) | — | — | `src/app/features/shopping/purchases/purchases.page.ts` — pestaña Compras `/app/purchases` (spec 0016): gasto por mes, compras del mes, "Escanear boleta". Exporta `purchaseRow()` |
| `app-purchase-detail-page` (`PurchaseDetailPage`) | — (`:id` de la ruta) | — | `src/app/features/shopping/purchases/purchase-detail.page.ts` — `/app/purchases/:id`: fotos, líneas, cargos, menú ⋯ |
| `app-purchase-close-page` (`PurchaseClosePage`) | — | — | `src/app/features/shopping/purchase-close/purchase-close.page.ts` — `/app/close` a pantalla completa; visibilidad con `ionViewWillEnter/WillLeave` (la página queda en caché) |
| `app-product-sheet-page` (`ProductSheetPage`) | — (`:id` de la ruta) | — | `src/app/features/shopping/products/product-sheet.page.ts` — `/app/products/:id` (spec 0017): precio, cada cuánto, compras, textos de boleta; agregar a la lista, renombrar, juntar, archivar/borrar |
| `app-products-page` (`ProductsPage`) | — | — | `src/app/features/shopping/products/products.page.ts` — Catálogo (spec 0017): buscador, "Crear «texto»", Activos/Archivados; la fila abre la ficha |
