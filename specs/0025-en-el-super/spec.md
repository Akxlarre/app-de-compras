> id: 0025-en-el-super
> refs: `docs/RECORRIDO-UX.md` §1 Mi Lista (X2, X3). Orden acordado en la spec 0021.
> status: done (2026-10-10; decisiones tomadas por Claude a pedido del dueño: "continúa hasta
> terminar todas las spec")
> created: 2026-10-10

## Problema
- En el súper, con el carro en una mano, la pantalla se apaga, las filas son chicas y lo ya marcado
  ocupa lugar.
- No hay forma de fijarse un tope ("hoy no más de $60.000") y ver cómo va la compra contra él.

## Decisiones
- **D1. Modo súper (X3)**: botón "Modo súper" en las acciones de la lista. Mientras está activo:
  - la pantalla no se apaga (Wake Lock del navegador; si el teléfono no lo permite, el modo funciona
    igual);
  - se ven solo los pendientes, por pasillo, con letra más grande;
  - se esconden el resumen, las sugerencias, las acciones y el selector de vista;
  - lo marcado se va de la vista; al pie, "N en el carro" permite verlos para desmarcar alguno;
  - arriba, "Salir del modo súper";
  - sin pendientes: "Todo en el carro" y el botón "Finalizar".
  - Se sale al tocar "Salir" o al dejar la pestaña. No se recuerda entre aperturas.
- **D2. Presupuesto (X2)**: "Presupuesto" en las acciones de la lista pide un monto (vacío lo
  quita). Se guarda en la lista (`shopping_lists.budget`), así lo ve toda la familia.
  - Con presupuesto, bajo el título: "Total estimado $X de $Y" y una barra.
  - Si el estimado lo pasa: "Te pasas por $Z", en color de advertencia.
  - En modo súper se ve "En el carro $C de $Y" (lo marcado), porque ahí importa lo que ya se tomó.
  - Al finalizar, la lista nueva empieza sin presupuesto.

## Fuera de alcance
- Presupuesto mensual (el gasto del mes ya está en Compras).
- Recordar el modo súper o activarlo solo al llegar al súper.

## Criterios de aceptación
- [x] AC1. "Modo súper" muestra solo pendientes, más grandes, mantiene la pantalla encendida (si se
  puede) y deja ver y desmarcar lo que está en el carro.
- [x] AC2. Fijar, cambiar y quitar el presupuesto; se ve "de $Y" con barra y aviso si se pasa.
- [x] AC3. En modo súper, "En el carro $C de $Y".
- [x] AC4. Migración en plataforma-db con pgTAP (compartida con 0023 y 0024).
- [x] AC5. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC6. Verificado en staging a 375×667 con `test5`.

## Cierre (2026-10-10)
- AC4: plataforma-db #21, mergeada y aplicada en staging (pgTAP `shop_who_and_budget`).
- AC5: 854 tests, `lint:arch` sin errores y `ng build` sin avisos.
- AC6, en staging a 375×667 con `test5` (se desmarcaron Pan y Palmitos para probar y después se
  dejó todo como estaba):
  - presupuesto "$60.000" → "Total estimado $4.475 de $60.000"; con 1000, la barra llena en color
    de advertencia y "Te pasas por $3.475"; vacío lo quitó;
  - "Modo súper" pidió el Wake Lock, mostró solo Pan y Palmitos con letra grande y escondió
    resumen, sugerencias y acciones; arriba "En el carro $4.475 de $1.000";
  - al marcar Pan quedó solo Palmitos y "3 en el carro · Ver"; al abrirlo aparecen los marcados al
    final y se pudo desmarcar Pan.
- "Modo súper" está siempre en las acciones (también sin pendientes: ahí dice "Todo en el carro").
- En el teléfono la Screen Wake Lock API depende del WebView; si no está, el modo funciona igual.
