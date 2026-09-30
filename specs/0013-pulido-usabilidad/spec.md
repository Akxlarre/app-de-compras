> id: 0013-pulido-usabilidad
> refs: `docs/QA-EXPLORACION.md` (Q1, Q3–Q5, Q8–Q13, Q15–Q22, Q27–Q34, Q39, Q41, Q42). Casos del
> dueño (Q1, Q3, Q4, Q5) y decisiones de la conversación 2026-09-30 ("Todo lo de UI"; en el
> buscador, "En la lista · N").
> status: approved
> created: 2026-09-30

## Problema
Quedan los hallazgos de UI del recorrido de QA que no son de datos (esos se resolvieron en 0011 y
0012). Los del dueño primero:

1. **Barra que tapa (Q1, Q10, Q29, Q34).** La barra de pestañas flota sobre el contenido: en
   Perfil tapa "Cerrar sesión", en Catálogo los últimos productos, y en el cierre de compra el
   botón "Cerrar compra" (además de invitar a salir a mitad del flujo). `--chrome-bottom` existe
   en `tabs-layout` pero nadie la usa; cada página pone o no `pb-32` a mano.
2. **Animación del check (Q3).** Marcar un producto "se anima como 3 veces": el FLIP de
   `animateBentoLayoutChange` mide la posición nueva dos frames tarde, el ítem salta a la vieja y
   vuelve deslizándose 700 ms, sumado a las transiciones CSS de fondo, opacidad y sombra.
3. **Cantidad en el buscador (Q4, Q11).** El buscador muestra el mismo stepper que la lista, y
   ahí `−` con cantidad 1 **borra el producto de la lista sin avisar**. Tampoco dice claramente que
   el producto ya está en la lista.
4. **Login (Q5).** Tarda y el paso a la app es brusco.
5. **Buscador (Q9, Q17, Q39).** "Crear y añadir" cierra el buscador (armar una lista de N
   productos nuevos = abrirlo N veces); "Tus esenciales" no muestra lo recién creado; mientras
   cargan los esenciales se ve "Aún no tienes productos guardados".
6. **Mi Lista (Q8, Q12, Q13, Q15, Q19, Q27, Q31).** El `+` flotante tapa el `+` de cantidad del
   último producto; "Crear Lista" se ve apagado; el texto muestra backticks y ofrece atajos que no
   hay; "Guardar Plantilla" se parte en dos líneas; al desmarcar el producto no vuelve a su lugar;
   borrar solo se descubre deslizando y no se puede deshacer; precios "$1290" junto a "$1.290".
7. **Plantillas (Q28, Q30).** No se pueden borrar ni renombrar; solo se ofrecen con la lista
   vacía. Guardar sin nombre cierra sin avisar; con nombre no confirma; el campo no toma el foco.
8. **Encabezado y navegación (Q16, Q18).** El título está corrido respecto de "SHOPPING"; en
   Historial ninguna pestaña aparece activa.
9. **Cierre sin boleta (Q29, Q32).** Vuelve a preguntar si pasar los pendientes (ya respondido);
   si el total no calza con la suma no muestra la diferencia; el total no tiene formato de moneda
   y el `$` va a la derecha.
10. **Otros (Q20–Q22, Q33, Q41, Q42).** Accesibilidad (`+` flotante, precio del Catálogo, `×` de
    quitar miembro); Boletas sin lista dice "Compra sin lista" dos veces; "Preferencias" no hace
    nada; todos los avatares dicen "TE"; el ícono de boleta de "Registrar una compra sin lista" no
    se ve (no está registrado).

## Solución
- **Espacio de la barra:** una sola regla. El contenido de toda página con pestañas reserva
  `--chrome-bottom` (utilidad/clase compartida en vez de `pb-32` suelto); el `+` flotante se ubica
  sobre la barra con esa misma variable y la lista deja espacio al final para que el último
  producto quede por encima del `+`. En `/app/close` la barra se oculta.
- **Check:** el FLIP mide antes y después en el mismo frame (render síncrono → medir → invertir →
  animar) y una sola animación corta (≈250 ms, `--ease-*` del sistema) reemplaza las transiciones
  CSS que se sumaban. Con `prefers-reduced-motion`, sin animación.
- **Buscador:**
  - Producto ya en la lista: sin stepper; marca "En la lista · N" y el `+` suma 1 más. Bajar o
    quitar se hace solo en la lista.
  - "Crear y añadir" deja el buscador abierto, limpia el texto y vuelve el foco al campo; el nuevo
    producto entra a "Tus esenciales".
  - Los esenciales tienen estado de carga (skeleton) y se recargan al abrir si el catálogo cambió.
- **Login:** medir dónde se va el tiempo (sesión, perfil, primera carga) y quitar la espera que no
  haga falta; la entrada a la app con la transición de vistas del sistema en vez de un corte.
- **Mi Lista:**
  - "Crear Lista" como botón principal; texto de lista vacía sin backticks y sin ofrecer atajos si
    no hay.
  - Acciones secundarias (Guardar plantilla, Vaciar lista) en un menú o fila que no parta el
    título.
  - Orden estable: pendientes arriba, marcados abajo, y dentro de cada grupo el orden de alta
    (no el del servidor).
  - Borrar: además del deslizar, pista visible la primera vez y toast "Quitaste X · Deshacer".
  - Precios siempre con separador de miles.
- **Plantillas:** borrar (con confirmación) y renombrar; "Agregar plantilla" también con una lista
  en curso (suma cantidades, como `add_list_items`). Guardar: foco en el campo, nombre requerido
  con aviso, toast de confirmación.
- **Encabezado:** título alineado con la etiqueta; Historial y cierre marcan "Mi Lista" como
  pestaña activa.
- **Cierre sin boleta:** no repite la pregunta de pendientes; muestra "Suma de precios $X ·
  diferencia $Y" cuando no calzan; total con formato de moneda y `$` a la izquierda.
- **Otros:** nombres accesibles faltantes; Boletas sin lista con un solo "Compra sin lista";
  "Preferencias" se oculta hasta que exista; iniciales desde el nombre visible del miembro (o
  color por usuario si coinciden); ícono `receipt` registrado.

## Fuera de alcance
- Nombre por defecto "Mi Familia" (Q40): lo define la BD; spec aparte si se quiere.
- Sugerencias de reposición: spec 0014.
- Cierre con boleta (OCR) con fotos reales, registro y recuperar contraseña (pendientes de
  recorrer en QA).

## Acceptance Criteria
- [x] AC1: A 375×667, en Perfil, Catálogo, Historial y Mi Lista el último elemento se puede tocar
  por encima de la barra (Q1, Q10); el `+` flotante no tapa el `+` de cantidad del último producto
  (Q8); en el cierre de compra no hay barra de pestañas y "Cerrar compra" es visible (Q29, Q34).
- [x] AC2: Marcar y desmarcar un producto hace **un** movimiento corto al nuevo lugar, sin salto
  atrás (medido por frame como en Q3); con reduced motion no se anima; al desmarcar vuelve a su
  lugar original (Q19).
- [x] AC3: En el buscador, un producto que ya está en la lista muestra "En la lista · N" sin
  stepper; `+` suma 1; nada del buscador borra ítems de la lista (Q4, Q11).
- [x] AC4: "Crear y añadir" deja el buscador abierto con el campo vacío y enfocado; el producto
  nuevo aparece en "Tus esenciales"; al abrir se ve un skeleton y no "Aún no tienes productos"
  mientras cargan (Q9, Q17, Q39).
- [x] AC5: Login más rápido y sin corte brusco: tiempo desde "Ingresar" a Mi Lista con datos medido
  antes y después, con la causa documentada (Q5).
- [x] AC6: Mi Lista: "Crear Lista" es el botón principal; sin backticks ni atajos inexistentes;
  las acciones secundarias no parten el título; precios con separador de miles (Q12, Q13, Q15,
  Q31).
- [x] AC7: Borrar un producto de la lista muestra "Quitaste X" con "Deshacer", que lo devuelve con
  su cantidad (Q27).
- [x] AC8: Plantillas: se pueden renombrar y borrar (con confirmación) y agregar a una lista en
  curso; guardar sin nombre avisa, con nombre confirma, y el campo toma el foco (Q28, Q30).
- [x] AC9: El título queda alineado con "SHOPPING"; en Historial y en el cierre la pestaña "Mi
  Lista" aparece activa (Q16, Q18).
- [x] AC10: Cierre sin boleta: no repite la pregunta de pendientes; muestra la diferencia entre
  total y suma; total con formato `$1.290` (Q29, Q32).
- [x] AC11: `+` flotante, precio del Catálogo y `×` de quitar miembro con nombre accesible; Boletas
  sin lista muestra "Compra sin lista" una vez; sin "Preferencias"; avatares distinguibles; ícono
  de boleta visible (Q20, Q21, Q22, Q33, Q41, Q42).
- [x] AC12: `test:ci`, `lint:arch` (0 errores) y `ng build` en verde; índices actualizados;
  verificado en staging con test3/test4 y capturas a 375×667 de cada pantalla tocada.

## Verificación (staging, 2026-09-30, Playwright a 375×667 con test3/test4)
- AC1: último elemento vs. barra (y=579): Perfil "Cerrar sesión" 635 → 531, Catálogo 528,
  Historial 414; el último `+` de cantidad (≈441) queda sobre el `+` flotante (507–571); en
  `/app/close` la barra no se muestra y "Cerrar compra" termina en y=614.
- AC2: posición por frame al marcar: 339 → 1180 en ~300 ms, 0 retrocesos (antes: aparecía abajo,
  saltaba arriba y volvía en 700 ms). Orden por `created_at` con `sortListItems` (tests).
- AC3: buscador sin steppers; "En la lista · 1" → "+" → "En la lista · 2".
- AC4: "Crear y añadir" deja el buscador abierto, campo vacío y con foco; el nuevo producto
  primero en "Tus esenciales"; con la respuesta demorada 2,5 s se ve el skeleton, no el vacío.
- AC5: causa medida: `fetchData` esperaba `family_members` (nombre de la familia) antes de mostrar
  la lista, y la entrada era un corte seco. Navegación → datos ~0,7 s (antes ~1,4 s); tira de
  cuadros: lista visible a ~1,7 s del toque (antes ~2,9 s); View Transition de ~650 ms.
- AC6: acciones "Guardar plantilla · Agregar plantilla · Vaciar lista" en una fila (17 px de alto,
  sin partirse); precios "$1.290"; "Crear Lista" como botón principal sin atajos; texto sin backticks.
- AC7: deslizar → "Quitaste Aceite · Deshacer" → vuelve a la lista; la pista desaparece.
- AC8: guardar sin nombre avisa y la alerta queda abierta (foco en el campo); con nombre, toast
  "Plantilla guardada" (11 ítems en la BD); "Agregar plantilla" suma cantidades (Aceite 2 → 4);
  renombrar y borrar desde "⋯" (0 plantillas en la BD tras borrar).
- AC9: título "Mi Lista" alineado con "SHOPPING" (la clase `page-main-title` heredaba padding de
  `[class^="page-"]`); Historial y cierre marcan "Mi Lista".
- AC10: "Sin boleta" abre el cierre sin segunda pregunta y con "Pasar pendientes" marcado; total
  "20.000", precio "15.990", "Pagaste $4.010 más que la suma…".
- AC11: Boletas sin lista muestra "Compra sin lista" 1 vez; Perfil sin "Preferencias"; avatares
  T3 / T4 con tonos distintos; ícono de boleta registrado; nombres accesibles en el precio del
  Catálogo (el `+` flotante y la `×` de quitar miembro ya los tenían).
- AC12: 557 tests, `lint:arch` 0 errores (5 advertencias previas de complejidad), `ng build` OK;
  índices COMPONENTS, SERVICES, USAGE-MAP y REPOSITORIES actualizados.
