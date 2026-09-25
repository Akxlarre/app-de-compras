# Spec: Perfil como Tier 2

> id: 0005-perfil-tier-trabajo
> refs: pendientes del rediseño Eclipse. Depende de 0001 (tokens y
>   tiers), 0003 (movimiento) y fix-028 (fondo de Ionic).
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Medido en navegador con el mismo script de la línea base:
>
> - **AC-01**: la raíz lleva `.tier-trabajo`; los tres bloques marcados
>   con `data-anim="bloque"` terminan en `opacity: 1` y sin transform.
> - **AC-02**: objetivos de 52, 52 y 51px.
> - **AC-03**: ningún texto bajo 13px ni en Anton bajo 28px. El nombre
>   pasó de 24 a 28px y "OPCIONES" de 12 a 13px.
> - **AC-04**: cero hex, `rgba()` o respaldos en el archivo. Cerrar sesión
>   usa `--state-error-*`; las opciones, `--bg-surface`, el mismo tono que
>   rendía antes.
> - **AC-05**: 0 `ion-icon` y 5 `app-icon` en el DOM.
> - **AC-06**: el avatar es ember sólido con iniciales en tinta (7.0:1);
>   salen el degradé y el resplandor azul.
> - **AC-07**: 102 tests en verde; el build compila. Su aviso de
>   presupuesto es de Entrenar y lo resuelve fix-032 (PR #4).
>
> "Preferencias" responde con su toast. **"Buscar Actualizaciones" no da
> ninguna respuesta visible** en web, donde no hay build nativo, y
> tampoco en el teléfono cuando la app está al día o la consulta falla:
> `AppUpdateFacade` guarda el error y la vista nunca lo muestra. Es
> previo y no es visual: queda como fix aparte.

## Contexto

Tercera vista migrada. Perfil es de baja frecuencia: se entra a buscar
actualizaciones, a preferencias o a cerrar sesión. Es **Tier 2 —
Trabajo**: sobria, sin ceremonia.

Medido en navegador antes de tocar nada (2026-09-18). Los objetivos
táctiles ya cumplen (52, 52 y 51px).

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 4 — Legibilidad | El nombre del usuario va en **Anton a 24px**, bajo el piso de esa fuente (28px) |
| 7 — Sistema | **13 colores escritos a mano**. El avatar arrastra un resplandor **azul** del branding anterior (`rgba(59,130,246,.35)`); cerrar sesión usa el rojo viejo (`rgba(239,68,68,…)`), no `--state-error`; hay 8 respaldos `var(--x, #hex)` |
| 7 — Sistema | Íconos de Ionic (`ion-icon`) donde la regla exige `app-icon` (Lucide) |
| 4 — Legibilidad | La etiqueta "OPCIONES" mide **12px**, bajo el piso de 13 |
| 4 — Legibilidad | Las iniciales del avatar van en blanco sobre un degradé ember→carmesí: blanco sobre ember da **2.9:1** y reprueba incluso como texto grande |
| 6 — Intensidad | La vista **no declara tier**. Su entrada animada busca elementos con `document.querySelectorAll`, que también puede encontrar los de otras vistas que Ionic mantiene en el DOM |
| — | `.page-container` definida y sin uso |

## Acceptance Criteria

- **AC-01** — La raíz declara `.tier-trabajo` y recibe `animateTierEnter`,
  acotado al host de la vista.
- **AC-02** — Todo objetivo táctil mide ≥ 44px (`--target-min`).
- **AC-03** — Ningún texto por debajo de `--text-floor` (13px), y
  ningún texto en Anton por debajo de `--font-display-floor` (28px).
- **AC-04** — Cero hex y cero `rgba()` escritos a mano en la vista, y
  ningún respaldo `var(--x, #hex)`: todo sale de tokens.
- **AC-05** — Todos los íconos son `app-icon` (Lucide); no queda
  `ion-icon`.
- **AC-06** — Las iniciales del avatar pasan AA contra su fondo en toda
  su superficie.
- **AC-07** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El contenido de Preferencias (hoy avisa "próximamente").
- El texto de la vista: solo diseño visual.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: medir objetivos táctiles,
tamaños de letra y contraste de las iniciales; tocar "Buscar
Actualizaciones" y "Preferencias" y ver su respuesta. **No** tocar
"Cerrar Sesión": es un control que cierra la sesión real del usuario.
