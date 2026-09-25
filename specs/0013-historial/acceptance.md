# Acceptance — 0013-historial

> verificado: 2026-09-19, navegador a 375×812 (modo md), sobre fix-037.
> Cuatro sesiones de ejemplo cargadas **solo en memoria** en Historial y
> en Entrenar (la cuenta no tiene sesiones); nada se escribió.

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | `ion-content` de Historial lleva `tier-trabajo`. 0 textos bajo 13px (eran 13). "Todos tus entrenamientos" en Archivo negrita (era Anton a 16.8px); lo único en Anton es "Historial Completo", a 28px |
| AC-02 | ✅ | Tarjeta con los valores de Entrenar: `--bg-surface`, borde `--border-subtle`, cifras en Oswald `tabular-nums`, "kg"/"series" a 13px. Mismo contenido y mismos textos |
| AC-03 | ✅ | Etiquetas neutras a 13px (`#9c9189` sobre `--bg-elevated`) en las dos páginas, sin azul. En Entrenar, `.card-exercises` pasa de `block` a `flex` con separación: "Press de banca", "Remo con barra", "Sentadilla" y "Curl de bíceps" ya no salen pegados |
| AC-04 | ✅ | `rgba(` y hex en `history.page.ts`: 0. Sin sesiones, Historial muestra `app-empty-state` ("Aún no has registrado sesiones") |
| AC-05 | ✅ | `npm run test:ci`: 128 pasan. `ng build` sin avisos: Entrenar sigue dentro del presupuesto de 10 kB con las dos reglas nuevas |

Tocar una tarjeta de Historial abre el detalle de 0008, con su título ya
en Archivo (fix-037).

**Visto y fuera de alcance:** la entrada animada de la lista de
Historial (`staggerListItems`) tarda unos 5 segundos en asentar la cuarta
tarjeta y se reinicia cada vez que cambia el historial. No es de diseño
estático; se anota para una spec de movimiento.
