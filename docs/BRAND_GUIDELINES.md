# Brand Guidelines y Theming (v2.0 - E-Commerce/Shopping Dark)

> Este documento es la guía de alto nivel para la App de Compras.

## Stack de Estilos

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Design Tokens | SCSS (`_variables.scss`) | Colores vibrantes, espaciado generoso, dark mode base, radios altos. |
| Layouts | SCSS (`_page-shell.scss`) | Navegación enfocada en uso a una mano (Bottom Tabs, Floating CTAs). |
| Vendors | SCSS (`_primeng-overrides.scss`, `_ionic.scss`) | Mapeo de PrimeNG/Ionic al nuevo sistema fluido. |
| Utilidades | Tailwind CSS v4 | Clases mapeadas a tokens (espaciado rápido, flex). |
| Animaciones | GSAP + Ionic | Transiciones de bottom-sheets, swipe-to-delete, interacciones físicas. |

## El Foco Visual (Rappi / Cornershop Dark Mode)

La aplicación ya no es un "Dashboard" rígido (adiós bento-grid como estructura principal). Ahora es una **App de Consumo Fluida**:
1. **Fondo Profundo:** Fondos base muy oscuros (`bg-base`) pero con superficies (`bg-surface`) que resalten sutilmente.
2. **Acentos Vibrantes:** Un color de marca "Neón" o altamente saturado (Ej: Verde Limón, Naranja Cornershop o Magenta) para botones primarios y CTAs.
3. **Bordes Suavizados:** Radios grandes (`rounded-2xl`, `rounded-3xl`) tipo iOS/Material You para tarjetas de productos.
4. **UX a Una Mano:** Botones clave y buscadores siempre en la parte inferior o flotando, fácilmente alcanzables con el pulgar en el pasillo del supermercado.
5. **Menos Bordes, Más Espacio:** Usar márgenes amplios en lugar de líneas rígidas para separar elementos.

## Regla #1 — Siempre usar Tokens Semánticos

```html
<!-- ✅ Correcto -->
<p class="text-muted text-sm">Categoría</p>
<div class="bg-surface rounded-2xl shadow-lg p-4">...</div>

<!-- ❌ Prohibido (Tailwind arbitrario) -->
<p class="text-[#52525b]">Nunca hardcodear</p>
```

## Regla #2 — Jerarquía de Superficies

```
bg-base      → Fondo principal de la app (el más oscuro)
bg-surface   → Tarjetas de productos, Bottom Sheets, Modales
bg-elevated  → Elementos que flotan sobre cards (ej. pill de cantidad)
bg-brand     → El botón de "Finalizar Compra" o el FAB de "Añadir"
```

## Regla #3 — UX de Compras (Interacciones)

- **Añadir/Editar:** Usaremos Bottom Sheets (modales que emergen desde abajo) en lugar de diálogos centrados que obligan a estirar el dedo.
- **Acciones Destructivas:** Swipe-to-delete nativo (Ionic `ion-item-sliding`).
- **Feedback Visual:** Micro-animaciones al marcar un producto como comprado (Ej. GSAP scale rebote, o un check que se pinta del color `brand`).

## Reglas que se mantienen

- Detección de cambios `OnPush` estricta.
- Facades como fuente de la verdad.
- No usar emojis como íconos de UI, usar `<app-icon>`.
