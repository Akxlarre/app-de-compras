# Acceptance — 0008-entrenar-detalle-sesion

> verificado: 2026-09-18, navegador a 375×812 (modo md), con la sesión
> del usuario.

La cuenta no tenía sesiones registradas, así que el detalle se abrió con
una sesión de ejemplo cargada **solo en memoria** (`history.set()` desde
la consola). No se escribió nada en la base de datos.

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | `app-session-detail` se renderiza dentro del `ion-modal` de Entrenar y del de Historial; las dos copias en línea ya no existen |
| AC-02 | ✅ | Texto más chico del detalle: **13px** en las dos páginas (antes 12.8px las etiquetas y 10.4px las insignias). Las 13 cifras (duración, KPIs, energía, RPE, kg, reps) van en Oswald con `tabular-nums`; los KPIs en hueso `#f5f0e6` |
| AC-03 | ✅ | W, D y F: texto `#9c9189`, borde `--border-strong`, fondo transparente, 13px. `aria-label` "Calentamiento", "Drop set", "Al fallo". Test de componente cubre los nombres y que una serie normal no lleve insignia |
| AC-04 | ✅ | "Limpiar filtros" en el Catálogo (búsqueda sin resultados): **44px** de alto (antes 14px) |
| AC-05 | ✅ | `rgba(` y hex: 0 coincidencias en `workouts.page.ts` y en el detalle. La tarjeta de rutina, ahora visible, mide `#140e11` de fondo y `--border-default`; "1 ejercicio" e "Iniciar →" a 13px |
| AC-06 | ✅ | `npm run test:ci`: 110 tests pasan (33 archivos). `ng build`: compila |

## Hallazgo fuera de alcance

Al medir el botón del estado vacío apareció la causa de sus 14px:
`@ionic/angular/css/normalize.css` entra por `angular.json` **sin capa**,
y su regla `button { padding: 0; border: 0; border-radius: 0 }` le gana a
todas las utilidades de Tailwind, que viven en `@layer utilities`. Pasa en
todos los `<button>` de la app que usan `px-*`, `py-*`, `border` o
`rounded-*`. De forma parecida, el reset de Tailwind le quita el padding
a `ion-title`, que queda pegado al borde de la pantalla en el modal del
detalle, el editor de rutinas y el mesociclo.

Es un choque de cascada global: va en su propio track (fix-036).
