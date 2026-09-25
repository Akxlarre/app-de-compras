# Plan técnico — 0010-sesion-activa-tier-dato

## Estrategia

Aplicar las reglas de Tier 3 que `_tiers.scss` ya define, sin inventar
otras: `.tier-dato` en el encabezado y en el contenido (no en el host,
así los modales de 0011 quedan fuera), `--tier-target` de 56px en cada
control, `--font-data` en cifras y títulos, y el ember reservado a lo
que manda: el cronómetro (decorativo), "Terminar" y "Añadir Ejercicio"
(interactivos). Regla 3-2-1.

La respuesta del check al tocarlo (`animateSuccessFeedback`, medio
segundo de escala) se queda: es respuesta a un toque, no decoración, y
respeta `prefers-reduced-motion`.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `core/utils/set-type.utils.ts` (+ spec, barrel) | Nuevo: `nombreTipoSerie(tipo)`, el nombre completo para `aria-label`. Hoy vive como constante en el detalle de sesión (0008) y ahora lo necesita también la sesión activa |
| `features/workouts/components/session-detail/session-detail.component.ts` | Toma los nombres de la util; sus letras W/D/F no cambian |
| `features/workouts/active-workout/active-workout.page.ts` | Plantilla y estilos de la superficie de registro |
| `features/workouts/active-workout/workout-timer.component.ts` | Cronómetro en `--font-data`, clase `tier-cronometro` |
| `features/workouts/active-workout/rest-timer.component.ts` | Cuenta en `--font-data`, controles a 56px, sin `@keyframes` (pulso, destello, entrada y "pop") |

## Decisiones

- **Encabezado** deja de flotar con vidrio y sombra: barra sólida en
  tinta con línea inferior. Presupuesto en 375px: atrás 56, descartar
  56, Coach y Terminar a 56 de alto. "Terminar" pierde su ícono para que
  "Sesión" entre sin cortarse; se mide.
- **Ejercicios** sin tarjeta ni ícono de mancuerna repetido: sección con
  línea superior. Libera el ancho que necesitan cinco columnas de 56px.
- **Tabla**: `56px 1fr 1fr 0.8fr 56px`. Campos de 56 de alto en
  `--font-data`; serie completada en `--state-success-bg` y check en
  `--state-success` con tinta; foco con borde ember (Tier 3 no admite
  sombra, ni la de foco).
- **Tipos de serie** neutros como en 0008, con `aria-label`.
- **Descanso**: el anillo es el cronómetro y sigue moviéndose; lo
  urgente pasa del rojo de error al dorado de aviso, sin pulso.
  "¡A DARLE!" sin destello ni pop.

## Orden

1. Test de `nombreTipoSerie` (rojo) → util (verde) → el detalle la usa.
2. Cronómetro.
3. Descanso.
4. Encabezado y contenido de la página.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El encabezado no entra en 375px con controles de 56 | Se mide; plan B: título más corto visualmente con elipsis |
| Tocar la sesión de prueba escribe en la base | Solo en memoria y `localStorage`; nunca "Terminar y Guardar"; se borra al final |
| `.tier-dato *` quita toda sombra, también la de foco | Foco con borde ember |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: el mismo script de la línea base.
