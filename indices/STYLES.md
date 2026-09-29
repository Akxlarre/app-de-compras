<!-- spec-version: 2026-09-10 -->
<!-- auto-refresh: indices:sync -->

# Registro de Estilos & Design System

> **Regla de Actualización:** El Agente debe consultar esta tabla ANTES de crear estilos nuevos. Si ya existe una clase o token que resuelve la necesidad, **reutilizar**. Añadir a esta tabla cada vez que se cree un archivo de estilos nuevo.

## Design Tokens

| Archivo | Responsabilidad | Ubicación | Estado |
|---------|----------------|-----------|--------|
| `_variables.scss` | Tokens del Design System (4 capas): escala (paleta Eclipse `--brand-*`, espaciado, radios, ergonomía, tipografía, motion), semántica (superficies, texto, bordes, sombras, estados), marca (ember, gradientes, acciones), componentes (btn, input, card, motion). **Tema único dark** — sin bloque `[data-mode]`. | `styles/tokens/_variables.scss` | ✅ Estable |

### Paleta Eclipse — ratios sobre `--bg-base`

| Token | Hex | Rol | Contraste |
|---|---|---|---|
| `--brand-ink` | `#0A0608` | Fondo base | — |
| `--brand-bone` | `#F5F0E6` | Dato crítico | 17.7:1 |
| `--brand-gold` | `#FFC83D` | Corona, foco, warning (contorno) | 13.0:1 |
| `--brand-ember` | `#FF6A1A` | Marca, estado activo | 7.0:1 |
| `--brand-crimson` | `#A50E22` | Suelo de ceremonia (bone encima: 6.9:1) | — |
| `--brand-iron` | `#2A2226` | Borde decorativo, nunca texto | 1.3:1 |

> **Regla de estados:** la forma manda, no el tono. Error/éxito/aviso/info se
> reconocen por ícono + textura de borde + posición. El oro de marca es relleno
> o resplandor; el oro semántico siempre contorno. El verde solo significa
> "logrado" y no aparece en ningún otro lugar.

### Ergonomía y tipografía — pisos duros

| Token | Valor | Regla |
|---|---|---|
| `--target-min` | `44px` | Objetivo táctil en Tier 1 y 2 |
| `--target-min-critical` | `56px` | Tier 3 (sesión activa) |
| `--text-floor` | `13px` | Ningún texto baja de acá |
| `--font-display-floor` | `28px` | Anton deja de ser legible debajo |
| `--font-display` | Anton | Impacto. Prohibido en datos, etiquetas y Tier 3 |
| `--font-data` | Oswald | Números — siempre con `tabular-nums` |
| `--font-body` | Archivo | Microcopy y todo lo que se lee rápido |

> `body` lleva `font-synthesis-weight: none`: Anton solo existe en peso 400 y
> sin esto el navegador fabrica negritas sucias cuando un componente pide 700+.

## Utilities (Tailwind v4)

| Archivo | Responsabilidad | Ubicación | Estado |
|---------|----------------|-----------|--------|
| `tailwind.css` | Capa de utilidades Tailwind v4. Mapea tokens del design system vía `@theme` para clases como `text-text-secondary`, `bg-surface`, `rounded-lg`. Incluye `@utility btn-primary`, `@utility btn-secondary` y `@utility btn-ghost` (3 tiers de botones del DS). No usa Preflight (PrimeNG tiene su propio reset). | `src/tailwind.css` | ✅ Estable |
| `postcss.config.mjs` | Configuración PostCSS para Tailwind v4 (`@tailwindcss/postcss` plugin). | `postcss.config.mjs` (root) | ✅ Estable |

## Layout

| Archivo | Clases principales | Ubicación | README | Estado |
|---------|-------------------|-----------|--------|--------|
| `_tiers.scss` | `.tier-ceremonia`, `.tier-trabajo`, `.tier-dato` (raíz de vista) + `.tier-repetido`, `.tier-target`, `.tier-ground`, `.tier-cronometro`. Exponen `--tier-border`, `--tier-pad`, `--tier-gap`, `--tier-target`, `--tier-ground`, `--tier-flame` | `styles/layout/_tiers.scss` | — | ✅ Estable |
| `_bento-grid.scss` | `.bento-grid`, `.bento-square`, `.bento-wide`, `.bento-tall`, `.bento-feature`, `.bento-hero`, `.bento-banner`, `.bento-card`, `.bento-media` + data-attributes de placement | `styles/layout/_bento-grid.scss` | `_bento-grid.README.md` | ✅ Estable |
| `_page-shell.scss` | `.page-centered`, `.page-narrow`, `.page-content`, `.page-wide`, `.page-split`, `.page-header`, `.page-section`, `.page-empty` | `styles/layout/_page-shell.scss` | `_page-shell.README.md` | ✅ Estable |

## Motion

| Archivo | Responsabilidad | Ubicación | README | Estado |
|---------|----------------|-----------|--------|--------|
| `_view-transitions.scss` | View Transitions API: page navigation (page-out/in asimétrico) + theme switch (reveal circular desde clic). Requiere `view-transition-name: main-content` en `.shell-content`. | `styles/motion/_view-transitions.scss` | `_view-transitions.README.md` | ✅ Estable |

## Vendors

| Archivo | Responsabilidad | Ubicación | Estado |
|---------|----------------|-----------|--------|
| `_primeng-overrides.scss` | Mapeo de tokens PrimeNG a Design System. Overrides de toast, buttons, tables, stepper, datepicker, skeleton, dark mode fixes. | `styles/vendors/_primeng-overrides.scss` | ✅ Estable |
| `variables.css` | Tema de Ionic. Importa `dark.always.css`, así Ionic **no sigue el modo del teléfono**, y mapea `--ion-background-color`, `--ion-text-color` y los fondos de item, toolbar, tab bar y card a tokens Eclipse (fix-028). Se carga último en `angular.json`: sobreescribir variables `--ion-*` aquí, no en `_variables.scss`. `--ion-color-primary` apunta a ember (`var(--color-primary)`). | `src/theme/variables.css` | ✅ Estable |

## Estilos Globales (`styles.scss`)

| Concepto | Clases/Selectores | Propósito |
|----------|-------------------|-----------|
| Fondo de vista | `ion-content` | `--background: var(--ion-background-color)`: tinta en toda vista. Una vista no necesita fijar su fondo. |
| Scroll locks | `body.layout-drawer-open`, `body.modal-open` | Bloqueo de scroll en drawer mobile y modales |
| Modal overlay | `.modal-overlay__wrapper` | Posicionamiento fijo del overlay de modales (z-index > topbar) |

<!-- DETAIL:BEGIN -->
## Reglas de Uso

1. **Layouts de página**: usar `.page-centered`, `.page-narrow`, `.page-wide`, etc. — NO crear max-width ad-hoc
2. **Grids de dashboard**: usar `.bento-grid` con clases de proporción — NO crear grids custom
3. **Colores y espaciado**: usar tokens `var(--*)` de `_variables.scss` — NUNCA valores hex/px directos
4. **Componentes PrimeNG**: los overrides ya están en `_primeng-overrides.scss` — NO sobrescribir en componentes individuales
5. **Animaciones de página**: usar View Transitions API (`_view-transitions.scss`) — NO crear transiciones de ruta custom
