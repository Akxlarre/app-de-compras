> id: 0009-boleta-historial-gasto-real
> refs: Punto 4 del plan (boletas/OCR). Conversación de diseño 2026-09-28. Depende de 0008.
> status: done
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
- **Historial → compra estimada → "Agregar boleta" o "Ingresar total":** el mismo "sin boleta" de 0008
  sobre una compra ya cerrada.
- **(Opcional) Precio al marcar:** al tachar un ítem en el súper o la feria se puede anotar su precio;
  al cerrar "sin boleta" ya viene cargado.
- La pestaña Boletas deja de ser una isla. Pasa a ser un acceso rápido a "escanear" más la lista de
  compras con boleta.

## Acceptance Criteria
- [x] AC1: "Agregar boleta" en una compra completada sin boleta; una compra con boleta no lo ofrece.
  - Evidencia: `history.page.spec.ts` (`canAddReceipt`, `addReceipt` → cierre `completed`),
    `purchase-close.facade.spec.ts` ("Agregar boleta" usa `attach_receipt`) y pgTAP
    `shop_receipts_history` (`receipt_exists`, `list_not_completed`).
- [x] AC2: Una boleta sin lista crea una compra completada con sus líneas conciliadas.
  - Evidencia: facade "compra sin lista" (concilia con catálogo y alias, lo nuevo al catálogo por
    defecto, `create_receipt_purchase`); pgTAP: compra `completed` con su total, líneas, fecha de la
    boleta y sin duplicar productos conocidos. Entradas: Historial → "Registrar una compra sin
    lista", pestaña Boletas sin nada marcado y "Es otra compra".
- [x] AC3: El Historial y el gasto del mes usan `total_paid` cuando existe (boleta o manual) e indican
  cuántas compras son estimadas.
  - Evidencia: `purchase-history.utils.spec.ts` (total real, 0 es real, `estimatedCount`) y
    `purchase-history.facade.spec.ts`; el Historial etiqueta cada compra (Boleta / Total ingresado /
    Estimado) y el mes dice "N estimadas". "Ingresar total" usa `set_purchase_total` (pgTAP).
- [x] AC4: La foto se ve solo con acceso de la familia (el bucket es privado y se usan URLs firmadas).
  - Evidencia: `getSignedUrl` (1 hora) solo al tocar "Ver boleta"; si falla se avisa en vez de una
    imagen rota. El bucket `receipts` es privado con policies por carpeta de familia (0008, pgTAP).
- [~] AC5: Staging: escanear desde el Historial y una compra no planificada; los totales cuadran.
  - Diferido a producción, igual que 0008 AC7: se verifica con las primeras compras reales.
- [x] AC6: `test:ci` (402), `lint:arch` (0 errores; advertencias de tamaño en
  `purchase-close.facade.ts`) y `ng build` en verde; índices actualizados.

> "Precio al marcar" (opcional) queda fuera de esta entrega, como dice el plan.
