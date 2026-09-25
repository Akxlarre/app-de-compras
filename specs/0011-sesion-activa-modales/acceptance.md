# Acceptance — 0011-sesion-activa-modales

> verificado: 2026-09-18, navegador a 375×812 (modo md). Los seis
> modales se abrieron desde el estado de la página con la sesión de
> ejemplo de 0010, sin confirmar ninguno. Al final la sesión de ejemplo
> se borró: `fittrack_active_workout`, `fittrack_rest_timer` y
> `fittrack_pending_sync` quedaron vacíos, como estaban.

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | En los seis modales todo objetivo mide 56px o más: cerrar 56×56 (era 32), tipo de serie 301×56, categorías 146×56 (eran 34), calificación, energía y RPE 57×56 (eran 54×34, 54×37 y 26×31), notas 275×56 (era 44), pie 142×56. RPE en dos filas de cinco |
| AC-02 | ✅ | Título de `app-modal` en Archivo 18px 700 (era Anton 18px). Cerrar lee el tier: 56 en la sesión activa y **44 en el modal de borrar rutina de Entrenar**, medido; sus botones también quedan en 44 |
| AC-03 | ✅ | Elegido: borde `#ff6a1a` y `--color-primary-muted` de fondo. "Continuar", "Guardar" y "Terminar y Guardar": ember con tinta. Descartar y Eliminar en `--state-error-*`. Series incompletas en `--state-warning-*`. Tipos de serie: letra neutra con borde `--border-strong`. Ningún azul, violeta ni amarillo de antes en los seis |
| AC-04 | ✅ | `rgba(` y hex en `active-workout.page.ts`: 0 (tenía 98 antes de 0010) |
| AC-05 | ✅ | `ng build` sin avisos. Los estilos de la página: 11.06 kB → 10.95 (modales a tokens) → 10.31 (`.modal-btn-*` a `tailwind.css`) → bajo 10 kB (estado vacío a `app-empty-state`) |
| AC-06 | ✅ | `npm run test:ci`: 112 tests pasan |

**Agregado al hacerlo** (anotado en el plan):

- `.modal-btn-*` vive ahora en `tailwind.css`, `@layer components`: era
  una copia por página y `app-modal` no puede darle estilo a lo que se
  le proyecta. Sale el duplicado de `workouts.page.ts`.
- "No hay entrenamiento activo" usa `app-empty-state` con el mismo
  texto. Visto en navegador sin sesión.

**Sin verificar:** "Terminar y Guardar" hasta el final, porque escribe
en la base; el botón se midió pero no se tocó.
