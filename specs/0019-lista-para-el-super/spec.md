> id: 0019-lista-para-el-super
> refs: `docs/RECORRIDO-UX.md` §1 Mi Lista (F3, F4, F5), §3 Catálogo (H4, K8) y §6 (paso 6, extras).
> status: approved (D1–D5 confirmadas el 2026-10-10; va después de 0020)
> created: 2026-10-10

## Problema
En el súper la lista se recorre en el orden en que se agregó, no por pasillo, y no ayuda a cerrar la
compra sin boleta:

1. **Sin pasillos** (F4, H4, K8). `products.category` existe pero nadie la asigna y Mi Lista no
   agrupa: hay que ir y volver entre verduras y aseo.
2. **Sin unidades** (F3). "1 Papas" no dice si es 1 kg o una unidad; la boleta trae kg.
3. **El precio se anota después** (F5). Cerrar "sin boleta" pide escribir todos los precios al
   final; si se anotan al marcar, el cierre es casi automático y el "Total estimado" se acerca al real.

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. Pasillos fijos.** Una lista corta y conocida, en el orden típico de un súper chileno:
  Frutas y verduras · Carnes y pescados · Lácteos y huevos · Panadería · Despensa · Bebidas ·
  Congelados · Limpieza · Higiene y cuidado personal · Mascotas · Otros. No se crean pasillos propios
  (por ahora).
- **D2. Sugerencia automática.** Al crear un producto (a mano o desde una boleta) se le asigna el
  pasillo por palabras clave ("leche" → Lácteos, "detergente" → Limpieza); sin coincidencia queda en
  "Otros". Se cambia en la ficha del producto (spec 0017) y vale para siempre.
- **D3. Mi Lista agrupada por pasillo**, con un encabezado por pasillo y los marcados al final de cada
  grupo. Un interruptor "Por pasillo / Como la agregué" recuerda la elección en el teléfono.
- **D4. Unidades:** un, kg, g, L, ml, paquete. La cantidad acepta decimales en kg y L ("1,5 kg").
  Se elige en el detalle del ítem; por defecto "un".
- **D5. Precio al marcar (opcional).** Al marcar un producto aparece, por unos segundos, "¿Precio?
  $____" sin bloquear (se puede ignorar). Lo anotado se usa en "Total estimado" y viene puesto al
  cerrar "sin boleta". Con boleta, manda la boleta.

## Fuera de alcance
- Pasillos personalizados u ordenados por tienda; mapas del súper.
- Categorías en el gasto (va en 0020 si se quiere).

## Criterios de aceptación
- [ ] AC1. Cada producto tiene un pasillo de la lista de D1; los nuevos lo reciben solo (D2) y se
  cambia en la ficha.
- [ ] AC2. Mi Lista agrupa por pasillo en el orden de D1, con los marcados al final de cada grupo, y
  se puede volver a "Como la agregué".
- [ ] AC3. Un ítem puede tener unidad y cantidad decimal en kg/L; se ve "1,5 kg" en la fila.
- [ ] AC4. Al marcar aparece "¿Precio?" sin bloquear; lo anotado suma en "Total estimado" y viene
  puesto en el cierre "sin boleta".
- [ ] AC5. Migración en `plataforma-db` (columna de unidad y pasillo con valores válidos, más
  backfill por palabras clave) con pgTAP.
- [ ] AC6. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [ ] AC7. Verificado en staging a 375×667: lista agrupada, unidades, precio al marcar y cierre sin
  boleta con esos precios.
