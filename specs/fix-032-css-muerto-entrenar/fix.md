# Fix: los estilos de Entrenar pasan el presupuesto por reglas muertas

> id: fix-032-css-muerto-entrenar
> refs: aviso del build desde la migración de Entrenar (spec 0002).
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** El build ya no avisa el presupuesto de `workouts.page.ts`;
> solo quedan dos NG8107 previos (un `?.` redundante), ajenos a este fix.
> El script de CSS muerto no reporta ninguna clase para el archivo. Tests:
> 107 en verde.
>
> `.empty-feed` compartía reglas con `.loading-box`, que sí se usa: ahí se
> quitó solo el selector muerto, sin tocar las reglas del estado de
> carga. Esas reglas conservan tres `rgba()` escritos a mano, fuera del
> alcance de este fix.

## Síntoma

El build avisa que los estilos de `workouts.page.ts` pasan el
presupuesto de 10 kB por componente: 88 bytes de más, y 11 después de
fix-029.

## Causa raíz

El archivo arrastra reglas para 11 clases que **no aparecen en la
plantilla**: restos del encabezado propio y del feed de historial que la
vista tenía antes de la migración.

`app-top-header`, `header-content`, `title-group`, `brand-tag`,
`page-main-title`, `streak-pill`, `streak-fire`, `exercise-tags`,
`ex-tag`, `empty-feed`, `empty-icon`.

El archivo no usa `::ng-deep`, así que por la encapsulación de Angular
esas reglas tampoco alcanzan a componentes hijos: son código muerto. Se
detectaron con un script que cruza las clases definidas en los estilos
con las que aparecen en la plantilla.

## Cambio

Se eliminan esas reglas (unos 1,9 kB de CSS).

## No cambia

- El presupuesto de `angular.json` **no se sube**: el exceso se resuelve
  quitando lo que sobra.
- Nada visible: ninguna de esas clases se renderiza.

## Test de Regresión

- `ng build` sin el aviso de presupuesto de `workouts.page.ts`.
- El script de CSS muerto no reporta ninguna clase para este archivo.
- `npm run test:ci`.
