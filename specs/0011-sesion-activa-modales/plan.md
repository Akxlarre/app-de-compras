# Plan técnico — 0011-sesion-activa-modales

## Estrategia

Que el tier mande, no cada modal. Cada `app-modal` de la sesión activa
lleva la clase `tier-dato`: define `--tier-target` en 56px y el
`app-modal` compartido lo lee con `var(--tier-target, var(--target-min))`.
Fuera de la sesión, el mismo modal sigue en 44.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `shared/components/modal/modal.component.ts` | Título en cuerpo negrita (no Anton a 18px); cerrar a `--tier-target` o `--target-min` |
| `features/workouts/active-workout/active-workout.page.ts` | `tier-dato` en los seis `app-modal`; estilos de opciones, calificaciones y pie a tokens; aviso de series incompletas a clases; RPE y energía en grilla de 5 columnas |

## Decisiones

- **Grilla de calificación**: 5 columnas. Energía en una fila; RPE en
  dos filas de cinco. En 375px, cada celda mide 57px.
- **Selección**: borde ember y `--color-primary-muted` de fondo, texto
  en hueso. Es un estado de elección, no de éxito.
- **Tipo de serie**: la letra en un recuadro neutro, como en la tabla;
  la opción elegida con borde ember.
- **Pie**: `modal-btn-success` pasa a `modal-btn-primary`, en ember con
  tinta. Cancelar en superficie elevada; descartar/quitar en rojo.
- **Presupuesto**: los seis colores por tipo de serie colapsan en una
  regla neutra; salen `.mt-4` (la utilidad de Tailwind ya aplica desde
  fix-036) y `.reps-wrapper` (duplicaba `position: relative`).

### Agregado al medir el presupuesto

Con lo de arriba se bajó solo de 11.06 a 10.95 kB: el CSS nuevo pesa
casi lo mismo que el viejo. Dos cambios más:

- **`.modal-btn-*` a `tailwind.css`** (`@layer components`). Estaban
  copiados en Entrenar y en la sesión activa, y `app-modal` no puede
  darle estilo a lo que se le proyecta. En la capa `components` le
  ganan al reset de Ionic (capa `ionic`, fix-036) y leen
  `var(--tier-target, var(--target-min))`: 56 en la sesión, 44 en
  Entrenar. Sale el duplicado de `workouts.page.ts`. → 10.31 kB.
- **"No hay entrenamiento activo" pasa a `app-empty-state`**, el estado
  vacío unificado de la app (regla de layouts), con el mismo texto. Sale
  su CSS propio. → bajo 10 kB.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El cambio de título del `app-modal` afecta otras vistas | Se abre el modal de borrar rutina de Entrenar y se mide |
| No bajar de 10 kB | Se mide el build; si no alcanza, se revisa qué más sobra |

## Verificación

```bash
npm run test:ci
ng build
```
