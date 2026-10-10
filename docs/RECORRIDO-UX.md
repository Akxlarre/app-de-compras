# Recorrido de experiencia por pestaña

Recorrido en **staging** a 375×667 (celular) con una cuenta nueva (`test5`, sin historial) y una
con uso (`test3`, familia con test4, historial y plantillas). Para cada pestaña: qué hay hoy, qué
falla o confunde, qué falta y qué daría un plus. Prioridad: **P1** = afecta el uso diario,
**P2** = mejora clara, **P3** = plus.

---

## 1. Mi Lista (2026-10-01)

### Qué hay hoy
- Lista activa compartida por la familia, en tiempo real (Realtime), con "quién marcó".
- Agregar con el buscador (bottom sheet): esenciales, búsqueda en el catálogo, "En la lista · N",
  crear producto nuevo sin cerrar.
- Marcar/desmarcar con animación; pendientes arriba, marcados abajo en orden de alta.
- Cantidad con stepper (enteros, mínimo 1).
- Quitar deslizando, con "Deshacer" y pista la primera vez.
- "Te puede faltar": sugerencias aprendidas del historial, `+`, "Agregar todas", "Todavía tengo".
- Plantillas (guardar, agregar a la lista, renombrar, borrar) y "Repetir última compra".
- Vaciar lista; Finalizar (con boleta / sin boleta / "Ahora no"), bloqueado sin marcados.
- Costo estimado con el último precio; contadores Pendientes / En carrito.
- Sin conexión: banner, marcar y cantidades en cola.
- Acceso a Historial (ícono arriba a la derecha).

### Qué falla o confunde
| # | Prio | Hallazgo | Detalle |
|---|---|---|---|
| L1 | P1 | ✅ fix-048 · **Se borra lo que escribes después de "Crear y añadir"** | El campo se vacía cuando vuelve el servidor (~1–2 s). Si ya empezaste a escribir el siguiente producto, se pierde. Reproducido con Playwright. Debe vaciarse al tocar (optimista). |
| L2 | P1 | **Caben 2 productos en pantalla** | Título "Mi Lista" + nombre de lista en 2 líneas + costo + acciones + contadores ocupan ~330 px de 667. Cada fila mide 82 px. Es la pantalla que se usa en el supermercado con una mano. |
| L3 | P1 | **Nombres largos se cortan sin forma de leerlos** | "Detergente l…": no hay segunda línea ni detalle del producto. |
| L4 | P2 | **"Est. Costo: $0" engaña** | Productos sin precio suman 0; no se dice cuántos no tienen precio. Mejor "$6.060 · 2 sin precio" o "Sin precios aún". |
| L5 | P2 | **El buscador parpadea** | Cada letra muestra "Buscando en catálogo…" y esconde los resultados anteriores (consulta al servidor desde 2 letras). Con catálogos de familia (decenas o cientos de productos) se puede filtrar en el teléfono al instante. |
| L6 | P2 | **"Ahora no" en Finalizar no se entiende** | Cierra la compra sin precios reales, pero el nombre sugiere "cancelar". Opciones: "Cerrar sin precios" o dejar solo "Con boleta / Sin boleta" + "Cancelar". |
| L7 | P2 | **El `+` flotante tapa el stepper al hacer scroll** | Al terminar el scroll queda bien (0013), pero a mitad tapa el `+` de cantidad de una fila. |
| L8 | P3 | **Dos títulos** | "Mi Lista" (encabezado) y "Lista de compras" (nombre) dicen lo mismo y el nombre no se puede cambiar. |
| L9 | P3 | **Contadores grandes "4 PENDIENTES / 0 EN CARRITO"** | Información útil pero ocupa mucho; una barra de progreso "1 de 4" en una línea hace lo mismo. |

### Qué falta (funcionalidad)
| # | Prio | Falta | Por qué |
|---|---|---|---|
| F1 | P1 | **Editar un ítem desde la lista** (tocar el nombre → detalle: nombre, cantidad, nota, precio) | Hoy tocar la fila solo marca; para cambiar algo hay que ir al Catálogo o borrar y volver a agregar. |
| F2 | P1 | **Nota por ítem** ("sin lactosa", "marca X", "el grande") | Es lo más común en listas compartidas: quien compra no es quien anotó. |
| F3 | P2 | **Unidades** (kg, g, L, paquete) y cantidades decimales | "1 Papas" no dice si es 1 kg o 1 unidad; la boleta trae kg. |
| F4 | P2 | **Agrupar por categoría / pasillo** | `products.category` existe pero no hay forma de asignarla ni de ver la lista por secciones (verduras, lácteos, aseo). Ordena el recorrido en el súper. |
| F5 | P2 | **Precio al marcar** (opcional) | Anotar el precio mientras se compra hace que el cierre "sin boleta" sea casi automático y el costo estimado se acerque al real. Pendiente desde 0009. |
| F6 | P3 | **Quién agregó cada producto** | Ya se muestra quién marcó; saber quién lo pidió ayuda a preguntar ("¿qué detergente?"). |

### Ideas que darían un plus
| # | Idea |
|---|---|
| X1 | **Compartir la lista por WhatsApp** (texto con los pendientes) para alguien que no usa la app. |
| X2 | **Presupuesto de la compra**: fijar un tope y ver "vas en $X de $Y" con el costo estimado. |
| X3 | **Modo supermercado**: pantalla siempre encendida, filas más grandes, solo pendientes. |
| X4 | **Agregar por voz o pegando un texto** ("leche, pan, 2 kg de papas") que se convierte en ítems. |
| X5 | **Aviso a la familia** cuando alguien empieza o termina de comprar ("Ana está en el súper"). |

### Mi recomendación para la próxima spec de Mi Lista (aprobada por el dueño, 2026-10-01)
1. L1 (bug, rápido), L2 + L9 (compactar encabezado y filas), L3, L4.
2. F1 + F2 (detalle del ítem con nota) — es lo que más valor agrega al uso compartido.
3. Después F3/F4/F5 juntos ("lista para el súper": unidades, pasillos, precio al marcar).

---

## 2. Boletas (2026-10-01)

Probado con una boleta sintética de Líder (`PAPA BLANCA GRANEL KG 1,250 × 1.390`, queso, fideos ×2,
arroz, Coca-Cola, bolsa $200; total $9.288). `test3` tenía en la lista Papas, Queso, Fideos y
Huevos marcados, y Arroz pendiente. `test5` probó "Es otra compra". La lectura tardó ~10 s.

### Qué hay hoy
- La pestaña Boletas abre el cierre de la lista activa con foto (hasta 5 fotos por boleta).
- Lectura con IA: tienda, total, cantidad (incluye kg con decimales), precio unitario y total por
  línea. Los nombres de la boleta se muestran con nombre legible ("Papa blanca a granel kg").
- Cruce automático con lo marcado: alias aprendidos, cruce del OCR y similitud. Si hay dudas,
  "¿Es este?" con candidatos de la lista y del catálogo, y "No es este".
- "No estaban en la lista": suman al gasto; "Guardar en catálogo" con nombre editable.
- "¿No lo compraste?": lo marcado que no aparece en la boleta, con "Lo compré".
- Aviso cuando la suma de las líneas no cuadra con el total, y líneas dudosas.
- "Es otra compra (no de esta lista)": compra sin lista con la fecha de la boleta.
- Pasar los pendientes a la próxima lista.
- En el Historial: "Ver boleta" (foto), "Agregar boleta" a una compra cerrada sin boleta,
  "Ingresar total" y la tienda en el detalle.

### Qué falla o confunde
| # | Prio | Hallazgo | Detalle |
|---|---|---|---|
| B1 | P1 | ✅ fix-048 · **"Cerrar compra" queda debajo de la barra de pestañas: tocarlo abre Catálogo** | Medido: botón en y 592–634, barra en 579–651; el toque cae en la pestaña. En `/app/close` la barra se oculta (0013), pero en `/app/receipt` sigue visible y la página reserva solo `pb-8`. Lo mismo con "Es otra compra" en la pantalla inicial (queda en y 654–674, cortado). **Hoy no se puede cerrar con boleta desde la pestaña Boletas en un teléfono de 667 px.** |
| B2 | P1 | **Un producto pendiente de la lista que sí está en la boleta se trata como ajeno** | Arroz estaba en la lista sin marcar y salió en "No estaban en la lista" como "Arroz G1 grano largo 1kg", sin ofrecer el Arroz de la lista ni del catálogo. Al cerrar, Arroz **siguió pendiente en la lista nueva** aunque se compró, y su `last_purchased_at` no cambió ("Te puede faltar" aprende mal). Causa: el cruce solo mira lo marcado, y los nombres cortos del catálogo ("Arroz") no alcanzan el umbral contra líneas largas. |
| B3 | P1 | **Lo que no se guarda en catálogo desaparece de la compra** | El Historial dice "4 productos" y el detalle suma $8.098 de $9.288: Arroz, Coca-Cola y la bolsa no están (solo cuentan en el total). En una compra sin lista sin guardar nada, el detalle queda vacío. La lectura completa existe (`receipts.ocr_result`) pero no se muestra. |
| B4 | P2 | **"¿No lo compraste?" viene con "Lo compré" marcado** | Huevos quedó comprado a $1.890 (precio anterior) sin estar en la boleta: el detalle no cuadra con la boleta y no pasa a la próxima lista. Mejor que se elija ("No lo compré" → vuelve a la lista / "Lo compré en otro lado"). |
| B5 | P2 | **La compra toma la fecha de cierre, no la de la boleta** | Boleta del 30/09 18:42 cerrada el 1/10: la compra dice "jue 1 oct" y el gasto cae en octubre. La compra sin lista sí usa la fecha de la boleta. |
| B6 | P2 | **"$9.288 · Suma de las líneas $9.088" sin explicación** | La diferencia es la bolsa ($200), que se lee pero no aparece en ninguna parte. Mostrar bolsas, envases y descuentos como líneas propias. |
| B7 | P2 | **Compra sin lista dice "No estaban en la lista"** | No hay lista. Además todo viene sin "Guardar en catálogo" (y por B3 se pierde). |
| B8 | P2 | **Campos de precio y cantidad sin formato** | "1390" junto a "$1.738"; "1.25" con punto y sin "kg". |
| B9 | P3 | **Pantalla inicial: el recuadro de foto ocupa 420 px** | Y "Pasar el pendiente a la próxima lista" se pregunta antes de ver qué faltó. Dos títulos ("Escanear boleta" y "Lista de compras"). |
| B10 | P3 | **Lo que coincide ocupa ~140 px por línea** | Con una boleta de 30 líneas son ~4.000 px de scroll para revisar lo que ya está bien. Plegar "12 coinciden ✓" y abrir solo lo dudoso. |
| B11 | P3 | **No se ve la foto mientras se revisa** | Para una línea dudosa no hay forma de mirar la boleta sin salir. |

### Qué falta (funcionalidad)
| # | Prio | Falta | Por qué |
|---|---|---|---|
| G1 | P1 | **Archivo de boletas** en la pestaña Boletas: lista por fecha con tienda, total y miniatura; buscar por tienda o producto; botón "Escanear" arriba. | La pestaña se llama Boletas y no muestra ninguna. Hoy están escondidas en Mi Lista → Historial → compra → "Ver boleta". |
| G2 | P1 | **Guardar todas las líneas de la boleta** en la compra, aunque no se agreguen al catálogo. | Detalle completo y gasto real por producto (B3). |
| G3 | P2 | **Subir desde la galería o un PDF** (boleta electrónica). | `capture="environment"` abre la cámara directo en muchos Android: no se puede usar una foto ya tomada ni la boleta que llega por correo. |
| G4 | P2 | **Editar tienda y fecha** antes de cerrar y después. | Si la IA lee mal la tienda o la fecha, hoy no hay cómo corregirlo. |
| G5 | P2 | **Gasto por tienda y por mes**, y precio de cada producto por tienda ("Queso: $2.190 en Líder, $2.350 en Jumbo"). | Es lo que hace valer la pena fotografiar boletas. |
| G6 | P2 | **Descuentos visibles** (por producto y sobre el total). | Ya se leen (`kind: discount`), pero no se muestran. |
| G7 | P3 | **Corregir una línea de una compra cerrada.** | Hoy solo se puede borrar la compra entera. |

### Ideas que darían un plus
| # | Idea |
|---|---|
| Y1 | **Alerta de precio**: "El aceite subió 18% desde la última compra". |
| Y2 | **Reenviar la boleta electrónica por correo** a una dirección de la familia y que se registre sola. |
| Y3 | **Exportar el mes** a una planilla (CSV) para el presupuesto familiar. |
| Y4 | **Boletas de otras compras** (farmacia, ferretería, electro) con recordatorio de garantía. |
| Y5 | **Dividir el gasto** entre miembros ("pagó Ana", "pagó Beto"). |

### Mi recomendación
1. **Spec "cierre con boleta confiable"**: B1 (bloquea el flujo, rápido), B2, B3 + G2, B4, B5, B6.
   Lo que deja una boleta alimenta el Historial, los precios y "Te puede faltar": hoy deja datos
   incompletos o equivocados.
2. **Spec "pestaña Boletas"**: G1 (archivo), G3 (galería/PDF), G4, B7–B11.
3. Después G5 + Y1 (gasto por tienda y precios), que se apoyan en tener todas las líneas guardadas.

---

## 3. Catálogo (2026-10-01)

Probado con `test3` (15 productos, algunos comprados con la boleta de la sección 2) y `test5`
(3 productos creados desde el buscador).

### Qué hay hoy
- Lista alfabética de los productos de la familia con "Comprado hoy / hace N días / Sin compras aún".
- Precio editable en la fila (se guarda al salir del campo o con Enter, con un check de confirmación;
  vacío o inválido vuelve al anterior).
- Estado vacío con una pista ("desde tu lista de compras o escaneando boletas").
- Nada más: es la pantalla con menos funciones de la app.

### Qué falla o confunde
| # | Prio | Hallazgo | Detalle |
|---|---|---|---|
| K1 | P1 | **No se puede renombrar, borrar ni juntar productos** | Los duplicados ya aparecen solos: la boleta crea "Arroz G1 grano largo 1kg" junto a "Arroz" (B2), y hay restos como "Leche QA 0011" o "QA nuevo 9365". Una vez creados, quedan para siempre en el buscador y en las sugerencias. |
| K2 | P1 | **No hay búsqueda ni forma de agregar** | Orden alfabético sin filtro; caben ~6 productos por pantalla (fila de 69 px + encabezado de ~190 px). Con 100+ productos, encontrar uno es hacer scroll. Para crear un producto hay que ir a Mi Lista. |
| K3 | P2 | **Tocar un producto no hace nada** | No hay detalle ni "agregar a la lista". La fila parece tocable (tarjeta) y no responde. |
| K4 | P2 | **"Catálogo Inteligente" no muestra nada inteligente** | Desde 0014 las sugerencias viven en Mi Lista. El título, la línea de acento y "Todos tus productos" ocupan ~190 px sin información. |
| K5 | P2 | **Poca información por producto** | Solo la última compra. Ya existe en la BD cada cuánto se compra (`restock_stats`), cuántas veces, los precios pagados por compra (`list_items.unit_price`) y la tienda (boleta), pero no se muestra. "Sin compras aún" sale también para el Arroz que se compró con boleta (B2). |
| K6 | P2 | **El precio editable en la fila es ambiguo** | ¿Es el último precio pagado o un precio estimado? Escribirlo a mano pisa el último pagado. Sin formato ("1290"), y al hacer scroll es fácil tocar un campo y abrir el teclado. |
| K7 | P3 | **Nombres largos cortados** | "Detergente líquido co…". |
| K8 | P3 | **`category` existe en la BD y no se usa** | Ni para asignar, ni para filtrar, ni para agrupar (ver F4 de Mi Lista). |

### Qué falta (funcionalidad)
| # | Prio | Falta | Por qué |
|---|---|---|---|
| H1 | P1 | **Ficha del producto** (tocar → detalle): nombre, categoría, precio; historial de compras con fecha, tienda y precio; "lo compras cada ~N días"; textos de boleta asociados (alias) con opción de quitar uno equivocado; "Agregar a la lista"; borrar. | Es donde se corrige lo que la IA o el usuario hicieron mal, y donde se ve el valor de registrar compras. |
| H2 | P1 | **Buscar y crear** desde el Catálogo. | Básico para un catálogo de más de una pantalla. |
| H3 | P2 | **Juntar duplicados** ("Arroz G1…" → "Arroz"): mueve historial y alias al producto que queda. | Las boletas generan duplicados con nombres largos; sin esto, el historial de precios y las sugerencias se parten en dos. |
| H4 | P2 | **Categorías** asignables (con sugerencia automática al crear) y filtro por categoría. | Base para agrupar Mi Lista por pasillo (F4) y para el gasto por categoría. |
| H5 | P2 | **Orden y filtros**: más comprados, comprados hace tiempo, sin precio. | Encontrar rápido lo que importa sin buscar. |
| H6 | P3 | **Archivar** un producto que ya no se compra (sale del buscador y de las sugerencias, sin perder el historial). | Borrar pierde historia; archivar no. |

### Ideas que darían un plus
| # | Idea |
|---|---|
| Z1 | **Comparar precios entre tiendas** en la ficha ("más barato en Líder: $990"), con los datos de las boletas (G5). |
| Z2 | **Escanear el código de barras** para buscar o crear un producto. |
| Z3 | **Foto o marca preferida** por producto ("este detergente, no otro"), visible al comprar. |
| Z4 | **Catálogo inicial** para familias nuevas (los 30 productos más comunes), para que `test5` no empiece en blanco. |

### Mi recomendación
1. **Spec "ficha de producto"**: H1 + K1 (renombrar, borrar) + K3 + K7. Convierte el Catálogo en el
   lugar donde se ordena y se entiende lo comprado.
2. En la misma spec o la siguiente: **H2 + K2 + K4** (buscar, crear, encabezado compacto) y **H3**
   (juntar duplicados), que se vuelve necesario en cuanto se usan boletas.
3. Después **H4/H5** junto con F4 de Mi Lista (categorías y pasillos), y **Z1** cuando exista G5.

---

## 4. Historial (2026-10-01)

Se abre desde el ícono arriba a la derecha de Mi Lista. Probado con `test3` (10 compras, una con
boleta) y `test5` (ninguna).

### Qué hay hoy
- "Gastado en <mes>" con cantidad de compras y aviso de cuántas son estimadas.
- "Registrar una compra sin lista" (boleta).
- Compras de más nueva a más antigua: nombre, fecha, N productos, total y su origen (Boleta /
  Total ingresado / Estimado). Al abrir: productos con cantidad × precio, tienda, "Agregar boleta",
  "Ingresar total", "Ver boleta", "Renombrar" y "Borrar compra".
- Estado vacío con explicación.

### Qué falla o confunde
| # | Prio | Hallazgo | Detalle |
|---|---|---|---|
| R1 | P1 | **Está escondido** | Solo se llega por un ícono sin texto en Mi Lista; la barra marca "Mi Lista". Es donde están las boletas (G1) y el gasto, lo que más valor tiene después de la lista. |
| R2 | P2 | **Solo se ve el gasto del mes actual** | test3 tiene 7 compras de septiembre y no hay forma de ver cuánto gastó en septiembre; tampoco hay separadores por mes en la lista. |
| R3 | P2 | **"$0 Estimado"** | Compras sin precios muestran $0 (igual que L4): parece que no costaron nada. Mejor "Sin precios · Ingresar total". |
| R4 | P2 | **Título y fecha repiten lo mismo** | "Compra del jue 1 oct" / "01-10-2026". La tienda ("Líder") aporta más y queda escondida dentro del detalle. |
| R5 | P3 | **Acciones apiladas en pastillas** | Hasta 5 botones por compra; "Borrar compra" en rojo junto a "Renombrar". Un menú ⋯ con Renombrar/Borrar deja visibles solo las acciones útiles (boleta / total). |
| R6 | P3 | **Estado vacío sin acción** | test5 no ve "Registrar una compra sin lista" (solo aparece con compras): quien tiene una boleta de hoy no sabe cómo empezar. |

### Qué falta (funcionalidad)
| # | Prio | Falta | Por qué |
|---|---|---|---|
| R7 | P2 | **Meses anteriores** (selector o lista por mes con su total) y comparación con el mes anterior. | Responder "¿cuánto gastamos al mes?" es la razón para registrar. |
| R8 | P2 | **"Agregar estos productos a la lista"** desde cualquier compra pasada (hoy solo "Repetir última compra"). | Reusar la compra de hace dos semanas sin guardar plantilla. |
| R9 | P3 | **Quién compró** (quién cerró la compra / quién marcó). | En familia: saber quién fue. |
| R10 | P3 | **Buscar** en el historial ("¿cuándo compramos pilas?"). | Con meses de historia. |

### Ideas que darían un plus
| # | Idea |
|---|---|
| W1 | **Gráfico de gasto por mes** (últimos 6 meses) y gasto promedio por compra. |
| W2 | **Productos que más pesan** en el gasto del mes. |
| W3 | **Resumen mensual** a la familia ("En septiembre gastaron $X, 8% menos que agosto"). |

---

## 5. Perfil (2026-10-01)

Probado con `test3` (dueño de "Casa QA" con test4) y `test5` (solo).

### Qué hay hoy
- Avatar con iniciales, nombre y correo.
- Familia: nombre editable, código para invitar (copiar / compartir), miembros con avatar y rol,
  quitar miembro (dueño), unirse a otra familia por código con confirmación.
- "Buscar Actualizaciones" (en la web responde "Estás al día").
- Cerrar sesión. Recuperar contraseña existe desde el login (correo).

### Qué falla o confunde
| # | Prio | Hallazgo | Detalle |
|---|---|---|---|
| P1 | P2 | **No se puede cambiar el propio nombre** | El nombre se ve en "marcado por", en los avatares y en "Familia de <nombre>". Quien se registró sin nombre queda como la parte del correo ("test3"). |
| P2 | P3 | **El encabezado ocupa media pantalla** | Avatar de 88 px + nombre grande: la familia empieza en y≈350. |
| P3 | P3 | **"Unirme" siempre visible** | Es una acción rara (una vez) y ocupa espacio en cada visita; mejor "¿Te invitaron a otra familia?" plegado. |
| P4 | P3 | **"Buscar Actualizaciones" sin versión** | No dice qué versión tienes; en la web no aplica. |

### Qué falta (funcionalidad)
| # | Prio | Falta | Por qué |
|---|---|---|---|
| P5 | P1 | **Borrar mi cuenta** desde la app. | Google Play lo exige a las apps que permiten crear cuenta; sin esto la publicación puede ser rechazada. |
| P6 | P2 | **Cambiar contraseña** estando dentro (hoy solo "¿Olvidaste tu contraseña?" por correo). | Básico de cuenta. |
| P7 | P2 | **Invitar con un enlace** (WhatsApp con link que abre la app y propone unirse), además del código. | Escribir un código de 8 caracteres es el paso donde se pierde gente. |
| P8 | P3 | **Salir de la familia** explícito y **pasar el rol de dueño**. | Hoy solo se sale uniéndose a otra; si el dueño se va, nadie puede quitar miembros. |
| P9 | P3 | **Preferencias**: supermercado habitual, aviso de "Te puede faltar", moneda/formato. | Base para notificaciones y modo supermercado. |

---

## Resumen y orden propuesto (todas las pestañas)

| Orden | Qué | Incluye | Por qué primero |
|---|---|---|---|
| 1 | **Hotfix** | B1 (cerrar compra tapado por la barra), L1 (buscador borra lo escrito) | Rompen flujos diarios y son chicos. |
| 2 | ✅ **Spec 0015: cierre con boleta confiable** (hecha 2026-10-09; además B8 voucher sin detalle y B9 varias boletas) | B2–B6, G2 | Hoy la boleta deja datos equivocados (pendientes que se compraron, líneas perdidas, fecha). Todo lo que viene después (gasto, precios, sugerencias) se apoya en esos datos. |
| 3 | **Spec: pestaña Compras** | La pestaña "Boletas" pasa a ser **Compras**: historial con boletas (G1 + R1), meses (R2/R7), "Escanear boleta" arriba, galería/PDF (G3), editar tienda y fecha (G4), R3–R6, R8 | Junta en un lugar visible lo que hoy está repartido entre Boletas (sin archivo) y un Historial escondido. |
| 4 | **Spec: Mi Lista** (ya aprobada) | L2–L9, F1 + F2 | Uso diario en el súper. |
| 5 | **Spec: ficha de producto** | H1, K1–K7, H2, H3 | Corregir y entender lo comprado; necesaria cuando hay boletas. |
| 6 | **Spec: cuenta** | P5 (borrar cuenta, antes de publicar en Play), P1, P6, P7 | Requisito de tienda + invitar más fácil. |
| 7 | **Plus** | F3/F4/F5 + H4 (unidades, pasillos, precio al marcar), G5/Z1/Y1 (precios por tienda), W1 (gráfico) | Con datos confiables ya acumulados. |

---

## 6. Coherencia entre pestañas (2026-10-09)

Recorrido a 375×667 en staging (cuenta `test5`), después de la spec 0015 y el fix-049. Mira la app
como un todo: navegación, textos y sistema visual. Las decisiones de cada pestaña siguen arriba.

### Navegación: dónde vive cada cosa
| # | Qué pasa | Por qué importa |
|---|---|---|
| N1 | **El Historial no es una pestaña.** Se llega por un ícono de reloj en Mi Lista; estando ahí, la barra marca "Mi Lista" y el encabezado cambia (flecha atrás, sin "SHOPPING"). | Las compras y el gasto del mes, lo que más se consulta después de comprar, están escondidos. |
| N2 | **Dos puertas al mismo cierre:** "Finalizar" en Mi Lista (menú: Escanear boleta / Sin boleta / Ahora no / Cancelar) y la pestaña Boletas. | Dos caminos para lo mismo; la pestaña Boletas solo es una cámara. |
| N3 | **Dos puertas a "compra sin lista":** el botón del Historial y "Es otra compra" en Boletas. | Igual que N2. |
| N4 | **La pestaña Boletas no muestra boletas.** Las boletas guardadas se ven en el detalle del Historial. | El nombre promete algo que está en otra parte. |

### Textos
| # | Qué pasa |
|---|---|
| T1 | El encabezado dice "SHOPPING" (inglés) en todas las pestañas menos el Historial. |
| T2 | Los títulos no son el nombre de la pestaña: Boletas → "Escanear boleta", Catálogo → "Catálogo Inteligente". |
| T3 | Anglicismos y mezcla de palabras para lo mismo: "Est. Costo", "EN CARRITO" (Mi Lista), "lo marcaste" (Boletas), "Comprado hace" (Catálogo). |
| T4 | Mayúsculas inconsistentes: "Cerrar Sesión", "Buscar Actualizaciones" (cada palabra) frente al resto en oración; el menú de "Finalizar" en MAYÚSCULAS (estilo por defecto de Ionic). |

### Sistema visual
| # | Qué pasa |
|---|---|
| V1 | **El color de aviso es azul.** `--brand-gold` vale `#3b82f6` (resto de la plantilla) y es `--state-warning`: los "por decidir" de Boletas y los avisos se ven azules, como un link. |
| V2 | Radios distintos para la misma tarjeta: Mi Lista y Catálogo muy redondeadas, Boletas `rounded-xl`, Historial `rounded-2xl`. |
| V3 | Catálogo: una línea verde suelta sobre "Todos tus productos" (resto del banner de sugerencias que pasó a Mi Lista en 0014) y cajas de precio "$" vacías y editables en cada fila. |
| V4 | El buscador usa encabezado de sección en MAYÚSCULAS con ícono ("TUS ESENCIALES"); el resto de las secciones no. |

### Propuesta: 4 pestañas con un trabajo cada una
| Pestaña | Para qué | Qué cambia |
|---|---|---|
| **Mi Lista** | Armar y marcar la compra. | "Finalizar" abre el flujo de cierre. Sin ícono de Historial. |
| **Compras** (antes Boletas + Historial) | Ver lo comprado y registrar una compra. | Arriba el gasto del mes y "Escanear boleta" (si hay algo marcado cierra la lista; si no, es una compra sin lista, con confirmación). Debajo, las compras con sus boletas y detalle. Una sola puerta para N2, N3 y N4. |
| **Catálogo** | Los productos de la familia. | Búsqueda, ficha de producto (precios, tiendas, cada cuánto), renombrar/juntar. |
| **Perfil** | Cuenta, familia y app. | Cuenta (cambiar contraseña, salir), familia, actualizaciones. |

El **cierre con boleta** pasa a ser un flujo a pantalla completa (sin barra), al que se llega desde
"Finalizar" y desde Compras: primero lo que hay que decidir, después el resumen agrupado, con el
cierre fijo abajo; mientras lee la boleta, se ve la foto y se puede seguir usando la app.

### Orden replanificado (reemplaza al de "Resumen y orden propuesto")
| Paso | Qué | Cubre |
|---|---|---|
| 1 | ✅ Spec 0015 (boleta confiable) y fix-049 (arreglos rápidos de Boletas). | B1–B9, G2 |
| 2 | ✅ Spec 0016: pestaña Compras + flujo de cierre a pantalla completa (2026-10-09). R8–R10 quedan fuera. | N1–N4, R1–R7, G1, G3, G4, lo que quedó fuera del fix-049 (líneas repetidas, editar al tocar, lectura en segundo plano) |
| 3 | ✅ Fix-050: coherencia visual y de textos (2026-10-10). | T1–T4, V1–V4 |
| 4 | ✅ Spec 0017: ficha de producto y catálogo editable (2026-10-10). Quedan H4, H5 (categorías, filtros). | H1–H3, H6, K1–K7 |
| 5 | ✅ Spec 0018: cuenta (2026-10-10). Nombre, contraseña y Perfil compacto; borrar cuenta (P5) e invitar con enlace (P7) descartados: no se publica en Google Play. | P1–P4, P6 |
| 6a | ✅ Spec 0020: precios y gasto (2026-10-10). Precio por tienda y "Subió X%" en la ficha y el cierre; barras de 6 meses, promedio, lo que más pesó y gasto por tienda en Compras. | G5, Y1, Z1, W1, W2 |
| 6b | Spec 0019: lista para el súper (2026-10-10): pasillos fijos con sugerencia automática, Mi Lista por pasillo, unidades (kg/L con decimales) y "¿Precio?" al marcar. Falta mergear la migración en plataforma-db y verificar en staging. | F3–F5, H4, K8 |
