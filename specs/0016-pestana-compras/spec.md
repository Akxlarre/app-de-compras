> id: 0016-pestana-compras
> refs: `docs/RECORRIDO-UX.md` §6 (coherencia entre pestañas, N1–N4), §4 Historial (R1–R7) y §2
> Boletas (G1, G3, G4); revisión con capturas del 2026-10-09; fix-049 (lo que quedó fuera).
> status: done (D1–D6 confirmadas el 2026-10-09)
> closed: 2026-10-09
> created: 2026-10-09

## Problema
Después de comprar, lo que más vale (cuánto se gastó, qué se compró, las boletas) está escondido, y
para registrar una compra hay varias puertas que hacen casi lo mismo:

1. **El Historial no es una pestaña** (N1, R1). Se llega por un ícono de reloj en Mi Lista y, estando
   ahí, la barra marca "Mi Lista".
2. **La pestaña Boletas no muestra boletas** (N4, G1): es solo una cámara. Las boletas guardadas se ven
   dentro del detalle de cada compra del Historial.
3. **Dos puertas al cierre y dos a "compra sin lista"** (N2, N3): "Finalizar" en Mi Lista y la pestaña
   Boletas; el botón del Historial y "Es otra compra".
4. **El cierre con boleta es largo y comparte la pantalla con la barra.** Con la boleta de Aroca son 8
   pantallas; los productos repetidos van en tarjetas separadas, y cada línea muestra cantidad y
   precio editables aunque casi nunca se corrigen. Mientras lee (40 a 80 s) no se puede hacer nada más.
5. **El Historial solo muestra el mes actual** (R2, R7), dice "$0 Estimado" en compras sin precios
   (R3), repite el título en la fecha (R4), apila hasta 5 botones por compra (R5) y, vacío, no dice
   cómo empezar (R6).
6. **No se puede usar una foto de la galería** (G3; `capture="environment"` abre la cámara directo)
   ni corregir la tienda o la fecha que leyó la IA (G4).

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. Pestañas.** Mi Lista · **Compras** · Catálogo · Perfil. "Compras" reemplaza a "Boletas"
  (ruta `/app/purchases`; `/app/receipt` y `/app/history` redirigen ahí). Mi Lista pierde el ícono
  de reloj.
- **D2. Una sola puerta para registrar.** En Compras, "Escanear boleta": si hay productos marcados en
  Mi Lista, la boleta cierra esa lista (dentro del flujo sigue "Es otra compra"); si no hay nada
  marcado, es una compra sin lista. "Sin boleta" (ingresar el total) sigue en "Finalizar" de Mi Lista.
- **D3. El cierre es una pantalla completa, sin barra de pestañas,** a la que se llega desde
  "Finalizar" y desde Compras. Arriba lo que hay que decidir; después grupos que se abren ("Coinciden
  3", "Otros productos 30", "Otros cargos"); el cierre fijo abajo.
- **D4. Meses.** Arriba "Gastado en <mes>" con flechas para cambiar de mes y la diferencia con el mes
  anterior; la lista de compras muestra solo las del mes elegido.
- **D5. Foto o galería.** "Escanear boleta" ofrece "Tomar foto" y "Elegir de la galería". El PDF de
  boleta electrónica queda para después.
- **D6. Leer en segundo plano.** Mientras lee, se ve la foto y "Puedes seguir usando la app". Si se
  sale del flujo, al terminar aparece un aviso "Tu boleta está lista" con "Ver".

## Fuera de alcance
- R8 (agregar productos de una compra pasada a la lista), R9 (quién compró), R10 (buscar).
- Gráficos de gasto (W1–W3), boleta en PDF, editar líneas después de cerrar.
- Textos y colores de toda la app (T1–T4, V1–V4) → fix de coherencia, el paso siguiente del plan.

## Criterios de aceptación
**Pestañas y navegación (D1, D2)**
- [x] AC1. La barra tiene Mi Lista, Compras, Catálogo y Perfil. Compras se marca como activa en su
  vista y en el detalle de una compra.
- [x] AC2. `/app/receipt` y `/app/history` llevan a Compras. Mi Lista ya no tiene el ícono de Historial.
- [x] AC3. En Compras, "Escanear boleta" abre el cierre de la lista activa si hay algo marcado (con
  "Es otra compra" disponible) y una compra sin lista si no hay nada marcado. Ya no existe el botón
  "Registrar una compra sin lista".
- [x] AC4. Compras vacía (sin compras) explica qué hacer y muestra "Escanear boleta" (R6).

**Compras: gasto y lista (D4, G1, R3–R5)**
- [x] AC5. Arriba: "Gastado en <mes>", cuántas compras y cuántas estimadas, y la diferencia con el mes
  anterior ("$X más/menos que septiembre"). Flechas para ir a meses anteriores y volver.
- [x] AC6. Cada compra muestra la tienda (o las tiendas) en vez de repetir la fecha, el total y su
  origen. Una compra sin precios dice "Sin precios" en vez de "$0 Estimado" (R3, R4).
- [x] AC7. Al abrir una compra: la boleta (miniatura que se amplía), las líneas y otros cargos; las
  acciones útiles a la vista (Agregar boleta / Ingresar total) y Renombrar / Borrar en un menú ⋯ (R5).

**Cierre a pantalla completa (D3)**
- [x] AC8. El cierre se abre sin la barra de pestañas, desde "Finalizar" y desde Compras, y al
  terminar o cancelar vuelve al lugar de donde vino.
- [x] AC9. Arriba van solo las decisiones ("¿Es este?", "¿No lo compraste?") con un contador
  ("2 por decidir"); los demás grupos van cerrados con su cantidad y total, y se abren al tocarlos.
- [x] AC10. Una misma línea repetida en la boleta se ve como una sola fila "× 2" (se sigue guardando
  cada línea por separado).
- [x] AC11. Cantidad y precio se ven como texto; se editan al tocar la fila.
- [x] AC12. Se pueden corregir la tienda y la fecha de cada boleta antes de cerrar (G4).

**Leer la boleta (D5, D6)**
- [x] AC13. "Escanear boleta" ofrece "Tomar foto" y "Elegir de la galería" (G3).
- [x] AC14. Mientras lee se ve la miniatura de la foto, "Leyendo la boleta (puede tardar un minuto)" y
  "Puedes seguir usando la app".
- [x] AC15. Si se sale del cierre mientras lee, la lectura sigue; al terminar aparece "Tu boleta está
  lista" con "Ver", que vuelve al cierre con el resultado.

**General**
- [x] AC16. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests para cada decisión
  nueva (navegación, meses, agrupar líneas, lectura en segundo plano).
- [x] AC17. Verificado en staging a 375×667 con la boleta de Aroca y la salida de 3 boletas del 05/10:
  el cierre completo cabe en menos de 3 pantallas con los grupos cerrados.

## Verificación en staging (2026-10-09)
375×667, cuenta `test5`, OCR simulado con los casos 14 (Aroca) y 15 (voucher) del eval (el proxy
corta `process-receipt` a los 30 s). Capturas en el scratchpad de la sesión (`ux-0016/`).
- AC1/AC2: barra "Mi Lista · Compras · Catálogo · Perfil"; `/app/history` y `/app/receipt` llegan a
  `/app/purchases` con Compras marcada; también en el detalle `/app/purchases/:id`. Mi Lista sin reloj.
- AC5/AC6: "Gastado en Octubre $122.760 · 1 compra"; la fila dice "Comercializadora Aroca · Del
  Pedregal Concepción · El Nene Jr SPA" con "lun, 5 oct · 46 productos". Flecha a septiembre: $0.
- AC7: detalle con las 3 fotos, 46 líneas y el menú ⋯ (Renombrar / Borrar compra).
- AC13: "Escanear boleta" abre "Tomar foto / Elegir de la galería / Cancelar".
- AC14/AC15: mientras lee, miniatura + "Leyendo la boleta (puede tardar un minuto)" + "Seguir en la
  app"; ya en Compras aparece "Leyendo tu boleta… Ver" y, al terminar, el aviso "Tu boleta está lista
  · VER", que vuelve al cierre con el resultado.
- AC9/AC10/AC11/AC17: con Aroca, "2 por decidir" (Palmitos, Pan) arriba; "Coinciden 2 $5.680" y "No
  estaban en la lista 29 $53.220" cerrados; el cierre completo mide 968 px = **1,45 pantallas** (antes
  8,7). Abierto, 4 filas juntan líneas repetidas (× 3, × 2, × 2, × 2); cantidad y precio aparecen al
  tocar la fila.
- AC12: tienda "Aroca Concepción" y fecha 04/10 corregidas en el resumen. Con la segunda boleta: "2
  boletas $81.700", "El Nene Jr SPA · 5 oct · sin detalle · $22.800".
- AC8: Cancelar vuelve a Compras con la barra visible.
- Encontrado y corregido en staging: (1) Ionic deja el cierre en caché al volver atrás (no se
  destruye) y el aviso no salía → visibilidad con `ionViewWillEnter/WillLeave`; (2) la CSP bloquea
  `blob:` → la miniatura va como `data:`.
- AC16: `npm run test:ci` 661 pasan; `npm run lint:arch` 0 errores; `ng build` limpio.
