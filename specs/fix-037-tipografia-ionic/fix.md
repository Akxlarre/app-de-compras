# Fix: Ionic escribe todo en Roboto

> id: fix-037-tipografia-ionic
> refs: hallazgo al medir la línea base de Historial (0013): sus cifras
>   y el título del detalle salían en Roboto.
> status: done
> created: 2026-09-19
> closed: 2026-09-19
>
> **Cierre.** Mismas ocho vistas antes y después (375×812, md): **0
> textos en Roboto** (eran 257 entre todas), 0 textos que ganen líneas y
> 0 que pasen a cortarse. Catálogo: 131 textos en Archivo; editor de
> rutina: 43; Historial: 35; Entrenar: 38 (más 13 en Oswald y 2 en
> Anton, que ya declaraban la suya). En iOS (`?ionic:mode=ios`), donde
> Ionic usaba la fuente del sistema, el Catálogo también queda en
> Archivo. Tests: 128 en verde. `ng build` sin avisos.
>
> **Sin verificar:** la sesión activa, que no tenía sesión en curso, y
> la pantalla de login, que necesita cerrar la sesión del usuario. Las
> dos usan el mismo `ion-content`.

## Síntoma

Medido en navegador (375×812, modo md), contando la tipografía de cada
texto visible:

| Vista | Roboto | Archivo |
|---|---|---|
| Catálogo | **131** | 0 |
| Editor de rutina | **40** | 3 |
| Historial | **35** | 0 |
| Entrenar | **18** | 20 |
| Creador de plan | 12 | 0 |
| Perfil | 7 | 0 |
| Plan | 4 | 0 |

La tipografía de cuerpo de Eclipse es **Archivo** (`--font-body`). El
`body` sí la usa, pero casi todo lo que está dentro de la app sale en
Roboto: solo se salva lo que un componente declaró a mano.

## Causa raíz

`ion-content` fija `font-family: var(--ion-font-family)` en su `:host`, y
Ionic define esa variable según el modo: Roboto en Android (md) y la
fuente del sistema en iOS. fix-028 mapeó los colores de Ionic a Eclipse
pero no esta variable, así que toda vista, título de barra, botón y
campo de Ionic vuelve a la tipografía de Ionic.

## Cambio

**`src/theme/variables.css`**: `--ion-font-family: var(--font-body)` en
el mismo bloque que mapea las variables de aplicación de Ionic (con los
mismos selectores `:root`, `:root.ios`, `:root.md`, que ganan por venir
después).

## No cambia

- Lo que ya declara su tipografía: Anton en títulos grandes, Oswald en
  cifras.
- Los nombres de ejercicio del Catálogo en Anton a 16px: son `h2` y los
  toma la regla global de `h1, h2`. Es otra causa; se anota aparte.

## Riesgo

Archivo y Roboto no tienen el mismo ancho: un texto puede pasar a otra
línea o cortarse. Se captura cada vista **antes** y se compara
**después**: qué textos ganan líneas y cuáles pasan a cortarse.

## Test de Regresión

- Navegador a 375×812: en Entrenar (con historial de ejemplo),
  Historial, Catálogo, Perfil, Coach, editor de rutina (borrador en
  memoria), Plan y creador de plan, 0 textos en Roboto; revisar cada
  texto que gane líneas o se corte.
- `npm run test:ci` + `ng build`.
