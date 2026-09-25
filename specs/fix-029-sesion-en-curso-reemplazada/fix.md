# Fix: empezar un entrenamiento reemplaza en silencio la sesión en curso

> id: fix-029-sesion-en-curso-reemplazada
> refs: hallado al revisar el botón muerto del bloque de arranque de
>   Entrenar (pendiente de 0002).
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Los 5 tests nuevos de `workout.facade.spec.ts` fallaron
> antes del cambio y pasan después: con una sesión en curso, los tres
> métodos de inicio devuelven `false`, dejan la sesión intacta (mismo id,
> mismos ejercicios), no escriben en `workouts`, llevan a la sesión
> activa y avisan una vez. Sin sesión en curso, iniciar devuelve `true`
> y no avisa. El doble toque sobre una tarjeta crea un solo
> entrenamiento. Suite completa: 107 tests en verde. Build compila.
> Quitar `.start-btn:disabled` bajó el exceso de presupuesto de estilos
> de Entrenar de 88 a 11 bytes.
>
> **Sin verificar en navegador.** La sesión del panel había expirado y
> no corresponde iniciar sesión por el usuario. La sesión simulada que
> se había escrito en `localStorage` para la prueba se borró.

## Síntoma

Con una sesión en curso, tocar una tarjeta de rutina en Entrenar empieza
otra sesión **sin preguntar** y reemplaza la activa:

- el estado local de la sesión en curso (ejercicios, series todavía no
  completadas, reporte) se pierde: el `effect` de persistencia pisa
  `fittrack_active_workout` en `localStorage` con la sesión nueva;
- la fila de `workouts` de la sesión anterior queda abierta para
  siempre (`end_time` nulo), porque ya nadie la cierra ni la descarta.

Lo mismo pasa desde el detalle del plan (`mesocycle.page.ts`), que llama
a `startWorkoutFromMesocycleSession` sin ningún resguardo.

## Causa raíz

Los tres métodos de inicio de `WorkoutFacade` (`startAdhocWorkout`,
`startWorkoutFromRoutine`, `startWorkoutFromMesocycleSession`) hacen
`activeSession.set(nueva)` sin mirar si ya hay una sesión viva.

La UI lo tapaba a medias: el botón de sesión libre y el de sesión
prescrita en Entrenar llevan `[disabled]` cuando hay sesión activa. Ese
parche es además el origen del **botón muerto** del bloque de arranque:
un CTA deshabilitado que no dice por qué. Las tarjetas de rutina y la
página del plan no tenían ni ese parche.

## Cambio

1. **`WorkoutFacade`**: los tres métodos de inicio comprueban primero
   si hay sesión en curso. Si la hay, **no crean nada**: llevan al
   usuario a su sesión activa y le avisan con un toast por qué. Devuelven
   `false`; `true` cuando sí inician.
   Como el `set` de la sesión nueva ocurre antes del primer `await`, el
   resguardo también evita que un doble toque cree dos entrenamientos.
2. **`workouts.page.ts`**: se quitan los dos `[disabled]` que parcheaban
   el problema. Los botones vuelven a hacer algo: con otra sesión en
   curso, llevan a ella y explican por qué, en vez de quedar grises sin
   explicación. Se elimina la regla `.start-btn:disabled`, que queda sin
   uso.

## No cambia

- Terminar o descartar la sesión en curso sigue siendo explícito, desde
  la pantalla de sesión.
- El texto de los botones no cambia.

## Test de Regresión

- **Unit** (`workout.facade.spec.ts`): con una sesión en curso, cada uno
  de los tres métodos de inicio deja la sesión intacta, no crea filas en
  `workouts`, navega a la sesión activa y avisa una vez. Sin sesión en
  curso, iniciar sigue funcionando y no avisa.
- `npm run test:ci` + `ng build`.
- Navegador: con una sesión en curso, tocar una tarjeta de rutina lleva
  a la sesión existente sin reemplazarla.
