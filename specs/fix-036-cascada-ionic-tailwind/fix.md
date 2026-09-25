# Fix: Ionic y Tailwind se pisan en la cascada

> id: fix-036-cascada-ionic-tailwind
> refs: hallazgo al verificar AC-04 de 0008 (el botón del estado vacío
>   medía 14px de alto aunque tenía `py-2`).
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Comparación antes/después en 11 estados (375×812, md), con
> todo botón, encabezado, párrafo, enlace y título medido: 0 diferencias
> en Catálogo (72 elementos), Entrenar (sin y con historial), Historial y
> Perfil. Las que aparecieron son todas la clase que por fin se aplica:
>
> - "Limpiar filtros": padding 0 → 16px laterales, radio 0 → píldora,
>   borde 0 → 1px.
> - `ion-title` (Detalle de Sesión, Nueva Rutina, Mesocycle Manager,
>   Creador de Plan): padding lateral 0 → 20px. En iOS
>   (`?ionic:mode=ios`): 90px y centrado, sin chocar con "Back" ni con
>   "Guardar".
> - `btn-primary` y `btn-secondary`: por fin aplican su
>   `line-height: var(--leading-tight)`; `normalize.css` les imponía
>   `line-height: 1`. Crecen de 52 a 59px ("Crear Plan Manualmente",
>   "Volver") y de 40 a 43px ("Siguiente").
> - Coach (versión de esta rama; la migrada está en el PR de 0006): los
>   tres chips y el botón de borrar reciben su `px-3 py-1.5
>   rounded-full` y `p-1.5`; el `h1` recibe `text-xl` y `m-0`.
> - Encabezados: la base del proyecto (`_variables.scss`: h1/h2 en Anton
>   a peso regular, h3–h6 en negrita) ahora le gana al 500 de Ionic, que
>   la pisaba por cargarse después. En Anton no cambia el glifo: tiene un
>   solo peso.
>
> Tests: 110 en verde. `ng build` compila sin avisos; el CSS de
> producción trae el orden de capas y **una** sola copia del reset de
> Ionic, dentro de `@layer ionic`.
>
> **Sin verificar en navegador:** la pantalla de login (hace falta
> cerrar la sesión del usuario). Sus botones usan `p-0 border-none`, que
> igualan lo que ya hacía el reset de Ionic; solo "Iniciar Sesión" cambia
> de radio 0 a `rounded-xl`, igual que "Guardar contraseña" en
> `/reset-password`, que sí se midió (radio 20px).

## Síntoma

Medido en navegador (375×812, modo md), no asumido:

- **Las utilidades de Tailwind no llegan a los `<button>`.** "Limpiar
  filtros" tiene `px-4 py-2 rounded-full border` y renderiza con padding
  `0`, radio `0` y borde de `0px`: un rectángulo sin borde pegado al
  texto. Pasa en los 23 botones de 8 archivos que usan utilidades de
  padding, radio o borde, y también en `btn-primary`, `btn-secondary` y
  `btn-ghost`, que definen su padding y su radio como utilidades.
- **El título de los modales queda pegado al borde de la pantalla.**
  "Detalle de Sesión" empieza en `x = 0`. Mismo caso en el editor de
  rutinas y en las páginas del mesociclo: todo `ion-title`.

## Causa raíz

Son dos choques distintos entre los estilos globales de Ionic y los de
Tailwind v4.

1. **Ionic entra sin capa y Tailwind con capa.** `angular.json` carga
   los CSS de Ionic como archivos sueltos, sin `@layer`. Tailwind v4 pone
   sus utilidades en `@layer utilities`, y en la cascada **una regla sin
   capa le gana a cualquier regla con capa**, sin importar la
   especificidad. Así, `button { padding: 0; border: 0; border-radius: 0 }`
   de `normalize.css` le gana a `.px-4` o a `.rounded-full`. Lo mismo hace
   `typography.css` con `h1`–`h6` (márgenes, tamaño y peso) frente a
   `.m-0`, `.text-sm` o `.font-bold`.
2. **El reset de Tailwind anula el `:host` de Ionic.** El preflight de
   Tailwind sí está activo: el comentario "Disable Preflight" de
   `tailwind.css` deja un `@layer base {}` vacío, que no lo desactiva. Su
   `* { padding: 0; margin: 0 }` se aplica desde afuera del shadow DOM, y
   en la cascada las reglas de afuera le ganan al `:host` de adentro.
   `ion-title` pierde sus 20px (md) o 90px (iOS) de padding lateral.

## Cambio

1. **`tailwind.css`**: se declara el orden de capas
   `theme, base, ionic, components, utilities` y `normalize.css` y
   `typography.css` de Ionic se importan en la capa `ionic`:
   - siguen ganándole al preflight (`base`), como hoy;
   - las utilidades de Tailwind les ganan, que es el arreglo;
   - los estilos sin capa (`styles.scss`, los estilos de componentes) les
     siguen ganando, como hoy.
2. **`angular.json`**: esos dos archivos salen de la lista de `styles`,
   para no cargarlos dos veces.
3. **`tailwind.css`, dentro de `@layer base`**:
   `ion-title { padding: revert-layer }`. Retira el preflight solo para
   `ion-title` y devuelve el control a su `:host`, con los valores de
   Ionic para cada modo y variante, sin copiarlos a mano. Probado en
   navegador antes de escribirlo: 0px → 20px en md.
4. **`tailwind.css`**: el comentario "Disable Preflight" pasa a decir lo
   que hace de verdad.

## No cambia

- **El resto de los CSS de Ionic** (`core`, `structure`, `display`,
  `padding`, `float-elements`, `text-alignment`, `text-transformation`,
  `flex-utils`) quedan como están: sus reglas son de clase (`.ion-*`) o
  de estructura (`html`, `body`) y no chocan con utilidades.
- **El preflight en otros elementos de Ionic** (`ion-toolbar`,
  `ion-searchbar`, `ion-chip`, `ion-card`…): también les quita padding y
  margen, pero las vistas se ajustaron con ese valor medido. Devolvérselo
  movería vistas ya revisadas. Solo `ion-title` se ve roto hoy.

## Riesgo

Todo botón o encabezado con utilidades de Tailwind **va a cambiar de
aspecto**: por fin se aplica lo que dice su clase. Se captura la
geometría de cada botón, encabezado, párrafo, enlace y título en 11
estados de la app **antes** del cambio, y se compara **después**,
elemento por elemento. Cada diferencia se revisa: tiene que ser la clase
que por fin se aplica, no un efecto colateral.

## Test de Regresión

- Navegador a 375×812, modo md: comparación antes/después en Entrenar
  (sin y con historial), detalle de sesión, Historial, Catálogo (lista y
  búsqueda vacía), Perfil, Coach, editor de rutina nueva, Plan y creador
  de plan. "Limpiar filtros" con padding, radio y borde. `ion-title` con
  20px de padding.
- `ion-title` en modo iOS (`?ionic:mode=ios`): 90px, centrado.
- `npm run test:ci` + `ng build`.
