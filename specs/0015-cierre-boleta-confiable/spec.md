> id: 0015-cierre-boleta-confiable
> refs: `docs/RECORRIDO-UX.md` §2 Boletas (B2–B6, G2) y orden propuesto (paso 2).
> Antecedentes: 0012 (modelo de compra), 0013 (pulido), fix-048 (B1, ya resuelto).
> status: done (D1–D5 recomendadas, "continuemos" 2026-10-09; D6 = A, 2026-10-09)
> closed: 2026-10-09
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

### Evidencia: compra real del dueño (2026-10-05, 4 boletas, Concepción)
Casos `12`–`15` de `supabase/functions/process-receipt/eval/casos/` (las fotos son locales,
`eval/fotos/` está en `.gitignore`). Corridos en staging el 2026-10-09:

| Caso | Boleta | OCR | Qué revela |
|---|---|---|---|
| 12 | Del Pedregal (congelados), 13 líneas, $41.060 | 13/13, cuadra, 64 s | La impresora se come letras ("PALM TOS", "HAMB RGUESA"): el cruce necesita tolerar nombres incompletos (alias). |
| 13 | Perfumería, 5 líneas, $16.000 | 5/5, cuadra, 41 s | — |
| 14 | Aroca (abarrotes), 33 líneas, $58.900 | 33/33, cuadra, 79 s | Champiñones y duraznos en dos líneas cada uno (deben sumar al mismo ítem). Sin línea TOTAL. |
| 15 | Voucher Getnet de la feria, **sin detalle**, $22.800 | 0 líneas, total ok, 8 s | **B8.** |

El OCR lee bien. Lo que falla está en la app:

| # | Qué pasa | Por qué |
|---|---|---|
| **B8** | Con una boleta sin detalle (voucher de tarjeta, feria) **no se puede cerrar**: la pantalla vuelve a pedir la foto. | `purchase-close.page.html` muestra la cámara mientras `decisions().length === 0`, y además el aviso "la suma no cuadra" (0 ≠ total). |
| **B9** | Una salida de compras en **varias tiendas** (4 boletas en 2,5 h) no cabe: una compra admite **una** boleta (`receipts.list_id` único). Con la primera se cierra la lista; lo comprado en las otras tiendas queda pendiente o va como "otra compra" sin cruzarse con la lista. | Modelo de 0012. |
| **B10** | Leer una boleta larga tarda 40–80 s con "Leyendo la boleta..." sin más información. | Latencia del modelo. Fuera de alcance de esta spec (anotar en RECORRIDO-UX). |

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
- **D5. Boleta sin detalle (B8).** Recomendado: si la boleta trae total y ninguna línea, el cierre
  dice "Esta boleta no trae el detalle" y muestra tienda, fecha y total. Se cierra con ese total
  (`total_source = receipt`) y lo marcado queda comprado sin precio (opcional: escribir precios
  como en el cierre sin boleta). Sin aviso de "no cuadra".
- **D6. Varias boletas en una compra (B9). Elegida A por el dueño (2026-10-09):** en el cierre,
  "Agregar otra boleta" después de leer una. Cada boleta se cruza con lo que aún no se asignó, el
  total de la compra es la suma y cada boleta guarda su tienda. Requiere quitar el único de
  `receipts.list_id`. Alternativa: cada boleta es su propia compra (como hoy con "Es otra compra"),
  pero cruzándose con la lista activa sin cerrarla. **No bloquea T1–T3; sí T4 en adelante.**

## Fuera de alcance
- B7 (textos de la compra sin lista) → spec "pestaña Compras".
- Editar o borrar líneas después de cerrar → spec "pestaña Compras".
- Fusionar duplicados del catálogo (K1) → spec "ficha de producto".

## Criterios de aceptación
Todos con las decisiones recomendadas; si el dueño cambia una, se ajusta el AC.

**B2 — pendientes**
- [x] AC1. Un producto pendiente de la lista que aparece en la boleta sale en "Coinciden" (o en
  "¿Es este?" si hay duda) con la nota "estaba pendiente", no en "No estaban en la lista".
- [x] AC2. Al cerrar, ese producto queda comprado con el precio y la cantidad de la boleta, no pasa
  a la próxima lista y su `last_purchased_at` se actualiza.
- [x] AC3. Un nombre corto del catálogo o de la lista contenido en una línea larga se ofrece como
  candidato ("Arroz" ↔ "Arroz G1 grano largo 1kg"; "Leche" ↔ "LECHE ENT COLUN 1L").
- [x] AC4. Lo marcado sigue teniendo prioridad: si una línea calza igual de bien con un marcado y con
  un pendiente, gana el marcado.

**B3 / G2 — todas las líneas**
- [x] AC5. Al cerrar con boleta se guardan **todas** las líneas (productos, bolsas, descuentos,
  envases, otros), cada una con texto, tipo, cantidad, precio unitario, monto y, si tiene, el
  producto o ítem al que se asignó.
- [x] AC6. El detalle de la compra en el Historial muestra todas las líneas guardadas. Las que no
  tienen producto se ven con su texto de boleta. La suma del detalle es igual a la suma de la
  boleta.
- [x] AC7. Una compra sin lista en la que no se guardó nada en el catálogo muestra igual todas sus
  líneas.
- [x] AC8. Las compras cerradas sin boleta y las anteriores a esta spec se ven igual que hoy.

**B4 — "¿No lo compraste?"**
- [x] AC9. Nada viene elegido. "Cerrar compra" queda deshabilitado con el aviso "Elige qué pasó con
  lo que no salió en la boleta" hasta elegir en todos.
- [x] AC10. "No lo compré" → el producto vuelve a pendiente (pasa a la próxima lista si "Pasar los
  pendientes" está activo). "Lo compré" → queda comprado sin cambiar `products.last_price`.

**B5 — fecha**
- [x] AC11. Con fecha de boleta válida, la compra queda con esa fecha y hora (`completed_at` y
  `receipts.purchased_at`), en el cierre y en "Agregar boleta".
- [x] AC12. Sin fecha, con fecha futura o de hace más de un año, se usa la fecha del cierre.

**B6 — otras líneas**
- [x] AC13. Bolsas, descuentos, envases y otros cargos salen en una sección "Otros cargos" con su
  monto (los descuentos en negativo). No se pueden asignar a productos.
- [x] AC14. El resumen muestra "Productos $X · Otros $Y · Total $Z". El aviso de "la suma no
  cuadra" solo aparece si productos + otros ≠ total.

**B8 — boleta sin detalle** (D5)
- [x] AC17. Con una boleta de 0 líneas y total, el cierre muestra "Esta boleta no trae el detalle"
  con tienda, fecha y total, sin aviso de "no cuadra", y permite cerrar.
- [x] AC18. Al cerrar, la compra queda con `total_paid` = total de la boleta, `total_source =
  receipt`, la boleta guardada (tienda, fecha, foto) y lo marcado comprado.

**B9 — varias boletas** (D6 = A)
- [x] AC19. Después de leer una boleta, al cerrar la lista activa aparece "Agregar otra boleta (otra
  tienda)". La nueva se cruza solo con lo que aún no apareció y sus líneas siguen a continuación.
- [x] AC20. Al cerrar se guardan todas las boletas, cada una con su tienda, foto, total y líneas; el
  total de la compra es la suma.
- [x] AC21. El Historial muestra las tiendas de la compra y el detalle boleta por boleta.

**General**
- [x] AC15. `npm run test:ci` y `npm run lint:arch` pasan. Hay tests de regresión para B2–B6.
- [x] AC16. Verificado en staging (375×667) con una boleta real que tenga un pendiente, un marcado
  que no sale, una bolsa y fecha de otro día.

## Avance (2026-10-09)

**Hecho en la app** (rama `main-emk2r6`):
- T1: cruce con pendientes (marcados ganan el empate), nombre corto contenido en una línea larga →
  candidato (palabras enteras: "Sal" no calza con "SALSA"), línea repetida → mismo ítem.
- T2: "¿No lo compraste?" viene sin elegir, con botones "No lo compré" / "Lo compré". No se
  pregunta por un marcado que se eligió en un "¿Es este?" ni por uno ofrecido en un "¿Es este?"
  sin responder (si se responde "Otro", vuelve). Encontrado con la boleta de la perfumería: antes
  se podía desmarcar algo que sí estaba en la boleta.
- T3b: voucher sin detalle → "Esta boleta no trae el detalle", sin aviso de "no cuadra", se cierra
  con el total.
- B6: sección "Otros cargos" (bolsa, envase, descuento a la compra; un descuento a un producto ya va
  en su precio) y resumen "Productos $X · Otros $Y".

**Hecho en `plataforma-db`** (rama `feat/shop-receipt-reliable`, commit `e2762f8`, **sin PR ni
despliegue**): migración `20261009010000_shop_receipt_pending_and_date` + test pgTAP
`shop_receipt_reliable` (10 tests). Cubre AC2, AC11 y AC12. Los 177 tests `shop_*` pasan en local.
Al mergear a `main`, se despliega solo a staging.

**G2 (T3/T4/T5/T7, AC5–AC8), en código:** tabla `shop.purchase_lines` + `save_purchase_lines`,
llamada desde `apply_receipt` / `attach_receipt` (y por lo tanto `create_receipt_purchase`). Las
líneas viajan en `p_receipt.lines` (sin cambiar la firma de las RPC: la app antigua sigue
funcionando y no guarda líneas); los extras llevan `line_index` para enlazar el producto creado.
La app manda todas las líneas (`buildApplyReceipt().lines`: un descuento a un producto ya va en su
precio, así que las líneas suman la boleta) y el Historial arma el detalle desde ellas (productos
sin catálogo con su texto de boleta; bolsas y descuentos aparte). Sin líneas, el detalle se arma
como antes desde lo marcado (AC8). pgTAP `shop_receipt_reliable` (16) + 605 tests de la app.

**Pendiente:** aplicar la migración en staging (PR en plataforma-db, a decidir por el dueño) y
cerrar ahí de punta a punta (AC2, AC5–AC7, AC11, AC12, AC16, AC18); la decisión D6. Orden de
despliegue en `docs/PENDIENTES.md`: la migración antes que la app.

**Verificación:**
- `npm run test:ci`: todo pasa. `npm run lint:arch` y `ng build` limpios.
- Navegador a 375×667 contra staging (cuenta `test5`), con el OCR simulado con la transcripción real
  de las boletas (casos 13, 15, 03 del eval): desde Chromium, el proxy de la sesión corta
  `process-receipt` a los 30 s, aunque desde Node la misma foto se lee bien.
  - Perfumería (Desodorante pendiente, Pan marcado que no sale): Desodorante sale con
    "Estaba pendiente: queda comprado"; tras elegir en "¿Es este?", solo Pan queda en
    "¿No lo compraste?"; "Cerrar compra" se habilita al elegir "No lo compré".
  - Voucher Getnet: "Esta boleta no trae el detalle", $22.800, "Cerrar compra" habilitado.
  - Líder Calama: "Otros cargos · Descuento RF CANJE PESOS MCL -$50.591", sin aviso de "no cuadra".

## Verificación en staging (2026-10-09, cuenta `test5`)
plataforma-db#17 mergeado y aplicado en staging (*Deploy de migraciones* #29). App de la rama
`main-emk2r6` contra staging, OCR simulado con la transcripción de las boletas reales del dueño
(casos 14, 12 y 15 del eval). Lista: Leche y Palmitos marcados, Champiñones pendiente, Pan marcado
que no sale en ninguna boleta. Un solo cierre con 3 boletas (Aroca + "Agregar otra boleta" Pedregal
+ voucher de la feria):
- Compra `completed_at` 2026-10-05 (no la del cierre, 09/10) — AC11.
- 3 boletas guardadas con su tienda y total; `total_paid` $122.760 = 58.900 + 41.060 + 22.800 — AC20.
- 46 líneas en `purchase_lines` (33 + 13), suman $99.960 = las dos boletas con detalle — AC5.
- Champiñones (pendiente, dos líneas en Aroca) quedó comprado a $1.490 y con última compra
  05/10 — AC2. Pan y Palmitos ("No lo compré") pasaron a la lista nueva — AC10.
- Historial: "Compra del lun 5 oct · 46 productos · $122.760", detalle boleta por boleta (la primera
  corrida los mezclaba: se corrigió ordenando por boleta) — AC6, AC21.
- AC12 (fecha inválida) y AC7/AC8 quedan cubiertos por pgTAP `shop_receipt_reliable` y tests de la app.

**Antes de publicar la release de la app:** aplicar la migración en producción (`docs/PENDIENTES.md`).
Limitación conocida: al borrar una compra con varias boletas, solo se borra del bucket la foto de una.
