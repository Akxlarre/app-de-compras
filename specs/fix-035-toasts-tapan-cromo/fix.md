# Fix: los toasts tapan la barra de sesión y usan colores de PrimeNG

> id: fix-035-toasts-tapan-cromo
> refs: detectado al verificar fix-034. Afecta a todos los toasts.
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Remedido en navegador con el mismo toast informativo y una
> sesión en curso:
>
> - el toast queda en y=16–98, sin superponerse con la barra de sesión
>   (808) ni con los tabs;
> - entra entero en pantalla, con márgenes de 16px;
> - fondo opaco, borde y título en cian (título 12.2:1), detalle en hueso
>   (18.5:1);
> - botón de cerrar de 44×44.
>
> Tests: 102 en verde. Build compila. Los colores de éxito, error y aviso
> se leen de las mismas variables y no se dispararon en navegador.

## Síntoma

Medido en navegador con un toast informativo y una sesión en curso:

- **Tapa la navegación.** El toast ocupa y=808–890 y la barra de sesión
  y los tabs están en y=808–922: los cubre por completo mientras dura.
- **El detalle es casi ilegible.** El texto del detalle sale en
  `#334155`, gris pizarra oscuro sobre fondo oscuro.
- **Colores fuera de Eclipse.** Título, ícono y borde en el azul de
  PrimeNG (`#2563eb`), no en el cian de estado. Lo mismo pasa con éxito,
  error y aviso, que usan sus colores de Aura.
- **Fondo translúcido.** Es el color de estado al 10%, así que se ve lo
  que hay debajo del toast.
- **El botón de cerrar mide 32px**, bajo el piso de 44.

## Causa raíz

1. `_primeng-overrides.scss` define `--p-toast-<sev>-text-color`, una
   variable que **PrimeNG 20 no lee**. PrimeNG usa `--p-toast-<sev>-color`
   (título, ícono) y `--p-toast-<sev>-detail-color` (detalle), así que
   rigen los valores de Aura, pensados para un tema claro.
2. El `p-toast` está anclado abajo a la derecha (`app.component.ts`),
   justo donde vive el cromo del shell: tabs y barra de sesión.

## Cambio

1. **`_primeng-overrides.scss`, variables** (info, success, error, warn):
   - `-color` pasa al color de estado;
   - `-detail-color` pasa a `--text-primary`;
   - el fondo pasa a opaco, con el color de estado al 12% sobre
     `--bg-elevated` (`color-mix`);
   - la sombra pasa a `--shadow-md`;
   - el hover del botón de cerrar pasa a `--state-<sev>-bg`.

   Salen las `-text-color`, que no hacían nada.
2. **`_primeng-overrides.scss`, reglas**: el botón de cerrar mide
   `--target-min`, sin los `rgba(0,0,0,…)` pensados para fondo claro. La
   barra de progreso por defecto usa `--border-strong`. El offset del
   toast superior pasa a `env(safe-area-inset-top) + --space-4`: el
   `4rem` era para una barra superior que ya no existe.
3. **`app.component.ts`**: `position="top-center"`. Arriba no hay
   navegación que tapar, con o sin sesión, en cualquier ruta.

   > **Ajuste al verificar.** Arriba al centro, PrimeNG centra con
   > `translateX(-50%)`, y el breakpoint móvil (`left: 0`) no lo anulaba:
   > el toast quedaba medio fuera de pantalla. El breakpoint pasa a
   > `left/right: 1rem` con `transform: none`.

## Test de Regresión

- Navegador: con sesión en curso, un toast no se superpone con la barra
  de sesión ni con los tabs. El título y el ícono salen en el color de
  estado, el detalle en hueso con contraste ≥ 4.5:1, el fondo es opaco y
  el botón de cerrar mide 44px.
- `npm run test:ci` + `ng build`.
