> id: fix-051-precio-por-tienda-promedio
> refs: spec 0020 D1 (precio por tienda en la ficha). Lo encontró la revisión del dato de Leche en
> `test5` y el dueño pidió corregirlo ("las dos") el 2026-10-10.
> status: done
> closed: 2026-10-10
> created: 2026-10-10

## Síntoma
Cuando una boleta trae dos o más líneas del mismo producto, la ficha muestra dos precios distintos:
- "Último pagado" es el promedio ponderado de esas líneas. El cierre las suma en un solo ítem
  (`buildApplyReceipt`).
- "Por tienda" toma una sola de esas líneas, la primera que llega.

Caso en `test5`: Aroca 05/10 tiene 2 × $1.350 y 1 × $5.700 asignadas a Leche. "Último pagado" da
$2.800 y "Por tienda" da $1.350.

## Causa raíz
`pricesByStore` guarda una línea por tienda y solo la reemplaza si la fecha es más nueva. Las
líneas de la misma fecha no se juntan.

## Cambio
`pricesByStore`: las líneas de una tienda en su fecha más reciente se promedian, ponderadas por
cantidad (suma de montos / suma de cantidades). Es el mismo criterio que el precio de la compra.

## ACs afectados
- 0020 AC1 (la ficha muestra el último precio por tienda).

## Test de regresión
- `src/app/core/utils/price-insights.utils.spec.ts`: "varias líneas de la misma tienda y fecha se
  promedian por cantidad". Con 2 × 1.350 y 1 × 5.700 en Aroca el mismo día, da 2.800.

## Verificación (2026-10-10)
- El test de regresión falló antes del cambio (daba 1.350) y pasa después. `npm run test:ci`: 793
  pasan. `npm run lint:arch` 0 errores. `ng build` sin avisos.
- Datos de `test5` (staging): la línea "DISPLAY CREMA DE LECHE SURLAT NATURAL 6UN" se había asignado
  a Leche por error del script e2e de la 0015. Quedó en su propio producto "Crema de leche"
  (Lácteos y huevos, $5.700). Leche quedó con 2 × $1.350 y "Último pagado" $1.350.
- La ficha de Leche muestra "Último pagado $1.350" y "Por tienda" Aroca $1.350. La de Crema de leche
  muestra $5.700. "Lo que más pesó" en Compras muestra "Crema de leche $5.700".
