# Plan técnico — 0013-historial

## Estrategia

Historial toma los valores de la tarjeta de Entrenar, que ya pasó la
rúbrica, sin cambiar su marcado ni sus textos. Las etiquetas de
ejercicio se definen una vez con el mismo aspecto en las dos páginas.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/workouts/history/history.page.ts` | `tier-trabajo`; estilos a tokens con los valores de Entrenar; estado vacío a `app-empty-state`; salen la regla muerta `.back-btn` y el fondo propio de `ion-content` (lo pinta la regla global desde fix-028) |
| `features/workouts/workouts.page.ts` | Estilos de `.card-exercises` y `.exercise-chip`, que no existían |

## Decisiones

- **Título de sección** como el de Entrenar: cuerpo en negrita a
  `--text-lg` (Anton a 16.8px quedaba bajo su piso).
- **Contador** como el de Entrenar: `--font-data` a `--text-xs`.
- **Etiqueta de ejercicio**: `--bg-elevated`, borde `--border-subtle`,
  texto `--text-secondary` a `--text-xs`; fila con `flex-wrap` y separación.
- **Presupuesto de estilos de Entrenar**: se agrega poco; se mide en el
  build.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Entrenar pasa su presupuesto de 10 kB | Se mide; las etiquetas son dos reglas |
| La cuenta no tiene sesiones | Sesiones de ejemplo solo en memoria |

## Verificación

```bash
npm run test:ci
ng build
```
