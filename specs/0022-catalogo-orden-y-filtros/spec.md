> id: 0022-catalogo-orden-y-filtros
> refs: `docs/RECORRIDO-UX.md` §3 Catálogo (H5). Orden acordado en la spec 0021.
> status: done (2026-10-10; decisiones tomadas por Claude a pedido del dueño: "continúa hasta
> terminar todas las spec")
> created: 2026-10-10

## Problema
El Catálogo es una lista alfabética con buscador. Con decenas de productos cuesta encontrar lo que
importa: lo que más se compra, lo que hace tiempo no se compra (¿se acabó?), lo que no tiene precio,
o lo de un pasillo.

## Decisiones
- **D1. Orden**: "A–Z" (como hoy, por defecto), "Más comprados" (más compras primero; empate por
  nombre) y "Hace más tiempo" (la última compra más vieja primero; los nunca comprados al final). Se
  elige en un selector y vale mientras la app está abierta.
- **D2. Filtros**, que se combinan con el buscador:
  - "Sin precio": solo los productos sin precio;
  - "Pasillo": uno de los 11, o "Todos".
- **D3. Contador**: "N de M productos" cuando hay buscador o filtros, como hoy con el buscador. Un
  botón "Quitar filtros" aparece si no queda nada.
- **D4. Datos**: las compras por producto salen de `restock_stats` (spec 0014), que el Catálogo pide
  junto con los productos. Sin cambios de BD.

## Fuera de alcance
- Guardar el orden elegido entre sesiones.
- Filtros en "Archivados" (ahí se mantiene el orden A–Z).

## Criterios de aceptación
- [x] AC1. El Catálogo se ordena por A–Z, Más comprados u Hace más tiempo.
- [x] AC2. "Sin precio" y "Pasillo" filtran, combinados entre sí y con el buscador.
- [x] AC3. El contador dice "N de M" con filtros, y "Quitar filtros" los limpia cuando no queda nada.
- [x] AC4. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC5. Verificado en staging a 375×667 con `test5`.

## Cierre (2026-10-10)
- AC4: 813 tests, `lint:arch` sin errores y `ng build` sin avisos.
- AC5, en staging a 375×667 con `test5`:
  - A–Z empieza por Champiñones, Crema de leche, Desodorante; "Más comprados" y "Hace más tiempo"
    reordenan (en `test5` coinciden, porque tiene una sola compra);
  - "Lácteos y huevos" deja "2 de 10 productos"; sumarle "Sin precio" no deja nada y aparece
    "Quitar filtros", que vuelve a "10 productos";
  - "Sin precio" solo: "7 de 10 productos".
- Si `restock_stats` falla, el Catálogo carga igual y "Más comprados" queda como A–Z.
