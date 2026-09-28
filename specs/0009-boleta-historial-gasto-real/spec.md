> id: 0009-boleta-historial-gasto-real
> refs: Punto 4 del plan (boletas/OCR). Conversación de diseño 2026-09-28. Depende de 0008.
> status: draft
> created: 2026-09-28

## Problema
0008 cubre la boleta al finalizar la compra. Quedan fuera tres casos:
1. Escanear **después**, cuando la compra ya se finalizó sin boleta.
2. Una compra **no planificada**, hecha sin lista.
3. El Historial y el gasto del mes siguen usando precios estimados aunque exista la boleta.

## Solución
- **Historial → compra → "Agregar boleta":** hace la misma conciliación de 0008 sobre una compra
  `completed` que todavía no tiene boleta.
- **Boletas → "Escanear" sin lista activa, o "Es otra compra":** crea una compra `completed` desde la
  boleta. Cada línea se concilia contra el catálogo y los alias (no hay lista contra la cual cruzar).
  Se mantiene la regla: toda boleta = una compra.
- **Gasto real:**
  - cada compra del Historial muestra el total de su boleta, y el estimado solo si no tiene boleta;
  - el gasto del mes suma los totales reales y marca cuántas compras son estimadas;
  - se puede ver la foto de la boleta desde la compra.
- La pestaña Boletas deja de ser una isla. Pasa a ser un acceso rápido a "escanear" más la lista de
  compras con boleta.

## Acceptance Criteria
- [ ] AC1: "Agregar boleta" en una compra completada sin boleta; una compra con boleta no lo ofrece.
- [ ] AC2: Una boleta sin lista crea una compra completada con sus líneas conciliadas.
- [ ] AC3: El Historial y el gasto del mes usan el total real cuando existe e indican lo estimado.
- [ ] AC4: La foto se ve solo con acceso de la familia (el bucket es privado y se usan URLs firmadas).
- [ ] AC5: Staging: escanear desde el Historial y una compra no planificada; los totales cuadran.
- [ ] AC6: `test:ci`, `lint:arch` y `ng build` en verde; índices actualizados.
