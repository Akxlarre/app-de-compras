# Plan técnico — 0008-entrenar-detalle-sesion

## Estrategia

Igual que 0007: **deduplicar y corregir una vez**. El detalle de sesión
es de lectura de datos (el usuario revisa lo que hizo), así que va sobrio:
números en `--font-data`, etiquetas a 13px y colores neutros. Los
números salen del ember: dos cifras en ember por pantalla pasarían la
regla 3-2-1.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/workouts/components/session-detail/session-detail.component.ts` (+ spec) | Nuevo: el detalle con clases y tokens |
| `features/workouts/workouts.page.ts` | El modal usa el componente; los `rgba()` restantes pasan a tokens |
| `features/workouts/history/history.page.ts` | El modal usa el componente |
| `shared/components/empty-state/empty-state.component.ts` | Botón a `--target-min` |

## Orden

1. Test del componente: nombre completo de cada tipo de serie para el
   `aria-label`, y que un tipo normal no lleve insignia.
2. Componente de detalle.
3. Entrenar e Historial pasan a usarlo.
4. Barrido de `rgba()` en Entrenar:
   - blancos de fondo y borde a `--bg-surface`, `--bg-elevated`,
     `--border-subtle` y `--border-default`;
   - blancos de texto a `--text-muted` y `--text-secondary`;
   - rojo de borrar a `--state-error-*`.
5. Botón del estado vacío.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El presupuesto de estilos de Entrenar | El detalle sale a su propio componente con sus estilos; Entrenar solo cambia valores |
| Historial pierde algo al extraer | Las copias son idénticas (verificado); se mide Historial también |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: el mismo script de la línea base.
