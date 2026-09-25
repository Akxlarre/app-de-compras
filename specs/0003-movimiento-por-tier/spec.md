# Spec: Sistema de movimiento por tier

> id: 0003-movimiento-por-tier
> refs: decisión del usuario "Por tier, orquestado" tras el recorrido de
>   flujos de 0002. Depende de specs/0001 (clases de tier).
> status: done
> created: 2026-09-15
> closed: 2026-09-15
>
> **Cierre.** AC-01 a AC-07 cumplidos. AC-05 se verificó por test
> unitario, no por navegador: no hay forma de emular
> `prefers-reduced-motion` desde las herramientas disponibles.
>
> Escribir esos tests destapó dos bugs encadenados que la verificación
> en navegador no había mostrado: la red de seguridad limpiaba los
> props pero la timeline seguía viva y volvía a ocultar el contenido en
> su siguiente tick; y al matarla, `kill()` dispara `onInterrupt`, que
> llamaba de vuelta a `revelar` — recursión. Ambos corregidos.

## Contexto

Medido en navegador durante el recorrido de flujos: `animation-name:
none` en todas las páginas montadas. **La app no tiene ninguna
transición de entrada** — al cambiar de tab el contenido aparece de
golpe. La regla del proyecto (`visual-system.md`) exige
`GsapAnimationsService` para entradas de vista y prohíbe
`@angular/animations`.

`GsapAnimationsService` ya existe, ya respeta `prefers-reduced-motion`
y ya tiene primitivas (`animateHero`, `fadeIn`, `staggerListItems`,
`animatePageEnter`). Lo que falta es la **orquestación por tier**.

## Principio

El movimiento sigue el mismo principio que el color: **el presupuesto
es inversamente proporcional a la atención disponible**. Un usuario con
pulso a 150 entre series no necesita que le animen la pantalla.

| Tier | Duración | Qué se mueve |
|---|---|---|
| 1 Ceremonia | ≤ 600ms | Bloque de ceremonia primero, el resto escalona detrás |
| 2 Trabajo | ≤ 300ms | Stagger sutil, sin protagonismo |
| 3 Dato | 0ms | Nada salvo el cronómetro |

## Acceptance Criteria

- **AC-01** — `GsapAnimationsService` expone un método de entrada por
  tier que lee el tier de la raíz de la vista, no de un parámetro suelto
  que el llamador pueda equivocar.
- **AC-02** — Tier 1 orquesta en dos tiempos: la ceremonia entra
  primero y el resto escalona después. Duración total ≤ 600ms.
- **AC-03** — Tier 2 usa stagger ≤ 300ms.
- **AC-04** — Tier 3 no anima nada. El cronómetro queda excluido
  explícitamente vía `.tier-cronometro`.
- **AC-05** — Con `prefers-reduced-motion: reduce` ninguna entrada
  anima y **el contenido queda visible**, nunca en `opacity: 0`.
- **AC-06** — Las duraciones salen de tokens `--duration-*`, no de
  números inventados en el servicio.
- **AC-07** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- Transiciones de ruta entre vistas (el deslizamiento que hace Ionic al
  cambiar de tab). Acá se resuelve la **entrada del contenido**, que es
  lo que está en cero.
- Micro-interacciones de hover y press: ya existen en los tokens
  `--transition-*` y funcionan.
- El FAB del Coach sobre el KPI "6m": el usuario decidió dejarlo. Queda
  registrado que el criterio 2 de la rúbrica sigue incumplido ahí **por
  decisión explícita**, no por omisión.

## Test de Regresión

`npm run test:ci` + `ng build`, y verificación en navegador de que el
contenido de Entrenar queda visible (opacity 1) al terminar la entrada,
y que con `prefers-reduced-motion` forzado sigue visible.
