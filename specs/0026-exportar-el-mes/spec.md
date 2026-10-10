> id: 0026-exportar-el-mes
> refs: `docs/RECORRIDO-UX.md` §2 Compras (Y3). Orden acordado en la spec 0021.
> status: done (2026-10-10; decisiones tomadas por Claude a pedido del dueño: "continúa hasta
> terminar todas las spec")
> created: 2026-10-10

## Problema
El gasto del mes se ve en la pestaña Compras, pero no se puede sacar de la app para llevarlo al
presupuesto familiar (una planilla de Excel o Google Sheets).

## Decisiones
- **D1. Dónde**: un botón "Exportar" en la tarjeta del gasto del mes de Compras. Exporta el mes que
  se está mirando y solo aparece si ese mes tiene compras.
- **D2. Qué trae**: una fila por producto comprado, y una por cada cargo de la boleta (bolsa,
  descuento…). Columnas: Fecha; Compra; Tienda; Producto; Cantidad; Precio unitario; Subtotal;
  Total de la compra.
  - "Total de la compra" (lo pagado, como en la app) va solo en la primera fila de cada compra: así
    sumar esa columna da el gasto del mes que muestra la app, y sumar "Subtotal" da el detalle.
  - Una compra sin productos igual tiene su fila, con el total.
- **D3. Formato**: CSV para planillas en español: separador `;`, decimales con coma ("1,5"),
  montos sin puntos ni "$", UTF-8 con BOM (para que Excel lea las tildes) y fechas `AAAA-MM-DD`.
  Nombre del archivo: `compras-AAAA-MM.csv`.
- **D4. Cómo sale**:
  - en el teléfono, se abre con una app de planillas (Android pregunta cuál: Sheets, Excel, Drive…),
    y desde ahí se guarda o se comparte. Usa lo que la APK ya trae (`Filesystem` + `FileOpener`),
    así funciona sin instalar una versión nueva;
  - en el navegador, se descarga.
  - Si no se pudo (por ejemplo, no hay ninguna app que abra planillas), un aviso lo dice.

## Fuera de alcance
- Exportar varios meses o un rango de fechas.
- Otros formatos (Excel nativo, PDF).
- El menú de compartir de Android: necesita el plugin `@capacitor/share`, y el guard de seguridad no
  deja instalar dependencias sin el dueño. Se puede sumar después.

## Criterios de aceptación
- [x] AC1. "Exportar" aparece en la tarjeta del mes solo si el mes tiene compras.
- [x] AC2. El CSV trae una fila por producto y por cargo, con las columnas de D2, y el total de la
  compra solo en su primera fila (la suma da el gasto del mes).
- [x] AC3. El formato sigue D3: `;`, decimales con coma, BOM y comillas donde hace falta.
- [x] AC4. En el navegador se descarga `compras-AAAA-MM.csv`; en el teléfono se abre con una app de planillas (D4).
- [x] AC5. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC6. Verificado en staging a 375×667 con `test5`: el archivo descargado se abre y suma bien.

## Cierre (2026-10-10)
- AC5: 823 tests, `lint:arch` sin errores y `ng build` sin avisos.
- AC6, en staging a 375×667 con `test5`:
  - "Exportar octubre a planilla" aparece bajo el gráfico; en un mes sin compras no está;
  - se descargó `compras-2026-10.csv` con BOM, 46 filas y las 8 columnas;
  - la columna "Total de la compra" suma $122.760, igual que la app.
- La columna "Subtotal" suma menos ($99.960): son los productos y cargos guardados de la compra
  (los mismos que lista su detalle en la app), y el total es lo pagado según las tres boletas.
- En el teléfono el camino nativo (`Filesystem` + `FileOpener`) está probado con tests; no se pudo
  probar en un Android real desde aquí.
