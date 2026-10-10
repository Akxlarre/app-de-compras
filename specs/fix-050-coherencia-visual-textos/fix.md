> id: fix-050-coherencia-visual-textos
> refs: `docs/RECORRIDO-UX.md` §6 (T1–T4, V1–V4), paso 3 del orden replanificado; el dueño pidió
> "pr primero y continuar" después de la spec 0016.
> status: done
> closed: 2026-10-10
> created: 2026-10-10

## Síntomas (recorrido 375×667 del 2026-10-09)
- **T1.** El encabezado dice "SHOPPING" (inglés) en Mi Lista, Catálogo y Perfil, y no en Compras.
- **T2.** El título no es el nombre de la pestaña: Catálogo dice "Catálogo Inteligente".
- **T3.** Palabras distintas para lo mismo y abreviaturas: "Est. Costo:" y "EN CARRITO" en Mi Lista,
  "lo marcaste" en el cierre, "Comprado hace 3 días" en Catálogo.
- **T4.** Mayúsculas inconsistentes: "Cerrar Sesión", "Buscar Actualizaciones"; los botones de las
  alertas de Ionic (menú de "Finalizar", confirmar borrar) salen en MAYÚSCULAS.
- **V1.** El color de aviso es azul: `--state-warning` apunta a `--brand-gold` (`#3b82f6`). "N por
  decidir", bordes de "¿Es este?" y los íconos de revisar se ven como links.
- **V2.** Radios distintos para la misma fila: Mi Lista y Compras `rounded-2xl`, Catálogo y el cierre
  `rounded-xl`.
- **V3.** Catálogo: una línea verde suelta arriba de "Todos tus productos" (`card-accent` que quedó de
  0014) y una caja "$" editable (vacía si no hay precio) en cada fila.
- **V4.** El buscador titula "TUS ESENCIALES" en mayúsculas con ícono; las demás secciones van en
  oración y sin ícono.

## Causa raíz
La plantilla trajo tokens y textos genéricos (marca "SHOPPING", `--brand-gold` azul, alertas de
Ionic sin vestir) y cada pestaña se escribió en momentos distintos sin un vocabulario común.

## Cambio
- **Vocabulario:** "pendientes" y "marcados" en Mi Lista ("Marcados" en vez de "En carrito"); "Total
  estimado" en vez de "Est. Costo"; "Última compra: hace 3 días" en Catálogo. El cierre ya habla de
  "marcaste": se mantiene.
- T1: sin la línea "SHOPPING" en ningún encabezado (el título ya dice dónde estás).
- T2: Catálogo se titula "Catálogo".
- T4: "Cerrar sesión", "Buscar actualizaciones"; los botones de `ion-alert` sin mayúsculas forzadas y
  con los colores del tema.
- V1: `--state-warning` = ámbar (`--brand-ember`, `#f59e0b`), con su fondo y borde.
- V2: las filas y tarjetas van en `rounded-2xl` (como Mi Lista y Compras).
- V3: sin `card-accent` en Catálogo; el precio se ve como texto ("$1.290" o "Sin precio") y se edita
  al tocarlo, como en el cierre (0016 AC11).
- V4: "Tus esenciales" como las demás secciones (oración, sin ícono).

## ACs afectados
- 0013 (textos y recorrido de pestañas), 0016 AC9 ("N por decidir" se distingue como aviso).

## Test de regresión
- `src/app/visual-coherence.spec.ts` (nuevo, corre en `test:ci`): revisa plantillas y tokens. Sin
  "SHOPPING", sin "Catálogo Inteligente", sin "Est. Costo" / "En carrito" / "Comprado ${…}", sin
  "Cerrar Sesión" / "Buscar Actualizaciones"; `--state-warning` = `var(--brand-ember)`; `ion-alert`
  con `text-transform: none`; ninguna fila `bg-surface border` en `rounded-xl`; Catálogo sin
  `card-accent`; ningún `<h3>` en mayúsculas. Los 9 casos fallaban antes del cambio.
- `products.page.spec.ts` (nuevo): "Última compra: hace 3 días"; "$1.290" / "Sin precio"; el precio
  se edita al tocarlo, guarda "1.390" como 1390 y vuelve a ser texto.

## Verificación (2026-10-10)
- `npm run test:ci`: 674 pasan. `npm run lint:arch` 0 errores. `ng build` limpio.
- Staging 375×667 (`test5`), capturas en el scratchpad (`ux-050/`):
  - Encabezados: "Mi Lista", "Compras", "Catálogo", "Perfil" (sin "SHOPPING").
  - Mi Lista: "Total estimado", "Pendientes", "Marcados".
  - Catálogo: "$1.490" / "Sin precio" como texto; al tocar aparece un input enfocado.
  - Menú de Finalizar: "Escanear boleta · Sin boleta · Ahora no · Cancelar" (sin mayúsculas; antes
    la regla global perdía contra `.alert-button.sc-ion-alert-md` y se subió la especificidad).
  - Cierre con Aroca: "2 por decidir" y los bordes de "¿No lo compraste?" en ámbar `rgb(245,158,11)`.
