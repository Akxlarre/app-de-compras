# Plan técnico — 0002-entrenar-tier-ceremonia

> Deriva de `spec.md`. Primera vista de Fase 1.

## Estrategia

**Shell primero, vista después.** Bajar la barra de tabs cambia el
espacio disponible de todas las pantallas (libera 88px arriba, ocupa
~64px abajo). Rediseñar Entrenar contra la geometría vieja sería
trabajo tirado.

**El tier se declara en la raíz.** `.tier-ceremonia` en el `ion-content`
de Entrenar expone `--tier-border`, `--tier-pad`, `--tier-target` y
`--tier-ground`; los bloques internos consumen esas variables en vez de
valores propios. Así la vista no puede exceder su presupuesto gráfico
aunque alguien lo intente.

## Artefactos afectados

| Archivo | Slice | Qué cambia |
|---|---|---|
| `layout/tabs-layout/tabs-layout.component.ts` | 1.1 | `slot="bottom"`, repintado, barra de sesión, reubicación del FAB de Coach |
| `features/workouts/workouts.page.ts` | 1.2 | Raíz en tier, rediseño de los 4 bloques, estados vacío y carga, barrido de hex/inline |

## Slice 1.1 — Shell

1. `ion-tab-bar` → `slot="bottom"`; quitar `position:absolute`, `top`,
   márgenes de píldora superior y la máscara `::after`
2. Borrar `--layout-top-offset` y el `::ng-deep ion-content --padding-top`
3. Repintar con tokens: fondo `--bg-surface`, borde `--border-default`,
   seleccionado `--ds-brand`
4. Quitar `drop-shadow(rgba(59,130,246,.5))` — resplandor del brand viejo
5. FAB de sesión activa → barra `.session-bar` anclada sobre los tabs:
   nombre del ejercicio + tiempo, en ember, alto ≥ `--target-min`
6. Subir el FAB del Coach por encima de la barra de tabs

## Slice 1.2 — Entrenar

Los cuatro bloques actuales y qué pasa con cada uno:

| Bloque | Ahora | Después |
|---|---|---|
| Arranque de sesión | `.start-card` con verde inline | Hero de ceremonia con `--tier-ground`; "en curso" en ember |
| Plan actual (mesociclo) | `.plan-section` con verde inline | Tarjeta de ciclo; progreso en ember |
| Mis Rutinas | grilla de `.routine-card` | `.tier-repetido` si pasan de 3; toques a 44px |
| Historial reciente | items con `.stat-pill` | Números en `--font-data` con tabular-nums |

Estados nuevos (AC-06):
- **Vacío**: sin rutinas y sin historial — reusar `app-empty-state`
  (ya existe en `indices/COMPONENTS.md`, no crear otro)
- **Carga**: `@if (loading())` con `<app-skeleton-block>`

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| La barra de tabs abajo tapa contenido al final del scroll | Padding inferior en `ion-content` igual a la altura de la barra + safe-area |
| La barra de sesión y el FAB de Coach se pisan | El FAB sube cuando hay sesión activa — ya existe `.has-active-workout` para eso |
| El barrido de hex rompe algo fuera de Entrenar | Solo se tocan los dos archivos declarados |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: los tres tabs navegan, se puede iniciar sesión libre, y
la barra de sesión aparece y lleva a la sesión activa.

## Criterio de done

Los ocho AC verificados con evidencia. AC-05b queda explícitamente
abierto y se traslada, no se da por cumplido.
