> id: 0023-compras-utiles
> refs: `docs/RECORRIDO-UX.md` §5 Historial (R8, R9, R10). Orden acordado en la spec 0021.
> status: done (2026-10-10; decisiones tomadas por Claude a pedido del dueño: "continúa hasta
> terminar todas las spec")
> created: 2026-10-10

## Problema
Con meses de compras, el historial sirve poco más que para mirar el gasto:
- para reusar una compra de hace dos semanas hay que guardarla antes como plantilla ("Repetir"
  solo ofrece la última);
- no se puede buscar "¿cuándo compramos pilas?";
- en familia no se sabe quién hizo cada compra.

## Decisiones
- **D1. "Agregar a la lista" (R8)**: botón en el detalle de cualquier compra. Agrega a la lista
  activa los productos que se compraron, con su cantidad: los de la boleta (si la hay; dos líneas
  del mismo producto suman) y lo marcado que no estaba en ella, una vez cada producto. Si no hay
  lista activa, la crea. Lo que ya está en la lista suma, como "Repetir última compra". Un aviso dice cuántos se
  agregaron. Necesita conexión.
- **D2. Buscar (R10)**: un buscador arriba en Compras. Al escribir, en vez del mes muestra todas las
  compras (de cualquier mes) cuyo nombre, tienda o productos coinciden, de la más nueva a la más
  vieja. Cada resultado dice qué producto coincidió ("Pilas AA · 2 × $3.990"). Sin tildes ni
  mayúsculas, como el buscador del Catálogo. Borrar el texto vuelve al mes.
- **D3. Quién cerró (R9)**: la base guarda quién cerró cada compra (`shopping_lists.completed_by`,
  lo fija la base al pasar a cerrada). El detalle de la compra dice "Cerrada por Ana" (o "por ti")
  si la familia tiene más de un miembro. Las compras cerradas antes de este cambio no lo muestran.

## Fuera de alcance
- Elegir qué productos agregar (se agregan todos; desde Mi Lista se quita lo que sobre).
- Copiar la unidad (kg, L…): como "Repetir última compra", se copian producto y cantidad.
- Buscar dentro del texto de las boletas que no quedó como producto.

## Criterios de aceptación
- [x] AC1. "Agregar a la lista" en el detalle agrega los productos comprados a la lista activa (o a
  una nueva) y avisa cuántos.
- [x] AC2. El buscador de Compras encuentra compras de cualquier mes por nombre, tienda o producto,
  y dice qué coincidió; vacío vuelve al mes.
- [x] AC3. Cerrar una compra guarda quién la cerró, y el detalle lo muestra si hay más miembros.
- [x] AC4. Migración en plataforma-db con pgTAP (compartida con 0024 y 0025).
- [x] AC5. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC6. Verificado en staging a 375×667 con `test5`.

## Cierre (2026-10-10)
- AC4: plataforma-db #21 (`20261010040000_shop_who_and_budget`), mergeada y aplicada en staging;
  pgTAP `shop_who_and_budget` (11).
- AC5: 844 tests, `lint:arch` sin errores y `ng build` sin avisos.
- AC6, en staging a 375×667:
  - `test5`: "champi" encuentra la compra del 5 oct con "Champiñones · $1.490"; "aroca" por
    tienda; "pilas" dice "Ninguna compra con «pilas»"; borrar el texto vuelve al mes;
  - `test5`: "Agregar a la lista (3)" agregó los 3 productos y avisó "3 productos agregados a Mi
    Lista" (después se dejó la lista como estaba). Esa boleta tiene 46 líneas pero solo 4 ligadas a
    productos del catálogo; por eso el botón dice "Solo lo que está en tu catálogo";
  - `test3` + `test4` (familia de dos): `test4` cerró una compra y `test3` vio "Cerrada por test4"
    en el detalle; la compra de prueba se borró después.
