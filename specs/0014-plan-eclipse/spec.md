# Spec: el Plan (mesociclo) en Eclipse

> id: 0014-plan-eclipse
> refs: última vista de la app sin migrar junto con el login (0015).
>   Continúa 0008 (Entrenar), 0012 (editor de rutinas) y 0013 (Historial).
> status: draft
> created: 2026-09-20
> autor del contrato: sesión de rediseño Eclipse. **La implementación la
>   toma otra sesión**: leer `specs/PENDIENTES-ECLIPSE.md` antes de
>   empezar.

## Contexto

El Plan es un **mesociclo**: semanas, sesiones por semana y objetivos de
progresión. Son dos rutas y dos componentes:

| Archivo | Ruta | Líneas |
|---|---|---|
| `features/workouts/mesocycle/mesocycle.page.ts` | `/app/workouts/plan` | 329 |
| `features/workouts/mesocycle/builder/mesocycle-builder.page.ts` | `/app/workouts/plan/create` | 558 |
| `features/workouts/mesocycle/components/week-detail.component.ts` | (dentro del Plan) | 324 |
| `features/workouts/mesocycle/components/meso-timeline.component.ts` | (dentro del Plan) | 157 |

Es **Tier 2 — Trabajo**: se lee sentado, antes o después de entrenar,
no con el pulso alto. Objetivos de 44px (`--target-min`), piso de texto
13px (`--text-floor`), Anton solo por encima de 28px
(`--font-display-floor`).

Leído en el código, sin tocar nada (2026-09-20):

| Criterio | Hallazgo |
|---|---|
| 7 — Sistema | **60 colores escritos a mano** entre los cuatro archivos: `rgba(255,255,255,0.05 … 0.8)` para superficies y textos, `rgba(59,130,246,*)` (el **azul de la marca anterior**) en los cuatro, y `rgba(16,185,129,*)` (verde esmeralda) para "completado" |
| 4 — Legibilidad | Tamaños de `0.7rem` (**11.2px**) y `0.75rem` (**12px**) en las cuatro superficies: etiquetas de semana, estado de sesión y metadatos |
| 6 — Intensidad | Ninguna de las dos páginas **declara tier**, ninguna usa `app-header` ni marca bloques con `data-anim`, y ninguna llama `animateTierEnter()`: la entrada de vista no está orquestada |
| 4 — Legibilidad | `h2` desnudos ("Datos Generales", "Tus Sesiones", "Estrategia de Periodización", "Semana N", "No tienes un plan activo") a **1.2–1.25rem (19.2–20px)** con `font-weight: 700`: los toma la regla global de `h1, h2` y salen en **Anton bajo su piso de 28px**, con un peso que Anton no tiene. Es la misma causa que fix-038 en el Catálogo |
| 3 — Estados | "No tienes un plan activo" es un bloque propio con su `h2`, no usa `app-empty-state` |

> Los números de arriba salen de leer el código. **Antes de tocar nada
> hay que medirlos en el navegador** (ver "Cómo verificar"): la línea
> base medida es lo que hace verificable el resultado.

## Acceptance Criteria

- **AC-01** — Las dos páginas declaran `.tier-trabajo` en la raíz,
  marcan sus bloques con `data-anim="bloque"` y llaman
  `gsap.animateTierEnter()` en `ngAfterViewInit`, como Entrenar,
  Catálogo, editor de rutinas e Historial.
- **AC-02** — **0 colores escritos a mano** en los cuatro archivos: todo
  sale de tokens. Nada del azul anterior. El verde solo puede significar
  "logrado" (`--state-success`), nunca decorar.
- **AC-03** — **Ningún texto baja de 13px** (`--text-floor`) en las dos
  páginas ni en sus dos componentes.
- **AC-04** — **0 textos en Anton bajo 28px**. Los títulos de sección
  van en `--font-body` con peso alto, como "Todos tus entrenamientos" en
  Historial (0013). Las cifras (semana, series, objetivos) en
  `--font-data` con `tabular-nums`.
- **AC-05** — Todo objetivo táctil mide **≥ 44px** de alto y de ancho:
  botones de semana, tarjetas de sesión, acciones del creador, campos
  del formulario. Los campos de texto van a **16px** (debajo de eso iOS
  hace zoom al enfocar).
- **AC-06** — El estado sin plan usa `app-empty-state`, **con el mismo
  texto que hoy**. Igual cualquier otro estado vacío del creador.
- **AC-07** — Ningún texto cambia. Ni copys, ni etiquetas, ni el
  voseo: es rediseño visual, no de contenido.
- **AC-08** — `npm run test:ci` en verde y `ng build` sin avisos. Cada
  página tiene que quedar **dentro de su presupuesto de estilos**
  (10 kB aviso / 12 kB error por componente).

## Fuera de alcance

- La lógica del mesociclo, sus queries y su facade. Solo estilos,
  clases y marcado mínimo (envolver, mover un título de línea, cambiar
  un bloque propio por `app-empty-state`).
- El login: va en 0015.
- La animación de entrada de Historial y los demás pendientes anotados
  en `specs/PENDIENTES-ECLIPSE.md`.

## Riesgos

- **Cuatro archivos, dos de ellos grandes** (558 y 324 líneas). Si el
  presupuesto de estilos queda ajustado, mover a `tailwind.css` lo que
  se repita entre páginas (precedente: `.modal-btn-*` en 0011).
- Archivo (la tipografía de cuerpo) es más ancha que Anton: los títulos
  pueden ganar una línea. Hay que contar cuáles y revisar que ninguno
  quede cortado (precedente: fix-038).
- El creador es un formulario largo: subir los campos a 16px empuja el
  alto de cada fila. Revisar que no aparezcan cortes ni scroll
  horizontal a 375px.

## Cómo verificar

Navegador a **375×812**, con un plan de ejemplo. **No crear ni borrar
planes reales del usuario**: cargar los datos de ejemplo en memoria
desde la consola, como se hizo en 0013 con el historial.

Medición de línea base y de cierre (la misma consulta antes y después):

```js
// textos bajo el piso, Anton bajo su piso, objetivos chicos
const hojas = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim());
const chicos = hojas.filter(e => parseFloat(getComputedStyle(e).fontSize) < 13);
const anton = hojas.filter(e => {
  const c = getComputedStyle(e);
  return c.fontFamily.split(',')[0].replace(/["']/g, '') === 'Anton' && parseFloat(c.fontSize) < 28;
});
const objetivos = [...document.querySelectorAll('button, a, ion-item[button], input, ion-input, select')]
  .map(b => ({ t: b.innerText?.trim().slice(0, 20), ...b.getBoundingClientRect().toJSON() }))
  .filter(b => b.height < 44 || b.width < 44);
({ chicos: chicos.length, anton: anton.length, objetivos });
```

Estados a recorrer: **plan activo** (con su semana seleccionada y el
detalle de semana abierto), **sin plan**, y el **creador** en sus tres
secciones. En cada uno: 0 textos bajo 13px, 0 en Anton bajo 28px, 0
objetivos bajo 44px, y ningún texto que quede cortado o que gane una
línea sin que se haya anotado.

Cierre: escribir `specs/0014-plan-eclipse/acceptance.md` con la
evidencia medida (antes/después por estado), igual que
`specs/0013-historial/acceptance.md`.
