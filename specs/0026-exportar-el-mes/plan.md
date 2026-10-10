> spec: 0026-exportar-el-mes
> status: done
> created: 2026-10-10

# Plan
Sin cambios de BD ni dependencias nuevas.

## T1. Util (test primero) — AC2, AC3
- `core/utils/purchase-export.utils.ts`:
  - `monthCsv(purchases)`: filas de D2 en orden de fecha (la más vieja primero), formato de D3;
  - `csvFileName(month)` → `compras-AAAA-MM.csv`.

## T2. Servicio de archivo — AC4
- `core/services/file-export.service.ts`, junto a `app-update.service.ts`:
  `saveCsv(fileName, content)`.
  - Nativo: `Filesystem.writeFile` en Cache (`file_paths.xml` ya expone el cache) →
    `FileOpener.open` con `text/csv`.
  - Web: Blob + `<a download>`.

## T3. Facade — AC2, AC4
- `PurchaseHistoryFacade.exportMonth()`: CSV del mes elegido; aviso si falla.
  `@returns` false si no se pudo.

## T4. Página — AC1
- Botón "Exportar" en la tarjeta del gasto del mes, solo con compras en el mes.

## T5. Validar y cerrar — AC5, AC6
- Tests, `lint:arch`, build; staging con `test5` (Playwright captura la descarga y se revisa el
  archivo); índices y RECORRIDO-UX.
