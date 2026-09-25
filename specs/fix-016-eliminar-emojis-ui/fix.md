# Fix: eliminar todos los emojis usados como íconos de UI

> id: fix-016-eliminar-emojis-ui
> refs: pedido explícito del usuario — "no puede haber ningún emoji" — continúa
>   el hallazgo original de la auditoría UX/UI (regla del proyecto: OBLIGATORIO
>   <app-icon>, PROHIBIDO emojis).
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Alcance — relevado con grep sobre rango Unicode de emoji real

Migro a `<app-icon>` (Lucide) todo emoji usado como ícono/contenido visual en
templates:

| Archivo | Emoji | Contexto | Lucide |
|---|---|---|---|
| `workouts.page.ts` | 🏋️ ⚡ | KPI icons | `dumbbell`, `zap` |
| `workouts.page.ts` | 📋 | empty state | `clipboard-list` |
| `history.page.ts` | 📋 | empty state | `clipboard-list` |
| `meso-timeline.component.ts` | ✓ 🔋 | estado de semana | `check`, `battery` |
| `home.component.ts` | 🧠 | hero landing pública | `brain` |
| `login.component.ts` / `reset-password.page.ts` | 🏋️ ⚠ ✓ | logo, error, éxito | `dumbbell`, `alert-circle`, `check` |
| `explorer.page.ts` / `exercise-selector.component.ts` | 🔍 | empty/search | `search` |
| `coach-chat.component.ts` | 📈 📊 (×2 c/u) | sugerencias | `trending-up`, `bar-chart-2` |
| `app-update-modal.component.ts` | 🚀 ⚠️ | header, error | `rocket`, `alert-circle` |
| `active-workout.page.ts` | 😴 ⚡ | escala RPE (1 y 5) | `moon`, `zap` |

`IconComponent` soporta cualquier nombre Lucide vía fetch dinámico a CDN si no
está en el set local — no hace falta tocar `app.config.ts`. Preservo tamaño
visual leyendo el `font-size`/clase de cada emoji (mismo método que fix-014).

## Fuera de alcance (no son íconos de UI — decisión distinta, no la tomo acá)

- `gemini.service.ts` (líneas 185, 207, 215, 284) — emojis dentro del **system
  prompt** que le dice a la IA cómo formatear SUS PROPIAS respuestas de chat.
  No renderiza en ningún componente Angular; es texto que el modelo de lenguaje
  puede (o no) reproducir en su output dinámico. Cambiar esto no elimina
  emojis de la UI — cambia el estilo de escritura del Coach IA, una decisión de
  producto/tono distinta. **No lo toco** sin confirmación explícita.
- `icon.component.ts` (líneas 15-33, EMOJI_MAP) — mapa de compatibilidad que
  TRADUCE emoji legacy a nombres Lucide reales (ej. si datos viejos en la BD
  tienen '🚗' como nombre de ícono, lo convierte a 'car' antes de renderizar).
  Es infraestructura anti-emoji, no una violación — lo dejo intacto.

## Hallazgo adicional durante el barrido

`features/home/home.component.ts` (contenía el emoji 🧠) resultó ser boilerplate
huérfano — verificado por grep que no tiene ninguna ruta ni referencia en
`app.routes.ts` ni en ningún otro archivo, ni spec. Mismo patrón exacto que
`dashboard.component.ts` (borrado en fix-006): contenido "¡Hola, KOA! Workflow
Agentico de nueva generación" que no tiene nada que ver con FitTrack. Lo borro
en vez de migrarle el emoji, porque no tiene sentido mantener un ícono
"correcto" en una página que ningún usuario puede alcanzar.

## Nota de alcance ejecutado

`coach.facade.ts:15` (👋 en el mensaje de bienvenida del chat) sí se migró —
pese a listarse originalmente como "fuera de alcance" por ser contenido
conversacional y no un ícono, el propio fix.md declaraba la intención de
sacarlo "por alineación estricta" con el pedido del usuario ("no puede haber
ninguno"). Es un cambio de una línea de texto (sin componente ni lógica), así
que no ameritaba un track separado.

`gemini.service.ts` (system prompt de la IA) e `icon.component.ts`
(EMOJI_MAP) se dejaron intactos — ver razones arriba. Requieren decisión
explícita del usuario si se quiere tocarlos.

## ACs Afectados

Ninguno.

## Test de Regresión

`npm run test:ci` — 31 archivos / 76 tests, 0 fallos.
`ng build` (producción) — build exitoso, sin warnings nuevos (solo 2 NG8107
preexistentes y fuera de alcance en `history.page.ts`/`workouts.page.ts`).
