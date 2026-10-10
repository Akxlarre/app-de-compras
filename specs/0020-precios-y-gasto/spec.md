> id: 0020-precios-y-gasto
> refs: `docs/RECORRIDO-UX.md` §2 Boletas (G5, Y1), §3 Catálogo (Z1), §4 Historial (W1, W2) y §6
> (paso 6, extras).
> status: draft — falta que el dueño confirme D1–D4
> created: 2026-10-10

## Problema
Las boletas ya guardan tienda, fecha y precio de cada línea (spec 0015), pero la app no lo devuelve:

1. **No se sabe dónde es más barato** (G5, Z1). "Queso: $2.190 en Líder, $2.350 en Jumbo" está en la
   base y no se ve.
2. **No se nota cuando algo sube** (Y1).
3. **El gasto es un número del mes** (W1, W2): no hay tendencia ni qué productos pesan más.

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. Precio por tienda en la ficha del producto** (spec 0017): el último precio pagado en cada
  tienda, ordenado del más barato, con la fecha ("Líder $2.190 · hace 5 días"). Solo con boletas
  (las compras sin boleta no tienen tienda).
- **D2. Aviso de subida** en la ficha y en "Coinciden" del cierre: "Subió 18% desde la última
  compra" cuando el precio unitario pagado sube 10% o más respecto de la compra anterior (misma
  tienda si se sabe). Sin notificaciones push.
- **D3. Gráfico de gasto** en Compras: barras de los últimos 6 meses (el mes elegido resaltado) y el
  promedio por compra. Toca una barra para ir a ese mes.
- **D4. "Lo que más pesó" del mes** en Compras: los 5 productos con más gasto (suma de lo pagado) y
  el gasto por tienda del mes.

## Fuera de alcance
- Notificaciones, presupuesto mensual, exportar a planilla (Y3), dividir gastos (Y5), boleta por
  correo (Y2).

## Criterios de aceptación
- [ ] AC1. La ficha muestra el último precio por tienda, del más barato al más caro, con la fecha.
- [ ] AC2. Si el último precio subió 10% o más respecto del anterior, la ficha y el cierre lo dicen
  ("Subió 18%").
- [ ] AC3. Compras muestra las barras de los últimos 6 meses y el promedio por compra; tocar una
  barra cambia el mes.
- [ ] AC4. Compras muestra los 5 productos que más pesaron y el gasto por tienda del mes elegido.
- [ ] AC5. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada cálculo.
- [ ] AC6. Verificado en staging a 375×667 con las boletas del 05/10 (`test5`).
