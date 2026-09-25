> id: fix-040-layout-shifts
> refs: Reportado por el usuario: saltos de diseño (CLS)
> status: done
> created: 2026-09-20

## Síntoma
Efecto "feo" de redimensión al cargar la aplicación (Layout Shift o CLS). Las tarjetas de la página de inicio (Entrenar) y del Historial renderizan primero componentes pequeños (`<div class="loading-box">` o `<app-empty-state>`) durante una fracción de segundo, y luego brincan inyectando tarjetas grandes cuando Supabase responde.

## Causa Raíz
Falta de estado `Skeleton` explícito para la lógica asíncrona de:
- Mesociclo actual en `workouts.page.ts` (pasa directo a empty state y luego a data, o usa min-height equivocado).
- Lista de Rutinas en `workouts.page.ts` (salta de loader pequeño a grid completo).
- Lista de Entrenamientos en `history.page.ts` (salta de loader pequeño a feed completo).

## Solución Propuesta
1. Crear un esqueleto para la tarjeta del mesociclo (`plan-skeleton`).
2. Crear un esqueleto para la grilla de rutinas (`routine-skeleton`).
3. Crear un esqueleto para las tarjetas del historial (`history-card-skeleton`).
4. Reemplazar los `<div class="loading-box">` con los skeletons animados correspondientes, asegurando que su `min-height` reserve el espacio exacto que ocuparán las tarjetas reales.
