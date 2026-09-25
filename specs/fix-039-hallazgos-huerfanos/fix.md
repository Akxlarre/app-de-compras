# Fix: Hallazgos Huérfanos de Eclipse

> id: fix-039-hallazgos-huerfanos
> refs: hallazgos sin dueño reportados en PENDIENTES-ECLIPSE.md
> status: done
> created: 2026-09-20

## Síntoma

El documento `PENDIENTES-ECLIPSE.md` lista 5 hallazgos de deuda técnica sin resolver:
1. **Entrada animada de Historial**: tarda ~5 segundos en asentarse y se reinicia al cambiar el historial.
2. **Datos del Catálogo sin traducir**: datos base como el músculo, equipo y categoría (ej. "Chest · Barbell · Strength") se muestran en inglés porque la BD los sirve así.
3. **Regla global `h1, h2` rota**: asume que todo título va en la fuente `Anton` y será mayor a 28px, lo cual pisa estilos de componentes donde los `h1`/`h2` son más pequeños, forzando `Anton` en lugares ilegibles.
4. **CSS muerto/sucio**: `.exercise-meta` del Catálogo conserva usos de `!important` que ya no son necesarios tras el ordenamiento de capas CSS de Tailwind.
5. **Docs desactualizados**: `STYLES.md` menciona que `--ion-color-primary` es azul.

## Causa raíz

1. **Historial**: `animateTierEnter` (o similar) se está disparando de forma descontrolada por el ciclo de vida del framework Angular/Ionic (ej. al cambiar datos de la señal que redibuja la lista).
2. **Datos en Inglés**: Supabase siembra los metadatos en inglés y el front-end los interpola directo (`{{ exercise.muscle }}`).
3. **CSS Global Invasivo**: `styles.scss` o `_typography.scss` tiene un selector de etiqueta desnudo `h1, h2 { font-family: var(--font-display); }`, sobreescribiendo el scope de los componentes.
4. **Limpieza post-migración**: Se ordenaron las capas en el fix-036 pero quedaron restos de `!important` defensivos.

## Cambio

1. **Historial**: Ajustar la invocación de `GsapAnimationsService` en `history.page.ts` para que corra una única vez en la carga inicial (ej. un `effect` on-track o banderas de `isFirstLoad`).
2. **Traducción**: Crear un `TranslateExercisePipe` en `shared/pipes/` y usarlo en el Catálogo, Selector de Ejercicios y Detalles de Ejercicio.
3. **Tipografía**:
   - Borrar la regla global para `h1, h2`.
   - Modificar las clases en los lugares específicos (como el `AppHeaderComponent`, páginas de features) donde realmente se use `Anton`, aplicando explícitamente `font-display` o una utilidad de Tailwind.
4. **CSS**: Eliminar `!important` en `.exercise-meta` (`explorer.page.ts`, `exercise-selector.component.ts`).
5. **Docs**: Actualizar `indices/STYLES.md` para reflejar que `--ion-color-primary` ahora es `ember` (`var(--color-primary)`).

## Test de Regresión

- `npm run lint:arch` y `npm run test:ci`.
- **Catálogo**: verificar que los labels de metadata de los ejercicios se lean en español (ej. "Pecho · Barra · Fuerza") y que los nombres principales conserven su estilo.
- **Historial**: entrar a la vista y confirmar que las tarjetas entren fluidas una sola vez y no re-animen al navegar dentro de la misma.
- **App Completa (Visual)**: Navegar a Perfil, Entrenar y Catálogo confirmando que los títulos principales sigan usando Anton (si corresponde) y que no haya textos en Anton ilegibles por debajo de los 28px.
