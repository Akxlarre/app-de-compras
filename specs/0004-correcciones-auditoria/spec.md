> id: 0004-correcciones-auditoria
> refs: Auditoría de flujos contra staging (sesión 2026-09-25)
> status: in-progress
> created: 2026-09-25

## Síntomas (reproducidos en staging con Chromium)
1. **Fuga entre cuentas en el mismo dispositivo.** A cierra sesión; C (otra familia, sin listas)
   entra sin recargar la app y ve la lista completa de A y sus "esenciales".
2. **"Crear Lista" no actualiza la pantalla.** Sigue "No hay ninguna lista activa" (con el FAB
   visible) hasta recargar. Además, cualquier fallo al marcar/cambiar cantidad/agregar reemplaza
   la lista entera por la pantalla de error.
3. **Precio vacío = $0.** En el Catálogo, vaciar el precio y salir del campo guarda `0`; salir del
   campo sin cambiar nada también guarda y reinicia "Hace N días".
4. **"Generar lista inteligente" crea una segunda lista activa.** La lista activa anterior queda
   escondida con sus ítems.

## Causa raíz
1. `AuthFacade.logout()` no limpia el estado de los facades (singletons `root`): SWR muestra los
   datos cacheados del usuario anterior y, si el nuevo no tiene lista, `refreshSilently()` falla en
   silencio y deja la ajena. `ProductSearchFacade.essentials` se cachea "para la sesión" sin
   invalidación.
2. `BaseFacade.refreshSilently()` no limpia `_error`, y el template evalúa `error()` antes que
   `data()`. `ShoppingListFacade` usa `_error` (estado de carga) para errores de mutaciones.
3. `ProductsPage.onPriceBlur` hace `Number(input.value)` (`Number('') === 0`) y guarda siempre.
4. `ProductsFacade.generateSmartList()` siempre crea una lista `active` nueva.

## Solución
1. `SessionScopeService` (`core/services/auth/`): los facades con datos del usuario registran su
   limpieza; `AuthFacade` la ejecuta en `logout()`, en el evento `SIGNED_OUT` y si cambia el usuario
   de la sesión. `BaseFacade` se registra solo (y corta Realtime). Guardia: regla (h) de
   `architecture.spec.ts` — todo facade que no extienda `BaseFacade` se registra (salvo `AuthFacade`
   y `AppUpdateFacade`, que no guardan datos de la familia).
2. `refreshSilently()` exitoso limpia `_error`. Las mutaciones de `ShoppingListFacade` avisan con
   `ToastService` y no tocan `_error` (la lista sigue visible).
3. Validación del precio en `ProductsFacade.updatePrice`: vacío, negativo, no numérico o igual al
   actual → no guarda. La página restaura el valor mostrado si no se guardó.
4. `generateSmartList()` agrega a la lista activa existente (sin duplicar productos que ya están);
   solo crea una lista si no hay ninguna activa.

## Acceptance Criteria
- [ ] AC1: Tras `logout()` (y `SIGNED_OUT` / cambio de usuario) los facades de datos quedan vacíos:
  lista, plantillas, esenciales, catálogo, familia, boleta. Test en `auth.facade.spec` y
  `session-scope.service.spec`.
- [ ] AC2: Regla (h) en `architecture.spec.ts`, en rojo antes y en verde después.
- [ ] AC3: `createList` desde "sin lista activa" deja `error() === null` y la lista visible.
- [ ] AC4: Un fallo en toggle/cantidad/agregar/borrar/crear no cambia `error()`; muestra un toast.
- [ ] AC5: Precio vacío, inválido o sin cambios no llama al repository.
- [ ] AC6: `generateSmartList` con lista activa agrega solo los productos que faltan y no crea lista.
- [ ] AC7: Repro en staging: C no ve datos de A; "Crear Lista" muestra la lista sin recargar.
- [ ] AC8: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.

## Tests de regresión
`session-scope.service.spec.ts`, `auth.facade.spec.ts`, `base.facade.spec.ts`,
`shopping-list.facade.spec.ts`, `products.facade.spec.ts`, `architecture.spec.ts` regla (h).
