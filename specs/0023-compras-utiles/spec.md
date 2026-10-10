> id: 0023-compras-utiles
> refs: `docs/RECORRIDO-UX.md` §5 Historial (R8, R9, R10). Orden acordado en la spec 0021.
> status: approved (2026-10-10: el dueño pidió "continúa hasta terminar todas las spec"; las
> decisiones las tomó Claude y quedan escritas aquí para revisarlas)
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
- [ ] AC1. "Agregar a la lista" en el detalle agrega los productos comprados a la lista activa (o a
  una nueva) y avisa cuántos.
- [ ] AC2. El buscador de Compras encuentra compras de cualquier mes por nombre, tienda o producto,
  y dice qué coincidió; vacío vuelve al mes.
- [ ] AC3. Cerrar una compra guarda quién la cerró, y el detalle lo muestra si hay más miembros.
- [ ] AC4. Migración en plataforma-db con pgTAP (compartida con 0024 y 0025).
- [ ] AC5. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [ ] AC6. Verificado en staging a 375×667 con `test5`.
