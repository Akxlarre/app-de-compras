# Fix: Ionic pinta su propio gris y depende del modo del teléfono

> id: fix-028-ionic-fuera-de-paleta
> refs: detectado al retomar AC-04 de 0004. El usuario eligió arreglarlo
>   para toda la app en vez de vista por vista.
> status: done
> created: 2026-09-15
> closed: 2026-09-15
>
> **Cierre.** Verificado en navegador en modo oscuro y en modo claro
> emulado. `--ion-background-color` vale `#0a0608` en los dos modos
> (antes, en modo claro, no existía), y el fondo renderizado de Catálogo,
> Perfil y Entrenar es `rgb(10, 6, 8)` en ambos. `--ion-item-background`
> y `--ion-toolbar-background` quedan en `#140e11`. Tests: 94 en verde.
> El build compila; sus avisos no son de este fix (dos NG8107 de
> encadenamiento opcional, y los estilos de `workouts.page.ts` pasan en
> 88 bytes el presupuesto de 10 kB).
>
> **Sin verificar:** en un teléfono real. La emulación de
> `prefers-color-scheme` reproduce la condición, pero no se probó en un
> dispositivo. Tampoco se abrieron modales ni alertas de Ionic para ver
> sus fondos.

## Síntoma

Medido en navegador, no asumido:

- **El fondo no es de la paleta.** Toda vista que no fija su fondo a
  mano pinta `#121212`, el gris de Ionic, en vez de la tinta de Eclipse
  (`#0a0608`). Medido en Catálogo y Perfil. Entrenar se ve bien solo
  porque lo sobreescribe localmente.
- **Con el teléfono en modo claro, la paleta oscura de Ionic desaparece
  entera.** `--ion-background-color`, `--ion-item-background` y
  `--ion-toolbar-background` quedan indefinidas, y `--ion-color-primary`
  vuelve al azul de Ionic para tema claro (`#0054e9`). Medido emulando
  `prefers-color-scheme: light`. El fondo sigue oscuro solo porque
  `styles.scss` lo rescata con un `#121212` escrito a mano.

## Causa raíz

`src/theme/variables.css` importa
`@ionic/angular/css/palettes/dark.system.css`, que tiene dos problemas:

1. **Sigue al sistema.** Todo el archivo está dentro de
   `@media (prefers-color-scheme: dark)`. Eclipse es un tema oscuro único
   (spec 0001: se eliminó la paleta clara), pero Ionic sigue al teléfono.
2. **Nunca se mapeó a Eclipse.** Ningún archivo de `src/` define
   variables `--ion-*`, así que Ionic usa sus grises neutros (`#121212`,
   `#1e1e1e`, `#1f1f1f`).

## Cambio

1. **`variables.css`**: `dark.system.css` pasa a `dark.always.css`. Los
   valores oscuros internos de Ionic aplican siempre, sin importar el
   modo del teléfono.
2. **`variables.css`, después del import**: las variables de aplicación
   de Ionic apuntan a tokens de Eclipse. Se usan los mismos selectores
   que la paleta (`:root`, `:root.ios`, `:root.md`), así el mapeo gana
   por orden de carga y no depende de subir la especificidad.

   | Variable de Ionic | Antes (md) | Después |
   |---|---|---|
   | `--ion-background-color` | `#121212` | `var(--bg-base)` |
   | `--ion-text-color` | `#ffffff` | `var(--text-primary)` |
   | `--ion-item-background` | `#1e1e1e` | `var(--bg-surface)` |
   | `--ion-toolbar-background` | `#1f1f1f` | `var(--bg-surface)` |
   | `--ion-tab-bar-background` | `#1f1f1f` | `var(--bg-surface)` |
   | `--ion-tab-bar-background-focused` | `#353535` | `var(--bg-elevated)` |
   | `--ion-card-background` | `#1e1e1e` | `var(--bg-surface)` |
   | `--ion-background-color-rgb` / `--ion-text-color-rgb` | `18, 18, 18` / `255, 255, 255` | canales de la tinta y del hueso |

3. **`styles.scss`**: la regla global de `ion-content` pierde el
   respaldo `#121212`, que ya no puede activarse.

## No cambia

- **Escalones `--ion-*-step-*`**: siguen siendo los grises de Ionic. Los
  usan detalles internos de los componentes (bordes, rellenos sutiles).
- **`--ion-color-primary` y el resto de los colores con nombre**: siguen
  en el azul de Ionic. Afecta a los 13 `color="primary"` de la app
  (spinners, entre otros). Pasarlos al ember es una decisión de marca
  aparte y se propone por separado. Único efecto de este fix sobre
  ellos: en modo claro el azul pasa de `#0054e9` a `#4d8dff`, el mismo
  que ya se ve en modo oscuro.
- **Respaldos locales `var(--ion-background-color, #hex)`** de Perfil,
  Historial y Sesión activa: quedan inertes y se limpian al migrar cada
  vista. El del Catálogo se limpia en AC-04 de 0004.
- **`ion-modal { --background: #0d0d11 }`** en `styles.scss`: es otro
  hardcode, fuera de este fix.

## Test de Regresión

- Navegador, **en modo oscuro y en modo claro emulado**:
  `--ion-background-color` definida, y el fondo renderizado del
  `ion-content` de Catálogo y Perfil igual a `rgb(10, 6, 8)`. Entrenar
  sin cambios.
- `npm run test:ci` + `ng build`.
