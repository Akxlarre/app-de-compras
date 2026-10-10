> id: 0017-ficha-producto
> refs: `docs/RECORRIDO-UX.md` §3 Catálogo (K1–K8, H1–H6) y §6 (paso 4 del orden replanificado);
> fix-050 (precio como texto en la fila).
> status: done (D1–D6 confirmadas el 2026-10-10)
> closed: 2026-10-10
> created: 2026-10-10

## Problema
El Catálogo es la pantalla con menos funciones de la app, y es donde se acumulan los errores de las
boletas:

1. **No se puede corregir nada** (K1). La boleta crea "Arroz G1 grano largo 1kg" al lado de "Arroz";
   quedan restos como "Leche QA 0011". Una vez creados no se renombran, borran ni juntan, y siguen
   en el buscador y en las sugerencias.
2. **Tocar un producto no hace nada** (K3). No hay detalle ni "Agregar a la lista".
3. **No se ve lo que ya sabemos** (K5). La base tiene cada cuánto se compra (`restock_stats`), los
   precios pagados (`list_items.unit_price`), la tienda (boleta) y los textos de boleta asociados
   (`product_aliases`), pero la fila solo dice "Última compra: hace N días".
4. **No hay búsqueda ni forma de crear** (K2, H2). Con 100+ productos encontrar uno es hacer scroll;
   para crear hay que ir a Mi Lista.
5. **El precio editable es ambiguo** (K6). ¿Es el último pagado o uno estimado? Escribirlo pisa el
   último pagado.
6. **Nombres largos cortados** (K7) y un encabezado que ocupa ~190 px sin información (K4).

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. Ficha del producto** en `/app/products/:id` (la barra marca Catálogo). Arriba el nombre
  completo y el precio; debajo "Lo compras cada ~N días · N compras", las compras (fecha, tienda,
  cantidad y precio pagado), los textos de boleta que lo reconocen y las acciones.
- **D2. Acciones:** "Agregar a la lista" a la vista; en el menú ⋯: Renombrar, Juntar con otro,
  Archivar / Borrar.
- **D3. Borrar o archivar.** Sin compras: "Borrar" (desaparece). Con compras: "Archivar" (sale del
  buscador, del Catálogo y de las sugerencias, pero las compras pasadas siguen mostrando su nombre).
  Un archivado se ve en Catálogo con el filtro "Archivados" y se puede reactivar.
- **D4. Juntar duplicados** (H3): desde la ficha, "Juntar con…" busca el producto que queda. Todo
  pasa a ese: compras, líneas de boleta, textos de boleta y la lista activa (sumando cantidades si
  estaba en los dos). El otro se borra. Se confirma con "Se juntan N compras en «Arroz»".
- **D5. Precio.** La fila y la ficha muestran el **último precio pagado** (de la última compra). A mano
  solo se escribe un **precio estimado** para productos sin compras (lo usa "Total estimado" en Mi
  Lista); una compra nueva lo reemplaza. En la fila ya no se edita.
- **D6. Catálogo:** buscador arriba (filtra mientras escribes), "Nuevo producto" si no existe lo
  buscado, contador ("42 productos"), nombres en dos líneas, sin "Todos tus productos".

## Fuera de alcance
- Categorías, filtros por "más comprados / sin precio" y pasillos (H4, H5, F4).
- Comparar precios entre tiendas (Z1), código de barras (Z2), foto o marca preferida (Z3), catálogo
  inicial (Z4).

## Base de datos (repo `plataforma-db`)
- `products.archived_at timestamptz` (null = activo). `restock_stats` excluye los archivados; el
  buscador (`ProductsRepository.searchByName`), los esenciales y el Catálogo los filtran en la app
  (`.is('archived_at', null)`).
- El precio estimado de D5 es el mismo `products.last_price`: la app solo deja escribirlo si el
  producto no tiene compras (las compras ya lo reemplazan con el pagado). Sin columna nueva.
- `merge_products(p_from uuid, p_into uuid)`: SECURITY INVOKER, misma familia; mueve `list_items`
  (suma si coinciden en una lista por el único `(list_id, product_id)`), `purchase_lines`,
  `product_aliases`; recalcula `last_price` y `last_purchased_at` del que queda; borra el otro.
  Errores `product_not_found`, `same_product`, `different_family`.
- `product_purchases(p_product_id)`: compras `completed` donde el ítem está marcado, con fecha,
  cantidad, precio pagado y tiendas de la boleta (o lo equivalente desde el cliente si alcanza con
  un select).
- Borrar un producto **sin compras** usa DELETE con RLS; con compras la app solo ofrece archivar
  (el FK `list_items.product_id ON DELETE SET NULL` dejaría compras sin nombre).

## Criterios de aceptación
**Ficha (D1, D2)**
- [x] AC1. Tocar un producto del Catálogo abre su ficha; la barra marca Catálogo y "atrás" vuelve.
- [x] AC2. La ficha muestra el nombre completo, el último precio pagado (o el estimado, o "Sin
  precio"), "Lo compras cada ~N días · N compras" (si hay 2 o más) y la lista de compras con fecha,
  tienda, cantidad y precio, la más reciente primero.
- [x] AC3. "Agregar a la lista" lo suma a la lista activa (o avisa si ya está) sin salir de la ficha.
- [x] AC4. Se ven los textos de boleta que lo reconocen; quitar uno equivocado hace que la próxima
  boleta no lo reconozca solo.

**Corregir (D2–D4)**
- [x] AC5. Renombrar valida 1 a 60 caracteres y que no exista otro producto con ese nombre en la
  familia (si existe, ofrece juntarlos).
- [x] AC6. Sin compras: "Borrar" con confirmación. Con compras: "Archivar"; el archivado no sale en
  el buscador, en "Te puede faltar" ni en el Catálogo, y las compras pasadas siguen con su nombre.
- [x] AC7. Catálogo → "Archivados" lista los archivados; "Reactivar" lo devuelve.
- [x] AC8. "Juntar con…" mueve compras, líneas de boleta, textos de boleta y la lista activa al que
  queda (sumando cantidades) y borra el otro; el historial y "cada ~N días" del que queda incluyen
  las compras del otro.

**Catálogo (D5, D6)**
- [x] AC9. Buscador arriba que filtra al escribir (sin tildes ni mayúsculas); si no hay resultado,
  "Crear «texto»" lo agrega al catálogo.
- [x] AC10. La fila muestra el nombre en hasta dos líneas, el último precio pagado como texto (no se
  edita) y la última compra; el encabezado no ocupa más de lo que ocupa en las otras pestañas.
- [x] AC11. El precio estimado se escribe en la ficha solo si no hay compras; con compras se muestra
  "Último pagado $X" y no se edita.

**General**
- [x] AC12. Migración en `plataforma-db` con tests pgTAP para `merge_products` (sumar en la misma
  lista, mover alias y líneas, otra familia rechazada) y `archived_at` (fuera del buscador y de
  `restock_stats`).
- [x] AC13. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC14. Verificado en staging a 375×667: juntar "Arroz G1 grano largo 1kg" con "Arroz",
  archivar "Leche QA 0011", buscar y crear desde el Catálogo.

## Verificación en staging (2026-10-10)
Migración `20261010010000_shop_product_sheet` en staging (plataforma-db #18, deploy automático en
verde). 375×667, capturas en el scratchpad de la sesión (`ux-0017/`).
- **Catálogo (AC9, AC10):** `test3` muestra "15 productos", Activos / Archivados, filas con nombre,
  última compra y precio como texto. Buscar "arroz" deja solo "Arroz".
- **Archivar (AC6, AC7):** "Leche QA 0011" (con compras) ofrece Renombrar / Juntar / Archivar (no
  Borrar). Archivado sale de los activos ("qa" → "Pan QA", "QA nuevo 9365") y aparece en
  Archivados.
- **Crear, precio estimado y borrar (AC9, AC11, AC6):** "Crear «Prueba 0017 …»" abre su ficha ("Sin
  precio", "Todavía no lo compras"); el precio estimado queda "$1.500 estimado"; "Borrar" (sin
  compras) vuelve al Catálogo.
- **Juntar (AC8, AC2, AC4):** en `test3` no hay un "Arroz G1…" real, así que se usó un duplicado con
  compra en `test5`. Se creó "Champiñones París" y se juntó "Champiñones" (compra del 05/10 en
  Aroca · Del Pedregal · El Nene, "2 × $1.490", texto "ESMERALDA CHAMPIÑONES ENTEROS 400G").
  La confirmación dice qué pasa y que no se puede deshacer; la ficha del que queda muestra la
  compra, el precio y el texto de boleta. Se renombró de vuelta a "Champiñones" y el Catálogo
  quedó con uno solo.
- AC13: `npm run test:ci`, `npm run lint:arch` (0 errores) y `ng build` limpios. AC12: pgTAP 14/14
  y CI de plataforma-db en verde.
- Ajuste tras staging: la fecha de las compras en la ficha decía "05-10-2026"; ahora "5 oct 2026".
- Datos de prueba cambiados: "Leche QA 0011" de `test3` quedó archivada.
