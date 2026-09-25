# Fix: verificación post-sesión (build completo) + limpieza de imports no usados

> id: fix-015-verificacion-post-sesion
> refs: pedido explícito del usuario de re-verificar todo con `ng build` y
>   aprovechar para encontrar más problemas, tras fix-006..014.
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado

`ng build` (producción): pasó desde el primer intento; 2 rondas de limpieza de
imports no usados hasta llegar a 0 warnings NG8113 en los archivos tocados esta
sesión (quedan 2 warnings preexistentes, documentados como fuera de alcance:
`IconComponent` sin uso en `LoginComponent` por los emojis, y 2× NG8107 de estilo
`?.` innecesario).

Verificación adicional de tokens: audité con grep cruzado todos los `var(--...)`
introducidos esta sesión contra los 164 tokens reales de `_variables.scss` — cero
typos. Los únicos `var()` que no resuelven a un token real son 3 casos
preexistentes de "fake fallback" (`--color-tertiary`, `--color-tertiary-tint`,
`--color-warning`, `--color-primary-rgb`) en `exercise-selector.component.ts` y
`explorer.page.ts` — no los toqué, coherente con la decisión ya tomada de no
tocar colores de warmup/dropset.

Verificación visual: login renderiza idéntico al original (cero regresión), y el
estado de error (`--state-error` nuevo) renderiza correctamente con buen
contraste.

`npm run test:ci`: 31/76, 0 failures.

## Root Cause

`npm run test:ci` no hace type-checking de templates completo (Vitest transpila,
no corre el Angular compiler). Corrí `ng build` (producción) para verificar
compilación real — pasó, pero emitió warnings NG8113 (imports Angular/Ionic
declarados en `imports: []` sin ningún uso en el template).

En `active-workout.page.ts`, mi migración de iconos (fix-014) dejó 0 usos de
`<ion-icon>` en el archivo — `IonIcon` quedó sin uso como consecuencia directa.
Verificado por grep (`<ion-title|<ion-button|<ion-icon|<ion-list|<ion-label|
<ion-badge|<ion-buttons` → 0 matches cada uno) que además `IonTitle`, `IonButton`,
`IonList`, `IonLabel`, `IonBadge`, `IonButtons` ya estaban sin uso en este archivo
(no por mi cambio — pre-existentes, pero verificados con la misma confianza por
el propio compilador de Angular, no es especulación).

## Cambio

Elimino los imports no usados que el build confirmó, archivo por archivo, SOLO
donde el compilador (no una suposición mía) confirma cero uso en el template:

- `active-workout.page.ts`: `IonTitle`, `IonButton`, `IonIcon`, `IonList`,
  `IonLabel`, `IonBadge`, `IonButtons`.
- `explorer.page.ts`: `IonBadge`.
- `profile.page.ts`: `IonButton`, `IonAvatar`, `IonListHeader`.
- `tabs-layout.component.ts`: `DatePipe`.

No toco los 2 warnings NG8107 (`?.` innecesario en `workouts.page.ts` y
`history.page.ts`) — son sugerencias de estilo del compilador sin riesgo pero
tampoco relacionadas a esta sesión; los dejo documentados, no los cambio para no
generar diff ruido fuera del foco de la verificación.

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` y `ng build` (producción) en verde, sin warnings NG8113
restantes en los archivos tocados.
