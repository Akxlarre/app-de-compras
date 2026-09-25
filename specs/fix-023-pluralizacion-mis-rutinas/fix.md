# Fix: pluralización faltante en "Mis Rutinas" y catálogo de ejercicios

> id: fix-023-pluralizacion-mis-rutinas
> refs: hallazgo menor reportado junto con la revisión de rutinas/mesociclo
>   ("1 ejercicios" en la tarjeta de rutina), distinto del ya corregido en
>   fix-020 (que fue en las stat-pills de Historial). Usuario confirmó
>   seguir ("si").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Síntoma

- `workouts.page.ts` → tarjetas de "Mis Rutinas": `{{ routine.routine_exercises.length }} ejercicios`
  siempre en plural, incluso con 1 ejercicio → "1 ejercicios".
- `exercise-selector.component.ts` → contador del catálogo:
  `{{ facade.exercises().length }} ejercicios disponibles`, mismo problema
  si una búsqueda filtra a exactamente 1 resultado.

## Causa raíz

Mismo patrón que fix-020 (label fijo sin lógica singular/plural), en dos
ubicaciones que ese fix no cubrió porque no eran las stat-pills de
Historial sino un label de tarjeta de rutina y un contador de catálogo.

## Cambio

Ternario inline (mismo patrón usado en fix-020, sin introducir sintaxis
ICU nueva):
- `workouts.page.ts`: `{{ routine.routine_exercises.length === 1 ? 'ejercicio' : 'ejercicios' }}`
- `exercise-selector.component.ts`: `{{ facade.exercises().length === 1 ? 'ejercicio disponible' : 'ejercicios disponibles' }}`

## Fuera de alcance

- No se relevaron exhaustivamente TODOS los contadores de la app en busca
  de este mismo patrón — se corrigen los dos casos concretos encontrados
  en el área de rutinas/catálogo que se estaba revisando.

## ACs Afectados

Ninguno formal.

## Test de Regresión

Manual en navegador: confirmado vía `get_page_text` que las dos rutinas de
prueba (1 ejercicio cada una) muestran "1 ejercicio" en singular en la
lista de "Mis Rutinas".

`npm run test:ci` → 86 tests, 0 fallos. `ng build` (producción) → build
exitoso, solo los 2 warnings NG8107 preexistentes.
