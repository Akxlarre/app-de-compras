# Fix: buscador de ejercicios falla con múltiples palabras

> id: fix-018-busqueda-multipalabra
> refs: encontrado durante revisión manual de flujos (entrenamiento activo →
>   añadir ejercicio → buscar "press banca"). Usuario autorizó continuar
>   arreglando bugs encontrados ("como tu estimes conveniente iniciar").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Síntoma

Buscar `"press banca"` en el catálogo de ejercicios (Explorer y el selector
dentro de una sesión activa) devuelve **0 resultados** de 880 disponibles,
pese a existir "Press de Banca con Barra", "Press de Banca con Barra - Agarre
Medio", etc. Buscar solo `"banca"` sí devuelve 22 resultados correctos.

## Causa raíz

`core/facades/exercise.facade.ts` → `applyFilters()` hace:

```ts
if (!nameEs.includes(query) && !nameEn.includes(query) && !equipment.includes(query)) {
  return false;
}
```

`query` es el string COMPLETO normalizado ("press banca"), y `.includes()`
exige que sea un substring contiguo. Como los nombres reales llevan
preposiciones ("Press **de** Banca con Barra"), la palabra "banca" nunca
queda pegada a "press" — cero coincidencias.

`explorer.page.ts` y `exercise-selector.component.ts` (usado dentro de
`active-workout.page.ts`) comparten el mismo `ExerciseFacade`, así que el fix
corrige ambas superficies con un solo cambio.

## Cambio

Tokenizar `query` por espacios y exigir que **todas** las palabras (AND)
aparezcan en alguno de los tres campos combinados (nombre ES, nombre EN,
equipo) — no que el string completo sea un substring contiguo de uno solo.

```ts
const tokens = query.split(/\s+/).filter(Boolean);
const haystack = `${nameEs} ${nameEn} ${equipment}`;
if (tokens.length && !tokens.every(t => haystack.includes(t))) {
  return false;
}
```

Agrego test en `exercise.facade.spec.ts` cubriendo búsqueda multipalabra
(antes no existía ningún test para `applyFilters`/`loadExercises` con query).

## Fuera de alcance

- Catálogo con datos en idioma mezclado (ej. "Chest · Barbell · Strength" en
  vez de "Pecho · Barra · Fuerza" para algunos ejercicios) — es un problema
  de datos/seed, no de la lógica de búsqueda. Se documenta como hallazgo
  aparte, no se toca acá.

## ACs Afectados

Ninguno formal.

## Test de Regresión

`npm run test:ci` → 80 tests (4 nuevos), 0 fallos.
Manual en navegador: buscar "press banca" en Explorer → devuelve "Press De
Banca Con Barra" y variantes correctamente.
