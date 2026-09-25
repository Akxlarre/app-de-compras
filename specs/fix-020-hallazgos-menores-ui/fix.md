# Fix: hallazgos menores de UI detectados en revisión manual de flujos

> id: fix-020-hallazgos-menores-ui
> refs: hallazgos menores reportados junto con fix-018/fix-019, que el
>   usuario pidió atacar antes de continuar con rutinas/mesociclo
>   ("ataca esos hallazgos menores luego seguimos con rutinas").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Causa raíz 1 — Título del header de sesión activa truncado a "E..."

`active-workout.page.ts`: el `<h1 class="header-title">` ("Entrenamiento",
13 caracteres) tiene `flex:1` compitiendo por espacio contra 3 botones con
texto/ícono ("Coach", ícono papelera, "Terminar") dentro de una tarjeta de
header de ancho fijo. A 375px de viewport no alcanza el espacio y el título
se corta con ellipsis a "E...".

**Cambio:** acortar la etiqueta a "Sesión" (terminología ya usada en el
resto de la app: "Iniciar Sesión Libre", "Resumen de Sesión", "Detalle de
Sesión") y reducir levemente gaps/padding de los botones de acción para
dar margen adicional en viewports angostos.

## Causa raíz 2 — Chip "1 Ejercicios" recortado en tarjetas de historial

`workouts.page.ts`: el template usa `<span class="stat-val">`/`<span
class="stat-lbl">` dentro de `.stat-pill`, pero el CSS del archivo define
reglas para `.stat-num`/`.stat-unit` — **nombres de clase que no
coinciden con nada del template**. Verificado en consola del navegador:
`.stat-lbl` renderiza a `font-size: 16px` (default del browser, sin peso
de fuente), no al `0.72rem` semibold que la regla huérfana `.stat-unit`
pretendía aplicarle. Con el texto sin comprimir, las 3 pills (Volumen/
Series/Ejercicios) desbordan el ancho de la tarjeta:
`card-stats.scrollWidth (324px) > card-stats width (304px)` medido en
vivo.

**Cambio:** renombrar `.stat-num` → `.stat-val` y `.stat-unit` →
`.stat-lbl` para reconectar el CSS con el template (esto ya reduce
significativamente el ancho real ocupado). Se agrega además
`flex-wrap: wrap` a `.card-stats` como red de seguridad defensiva para
viewports aún más angostos, sin cambiar el diseño intencional.

## Causa raíz 3 — Inputs KG/REPS/RIR sin nombre accesible

`active-workout.page.ts`: los 3 `<ion-input>` de cada serie (peso, reps,
RIR) no tienen `aria-label` ni ninguna asociación programática con sus
headers de columna ("KG"/"REPS"/"RIR", que viven en una fila `.set-header`
completamente separada, sin `for`/`aria-labelledby`). Confirmado: no
aparecen como `textbox` en el árbol de accesibilidad leído por el
navegador — invisibles para lectores de pantalla y para automatización
basada en roles ARIA.

**Cambio:** agregar `aria-label` descriptivo a cada `ion-input`,
incluyendo el número de serie (ej. "Peso en kilogramos, serie 2") para
diferenciarlas entre sí. Se captura `let setIndex = $index` en el `@for`
de sets para construirlo.

## Causa raíz 4 — Pluralización sin manejar en contadores

`workouts.page.ts` (tarjetas de historial): "1 Series", "1 Ejercicios" —
el label es fijo en plural sin importar la cantidad. Ionic/Angular ya trae
`i18nPlural`/`ICU expresions` incluidas en `@angular/common`, no hace
falta una librería nueva.

**Cambio:** usar la sintaxis ICU inline de Angular (`{count, plural, =1 {…} other {…}}`)
para "Series"/"Ejercicios" en las stat-pills del historial.

## Fuera de alcance

- Catálogo de ejercicios con datos en idioma mezclado (ej. "Chest ·
  Barbell · Strength" en vez de "Pecho · Barra · Fuerza" para algunos
  registros) — es un problema de **datos de seed**, no de código de la
  aplicación. Corregirlo requiere una migración de datos
  (`supabase/migrations/` o un script de re-traducción), no un cambio en
  `src/app/`. Ya se documentó como fuera de alcance en fix-018 por el
  mismo motivo.

## Nota de verificación — causa raíz 3 (a11y)

`ion-input` de este build de Ionic usa encapsulación `scoped` de Stencil
(NO Shadow DOM real: `el.shadowRoot` es `null`), y su lógica interna
(`inheritAriaAttributes()`) **mueve** el `aria-label` del host hacia el
`<input class="native-input">` real dentro del propio DOM claro, en vez de
dejarlo en el host — por diseño, para que el nombre accesible quede en el
elemento realmente enfocable. Por eso `ion-input.getAttribute('aria-label')`
da `null` incluso con el fix aplicado correctamente: hay que mirar
`ionInputEl.querySelector('input.native-input').getAttribute('aria-label')`.
Verificado así en consola del navegador, los 3 inputs exponen el nombre
correcto: "Peso en kilogramos, serie 1", "Repeticiones, serie 1", "RIR,
repeticiones en reserva, serie 1". La herramienta `find`/`read_page` de
este entorno no resuelve bien este patrón (reporta `generic` sin nombre) —
es una limitación de la herramienta de inspección, no del fix.

## ACs Afectados

Ninguno formal.

## Test de Regresión

Manual en navegador (viewport 375px):
- ✅ Título "Sesión" ya no se corta en el header de entrenamiento activo
  (tuvo que ajustarse el gap/padding dos veces — la primera reducción no
  fue suficiente, medido con `getBoundingClientRect` hasta confirmar
  `scrollWidth <= clientWidth`).
- ✅ Las stat-pills de las tarjetas de historial ya no desbordan — texto
  compacto restaurado (peso de fuente y tamaño correctos) y wrap defensivo
  visible en pantallas angostas.
- ✅ "1 Serie" / "1 Ejercicio" en singular; "N Series" / "N Ejercicios" en
  plural — confirmado visualmente con datos reales (1 serie, 1 ejercicio).
- ✅ Inputs KG/REPS/RIR exponen `aria-label` correcto en el `<input>`
  nativo real, verificado por DOM (ver nota arriba).

`npm run test:ci` → 86 tests, 0 fallos. `ng build` (producción) → build
exitoso, solo los 2 warnings NG8107 preexistentes y fuera de alcance.
