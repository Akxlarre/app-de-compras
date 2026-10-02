> id: 0015-cierre-boleta-confiable
> refs: `docs/RECORRIDO-UX.md` §2 Boletas (B2–B6, G2) y orden propuesto (paso 2).
> Antecedentes: 0012 (modelo de compra), 0013 (pulido), fix-048 (B1, ya resuelto).
> status: draft — falta que el dueño confirme las decisiones D1–D4
> created: 2026-10-02

## Problema
Cerrar una compra con boleta deja datos equivocados. Todo lo que viene después (gasto, precios,
"Te puede faltar", ficha de producto) se apoya en esos datos, así que hay que arreglarlo primero.

Caso real (staging, cuenta `test5`, boleta del 30/09 18:42 cerrada el 1/10, total $9.288):

| # | Qué pasa | Por qué |
|---|---|---|
| **B2** | Arroz estaba **pendiente** en la lista y salió en la boleta como "Arroz G1 grano largo 1kg". La app lo mostró en "No estaban en la lista", sin ofrecer el Arroz de la lista. Al cerrar, Arroz **siguió pendiente** en la lista nueva y su `last_purchased_at` no cambió. | `PurchaseCloseFacade.scan()` pasa a `reconcileReceipt()` solo `checkedItems()`. Además `similarity("Arroz", "Arroz G1 grano largo 1kg")` no llega a `MIN_CANDIDATE` (0.4) contra el catálogo: un nombre corto contenido en una línea larga no cuenta. |
| **B3 / G2** | El Historial dice "4 productos" y el detalle suma $8.098 de $9.288: Arroz, Coca-Cola y la bolsa no aparecen. En una compra sin lista sin guardar nada, el detalle queda vacío. | `buildApplyReceipt()` solo manda a la BD las líneas con ítem, producto conocido o "Guardar en catálogo". El resto solo vive en `receipts.ocr_result` y no se muestra. |
| **B4** | Huevos estaba marcado y no salió en la boleta; quedó comprado a $1.890 (precio anterior). | `scan()` arma `missing` con `bought: true` por defecto. |
| **B5** | La compra dice "jue 1 oct" y el gasto cae en octubre. | `apply_receipt` / `attach_receipt` dejan `completed_at = now()`. `create_receipt_purchase` sí usa la fecha de la boleta. |
| **B6** | "$9.288 · Suma de las líneas $9.088" sin explicación. | La bolsa ($200) se lee (`kind: 'bag'`) pero no se muestra en ninguna parte. Lo mismo pasa con descuentos y envases. |

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. Dónde se guardan todas las líneas (G2).** Recomendado: tabla nueva
  `shop.purchase_lines` (una fila por línea de la boleta, con o sin producto). Así el detalle y el
  gasto por producto/tienda se pueden consultar con SQL. Alternativa más barata: leer las líneas
  desde `receipts.ocr_result` + `ocr_check` en la app (sin migración, pero no se puede consultar ni
  sumar desde la BD).
- **D2. Pendientes que aparecen en la boleta (B2).** Recomendado: se cruzan igual que lo marcado y
  salen en "Coinciden" con la nota "estaba pendiente". Al cerrar quedan comprados (no pasan a la
  próxima lista).
- **D3. "¿No lo compraste?" (B4).** Recomendado: no viene nada elegido. Cada uno tiene dos botones,
  "No lo compré" (vuelve a la próxima lista) y "Lo compré" (cuenta, sin precio de boleta). No se
  puede cerrar hasta elegir en todos.
- **D4. Fecha (B5).** Recomendado: la compra toma la fecha y hora de la boleta si es válida, no es
  futura y es del último año (misma regla que `create_receipt_purchase`). Si no, la del cierre.
  Vale también para "Agregar boleta" desde el Historial.

## Fuera de alcance
- B7 (textos de la compra sin lista) → spec "pestaña Compras".
- Editar o borrar líneas después de cerrar → spec "pestaña Compras".
- Fusionar duplicados del catálogo (K1) → spec "ficha de producto".

## Criterios de aceptación
Todos con las decisiones recomendadas; si el dueño cambia una, se ajusta el AC.

**B2 — pendientes**
- [ ] AC1. Un producto pendiente de la lista que aparece en la boleta sale en "Coinciden" (o en
  "¿Es este?" si hay duda) con la nota "estaba pendiente", no en "No estaban en la lista".
- [ ] AC2. Al cerrar, ese producto queda comprado con el precio y la cantidad de la boleta, no pasa
  a la próxima lista y su `last_purchased_at` se actualiza.
- [ ] AC3. Un nombre corto del catálogo o de la lista contenido en una línea larga se ofrece como
  candidato ("Arroz" ↔ "Arroz G1 grano largo 1kg"; "Leche" ↔ "LECHE ENT COLUN 1L").
- [ ] AC4. Lo marcado sigue teniendo prioridad: si una línea calza igual de bien con un marcado y con
  un pendiente, gana el marcado.

**B3 / G2 — todas las líneas**
- [ ] AC5. Al cerrar con boleta se guardan **todas** las líneas (productos, bolsas, descuentos,
  envases, otros), cada una con texto, tipo, cantidad, precio unitario, monto y, si tiene, el
  producto o ítem al que se asignó.
- [ ] AC6. El detalle de la compra en el Historial muestra todas las líneas guardadas. Las que no
  tienen producto se ven con su texto de boleta. La suma del detalle es igual a la suma de la
  boleta.
- [ ] AC7. Una compra sin lista en la que no se guardó nada en el catálogo muestra igual todas sus
  líneas.
- [ ] AC8. Las compras cerradas sin boleta y las anteriores a esta spec se ven igual que hoy.

**B4 — "¿No lo compraste?"**
- [ ] AC9. Nada viene elegido. "Cerrar compra" queda deshabilitado con el aviso "Elige qué pasó con
  lo que no salió en la boleta" hasta elegir en todos.
- [ ] AC10. "No lo compré" → el producto vuelve a pendiente (pasa a la próxima lista si "Pasar los
  pendientes" está activo). "Lo compré" → queda comprado sin cambiar `products.last_price`.

**B5 — fecha**
- [ ] AC11. Con fecha de boleta válida, la compra queda con esa fecha y hora (`completed_at` y
  `receipts.purchased_at`), en el cierre y en "Agregar boleta".
- [ ] AC12. Sin fecha, con fecha futura o de hace más de un año, se usa la fecha del cierre.

**B6 — otras líneas**
- [ ] AC13. Bolsas, descuentos, envases y otros cargos salen en una sección "Otros cargos" con su
  monto (los descuentos en negativo). No se pueden asignar a productos.
- [ ] AC14. El resumen muestra "Productos $X · Otros $Y · Total $Z". El aviso de "la suma no
  cuadra" solo aparece si productos + otros ≠ total.

**General**
- [ ] AC15. `npm run test:ci` y `npm run lint:arch` pasan. Hay tests de regresión para B2–B6.
- [ ] AC16. Verificado en staging (375×667) con una boleta real que tenga un pendiente, un marcado
  que no sale, una bolsa y fecha de otro día.
