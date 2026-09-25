# Fix: pantalla queda "congelada" (sin repintar) tras navegar

> id: fix-022-transicion-pantalla-congelada
> refs: encontrado durante revisión manual de rutinas/mesociclo — tras
>   guardar una rutina, descartar un entrenamiento o navegar entre pasos
>   del creador de plan, la pantalla se quedaba mostrando el contenido
>   ANTERIOR (visualmente) pese a que el DOM y la URL ya reflejaban la
>   navegación correcta — confirmado con `document.body.innerText` vs
>   captura de pantalla. Un scroll o cualquier interacción forzaba el
>   repintado correcto. Usuario autorizó arreglar ("Arreglar los 3 ahora").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Síntoma

Después de casi cualquier navegación (guardar rutina, descartar
entrenamiento, avanzar de paso en el creador de plan, volver al listado),
la pantalla se queda pintada con el contenido de la vista ANTERIOR durante
un tiempo indefinido — el usuario ve una pantalla "trabada"/sin respuesta
visual, aunque la app internamente ya navegó. Un scroll, tap, o cualquier
evento de interacción fuerza el repintado correcto inmediatamente.

En consola, cada navegación deja repetido:
```
{code: 11, name: InvalidStateError, message: Transition was aborted because of invalid state}
```

## Causa raíz

`app.config.ts` habilita `withViewTransitions()` en `provideRouter(...)`,
que hace que Angular envuelva cada navegación en
`document.startViewTransition()` (la View Transitions API nativa del
navegador). Este proyecto es una app Ionic (`ion-router-outlet`,
`ion-tabs`), y **Ionic tiene su propio sistema de animaciones de página**
(Web Animations API, transiciones tipo iOS/Android) que se dispara de
forma independiente en cada cambio de ruta.

Ambos sistemas intentan controlar la MISMA transición de navegación al
mismo tiempo: la View Transitions API nativa espera a que el DOM se
"asiente" para capturar el estado "after", pero Ionic sigue mutando estilos
y estructura del DOM como parte de su propia animación mientras esa espera
está en curso. Cuando eso ocurre — o cuando una segunda navegación arranca
antes de que la transición nativa anterior resuelva su promesa
`.finished` — el navegador aborta la transición con `InvalidStateError`,
dejando el frame visual sin actualizar hasta el próximo repintado forzado
por interacción del usuario. Es una incompatibilidad conocida entre
`@angular/router` `withViewTransitions()` e Ionic Angular: Ionic ya
resuelve las transiciones de página por su cuenta, y activar además la API
nativa del navegador hace que compitan por el mismo DOM.

## Cambio

Quitar `withViewTransitions()` de `provideRouter(...)` en `app.config.ts`.
Las animaciones de transición de página siguen funcionando exactamente
igual — las provee Ionic (`ion-router-outlet`) de forma nativa e
independiente de esta opción de Angular Router; no se pierde ninguna
animación visible, solo se deja de disparar la View Transitions API del
navegador en paralelo.

## Fuera de alcance

- No se investigan otras posibles causas de los `406 Not Acceptable`
  vistos en consola durante la sesión de pruebas — parecen intermitentes
  y no bloquean ningún flujo funcional verificado; quedan para una
  revisión aparte si vuelven a aparecer de forma consistente.

## ACs Afectados

Ninguno formal.

## Test de Regresión

Manual en navegador, comparación antes/después con la misma secuencia
exacta que reproducía el bug (crear rutina → añadir ejercicio → guardar):
- **Antes:** pantalla se quedaba en el formulario tras "Guardar" pese a
  que `location.href` y `document.body.innerText` ya reflejaban la
  navegación al listado — necesitaba un scroll para repintar.
- **Después:** la pantalla se actualiza al instante, sin ningún paso
  adicional.

Se repitió la secuencia completa (guardar rutina con ejercicio, cambiar
entre tabs Entrenar/Ejercicios/Perfil) monitoreando consola en cada paso:
**0 apariciones de `InvalidStateError`** en toda la sesión de verificación
(solo quedan los `406`/CSP preexistentes, ya documentados como fuera de
alcance).

`npm run test:ci` → 86 tests, 0 fallos. `ng build` (producción) → build
exitoso, solo los 2 warnings NG8107 preexistentes.
