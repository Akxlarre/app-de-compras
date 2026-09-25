# Spec: Coach IA como Tier 2

> id: 0006-coach-tier-trabajo
> refs: pendientes del rediseño Eclipse. Depende de 0001 (tokens y
>   tiers), 0003 (movimiento) y 0002 (cromo inferior y FAB del Coach).
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Medido en navegador, con sesión en curso:
>
> - **AC-01**: raíz `.tier-trabajo` con `app-header`; los dos bloques
>   animados terminan en `opacity: 1`.
> - **AC-02**: papelera, 3 sugerencias, campo y Enviar miden 44px, en la
>   vista y en el drawer.
> - **AC-03**: ningún texto del chat bajo 13px. El título de la vista va
>   en el `app-header` a 28px.
> - **AC-04**: el FAB queda oculto en `/app/coach`. La vista termina en
>   y=792 y la barra de sesión empieza en 808; Enviar termina en 774. En
>   el drawer, tocar Enviar llega al botón (`elementFromPoint`): los tabs
>   quedan debajo.
> - **AC-05**: el ícono de Enviar va en tinta sobre ember (7.0:1).
> - **AC-06**: burbuja del usuario en `--bg-subtle` (regla verificada en
>   el código; no se envió ningún mensaje para no consumir la API).
> - **AC-07**: sin `@keyframes` y sin hex ni `rgba()` en los tres
>   archivos.
> - **AC-08**: 102 tests en verde; el build compila. Su aviso de
>   presupuesto es de Entrenar y lo resuelve fix-032 (PR #4).
>
> **Sin medir:** el caso sin sesión en curso, porque había una sesión
> real del usuario y no correspondía cerrarla. Sin sesión el cromo es más
> bajo y la vista gana espacio, así que es el caso holgado.
>
> **Pasa a la spec de paneles de detalle:** el título del drawer ("Coach
> Virtual IA") va en Anton a 24px, bajo el piso de 28. Lo pone el
> `app-drawer` compartido, que también titula los paneles de detalle con
> nombres largos de ejercicios: se resuelve ahí, junto a esos paneles.

## Contexto

Cuarta vista migrada. El Coach es una conversación: el usuario escribe,
lee y toca sugerencias, a menudo **en medio de una sesión y con el
teléfono en una mano**. Es **Tier 2 — Trabajo**.

La interfaz vive en dos lugares que comparten el mismo componente
`coach-chat`: la vista `/app/coach` y el drawer que abre el FAB del
Coach desde cualquier pestaña.

Medido en navegador antes de tocar nada (2026-09-18), con una sesión en
curso:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 5 — Ergonomía | **El FAB del Coach tapa el botón Enviar** (intersección medida). En esta vista el FAB además sobra: abre el mismo chat que ya está en pantalla |
| 5 — Ergonomía | Objetivos bajo 44px: chips de sugerencia de **12px** de alto, papelera de **17×14px**, campo de texto y Enviar de **36px** |
| 5 — Ergonomía | El alto de la vista es `100vh - 6rem`, un número fijo: con sesión en curso se mete 18px debajo de la barra de sesión |
| 4 — Legibilidad | "Conectado (MCP)" a **11px**, la hora de cada mensaje a **10px**, los chips a **11px**. El título va en Anton a **26px**, bajo el piso de 28 |
| 4 — Legibilidad | El ícono de Enviar va en blanco sobre ember: **2.9:1**, bajo el 3:1 que pide un ícono |
| 6 — Intensidad | La vista no declara tier ni usa `app-header` como las demás |
| 7 — Sistema | `@keyframes` dentro del componente, prohibido por la regla de animación. Los mensajes del usuario van en ember: con varios en pantalla, la marca excede la regla 3-2-1 |

## Acceptance Criteria

- **AC-01** — La raíz declara `.tier-trabajo`, usa `app-header` y recibe
  `animateTierEnter` acotado al host.
- **AC-02** — Todo objetivo táctil del chat mide ≥ 44px: sugerencias,
  papelera, campo de texto y Enviar. Vale para la vista y el drawer.
- **AC-03** — Ningún texto bajo `--text-floor` (13px), y ningún texto en
  Anton bajo `--font-display-floor` (28px).
- **AC-04** — Nada tapa el chat. En `/app/coach` el FAB del Coach no se
  muestra, y el alto de la vista sale de `--chrome-bottom`: el campo y
  Enviar quedan enteros por encima de la barra de sesión y de los tabs,
  con y sin sesión en curso.
- **AC-05** — El ícono de Enviar contrasta ≥ 3:1 con su fondo.
- **AC-06** — Los mensajes del usuario no usan ember: la marca queda
  para Enviar y el indicador de conexión.
- **AC-07** — Sin `@keyframes` en el componente; todo color sale de
  tokens.
- **AC-08** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El contenido del chat, las sugerencias y el comportamiento del modelo.
- El texto de la vista: solo diseño visual.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador, con y sin sesión en
curso: medir objetivos táctiles, tamaños de letra, contraste de Enviar y
que nada se superponga al campo ni a Enviar, en la vista y en el drawer.
**No** enviar mensajes al modelo: consume la API externa.
