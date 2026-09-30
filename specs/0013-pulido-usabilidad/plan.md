# Plan — 0013-pulido-usabilidad

Solo app (sin migraciones). Un commit por bloque; verificación en staging al final con Playwright
a 375×667 y capturas.

## A. Barra de pestañas y encabezado (AC1, AC9)
- `layout/tabs-layout`: `--chrome-bottom` pasa a `:root`-like en el host y se usa:
  - clase global `.pb-chrome` (`padding-bottom: calc(var(--chrome-bottom) + var(--space-6))`) en
    `src/styles`; reemplaza `pb-32` de Mi Lista, Historial, Cierre y la usan Perfil
    (`ion-content` → `--padding-bottom`) y Catálogo (Q1, Q10).
  - `+` flotante: `bottom: calc(var(--chrome-bottom) + …)`; la lista deja un espacio final del alto
    del `+` para que el último stepper quede por encima (Q8).
  - Ruta `/app/close` y `/app/receipt` con compra en curso: barra oculta (clase en el host según la
    URL, `Router.events`). Historial y cierre marcan "Mi Lista" activa (`selectedTab` del
    `ion-tab-bar` calculado desde la URL) (Q18, Q29, Q34).
- `app-header`: el título alineado con la etiqueta (revisar márgenes del `h1` / back) (Q16).

## B. Check y orden (AC2)
- `GsapAnimationsService.animateListReorder(container, change)`: mide, `change()` (con
  `detectChanges`), mide de nuevo en el mismo tick, `gsap.fromTo` 0.28 s `power2.out`, sin rAF.
  Reduced motion → solo `change()`. Spec del servicio.
- Ítem: sin transiciones CSS de fondo/sombra/opacidad del contenedor (el color del círculo sí).
- Orden: util pura `sortListItems(items)` en `core/utils/shopping-list.utils.ts`: pendientes
  primero, dentro de cada grupo por `created_at` e `id` (Q19). Spec.

## C. Buscador (AC3, AC4)
- `product-search`: sin stepper; si está en la lista, chip "En la lista · N" + `+` que suma 1
  (`addItem`). Se borra `updateQuantity` (Q4, Q11).
- "Crear y añadir": no cierra; limpia el término, foco al campo (Q9).
- `ProductSearchFacade`: `essentialsLoading`, `loadEssentials(familyId, { force })`; al crear un
  producto se agrega a `essentials` (Q17, Q39). Skeleton en la plantilla. Specs.

## D. Mi Lista (AC6, AC7)
- Sin lista: "Crear Lista" como acción principal (`app-empty-state` ya pinta primario; revisar
  `actionLabel` y el estilo si sale apagado) (Q12).
- Lista vacía: texto sin backticks; si no hay atajos, "Toca + para agregar productos" (Q13).
- Acciones secundarias bajo el título en una fila (`Guardar plantilla · Vaciar`), Finalizar a la
  derecha del título (Q15).
- Precios con `number: '1.0-0'` (Q31).
- Borrar con deshacer (Q27): `ShoppingListFacade.deleteItem` guarda el ítem; `undoDelete()` lo
  vuelve a agregar con `add(listId, productId, qty)` (y `setChecked` si estaba marcado).
  `ToastService.action(summary, label, onAction)` (PrimeNG toast con botón). Spec facade + servicio.
  Pista: texto bajo la lista "Desliza a la izquierda para quitar" la primera vez (localStorage).

## E. Plantillas (AC8)
- `ShoppingListsRepository.renameTemplate(id, name)`, `deleteTemplate(id)` (`status = template`,
  `.select('id')` → `not_found` si 0 filas). Specs.
- `ShoppingListFacade.renameTemplate/deleteTemplate` optimistas con rollback + toasts.
- `list-shortcuts`: menú por plantilla (Renombrar / Borrar). Con lista en curso, "Agregar
  plantilla" (botón bajo la lista) abre las plantillas y usa `cloneListItems` (suma).
- Guardar plantilla: alerta con foco (`ionAlertDidPresent` → focus), nombre requerido (toast
  warning, no cierra), toast "Plantilla guardada" (Q30).

## F. Cierre (AC10, AC11-Q22)
- Finalizar con boleta/sin boleta ya no pregunta por pendientes: la pantalla de cierre tiene el
  check "Pasar pendientes" (marcado por defecto). "Ahora no" sigue preguntando (Q29).
- Total: `$` a la izquierda, valor formateado (`formatAmount`), diferencia
  `total − suma` si ambos > 0 y difieren (Q32). Util `formatAmount` con spec.
- Compra sin lista: sin el `h2` repetido (Q22).

## G. Otros (AC11)
- `+` flotante ya tiene `aria-label`; revisar lector. Precio del Catálogo con `aria-label` y `$`
  como prefijo visual (Q20, Q21). `×` de quitar miembro con `aria-label="Quitar a X"` (Q41).
- Perfil: sin "Preferencias" (Q33).
- Avatares: iniciales desde el nombre (`display_name` o parte local sin dígitos) y color por
  `userId` de la paleta de tokens (Q42). Util `memberInitials` con spec.
- Ícono `receipt` en `PROVIDED_ICONS` / `app.config.ts`.

## H. Login (AC5)
- Medir con Playwright (tiempos por request y a pantalla con datos). Candidatos: el polling de
  `AuthFacade.login` (hasta 5 s cada 100 ms), `waitForAuthSync`, `profiles` bloqueando.
  Resolver en cuanto haya sesión; transición de vistas al entrar. Spec del cambio en AuthFacade.

## Validación
`npm run test:ci`, `npm run lint:arch`, `ng build`; Playwright en staging (test3/test4) con
capturas por AC; índices (COMPONENTS, FACADES, REPOSITORIES, SERVICES) actualizados.
