# Fix: los colores con nombre de Ionic siguen en su paleta azul

> id: fix-030-ionic-colores-con-nombre
> refs: pendiente anotado en fix-028 ("se propone por separado").
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Verificado en navegador: `--ion-color-primary` vale
> `#ff6a1a` (shade `#e05d17`, tint `#ff8a4d`), `medium` `#857a73`,
> `danger` `#e8455a`, `success` `#10b981` y `warning` `#ffc83d`. Un
> elemento con la clase `ion-color-primary` resuelve `--ion-color-base`
> al ember y su contraste a la tinta, igual que `danger` y `medium`.
> Tests: 107 en verde. El build compila; su único aviso es el presupuesto
> de estilos de Entrenar, que resuelve fix-032.
>
> Se midió sobre la variable que usan los componentes, no sobre un
> spinner renderizado: la sesión del panel había expirado y las vistas con
> spinner piden login.

## Síntoma

fix-028 llevó a Eclipse el fondo, el texto y las superficies de Ionic,
pero no sus **colores con nombre**:

- todo `color="primary"` sigue en el azul de Ionic (`#4d8dff`): los
  spinners de carga de Entrenar, Catálogo, Historial y el selector de
  ejercicios, y el botón Guardar del editor de rutinas. Eclipse no tiene
  azul;
- `medium` (volver y cancelar en el editor de rutinas y en la sesión
  activa) sale en un gris neutro;
- `danger` (borrar serie en la sesión activa) sale en un rojo que no es
  el de Eclipse.

## Causa raíz

`src/theme/variables.css` no define ninguna `--ion-color-*`, así que
rige la paleta de `dark.always.css`.

## Cambio

En `variables.css`, después del mapeo de fix-028, se definen los colores
con nombre que la app usa o que tienen equivalente semántico en Eclipse:

| Color de Ionic | Antes | Después | Texto encima (tinta) |
|---|---|---|---|
| `primary` | `#4d8dff` | ember, `--color-primary` | 7.0:1 |
| `medium` | `#989aa2` | `--text-muted` | ~4.8:1 |
| `danger` | `#f24c58` | `--state-error` | ~5.2:1 |
| `success` | `#2dd55b` | `--state-success` | ~7.9:1 |
| `warning` | `#ffce31` | `--state-warning` (oro) | ~13:1 |

Cada uno lleva sus seis variables (base, `-rgb`, `-contrast`,
`-contrast-rgb`, `-shade`, `-tint`). `-shade` y `-tint` siguen la fórmula
de Ionic (12% hacia negro, 10% hacia blanco), salvo el `-tint` del
primario, que usa `--color-primary-hover`, ya existente. Los canales
`-rgb` van en literal por la misma razón que en fix-028.

## No cambia

- `secondary`, `tertiary`, `light` y `dark`: sin uso en la app y sin
  equivalente en Eclipse.

## Test de Regresión

- Navegador: `--ion-color-primary` vale `#ff6a1a`, y un
  `ion-spinner color="primary"` pinta `rgb(255, 106, 26)`.
- `npm run test:ci` + `ng build`.
