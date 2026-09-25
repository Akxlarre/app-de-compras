# Fix: corregir tokens de marca (--ds-brand/--color-primary/--state-success)

> id: fix-007-corregir-tokens-marca
> refs: auditoría UX/UI de esta sesión — decisión confirmada por el usuario en chat
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Resultado del Test de Regresión

`npm run test:ci`: 31 test files / 76 tests, 0 failures (idéntico antes y después
del cambio de tokens — ningún test depende de valores hex literales, como se
esperaba tratándose de variables CSS).

## Root Cause

`--ds-brand` / `--color-primary` en `_variables.scss` está definido como azul "sky"
(`#0ea5e9` light / `#38bdf8` dark), pero **ninguna pantalla real de la app usa ese
azul**. Todas (login, avatar de perfil, tab bar seleccionado) usan consistentemente
azul "blue" de Tailwind (`#3b82f6` / `#2563eb`, con tintes `#60a5fa` / `#93c5fd`),
hardcodeado directamente porque el token no coincidía.

Mismo problema con `--state-success`: token en verde "green" (`#16a34a` light /
`#4ade80` dark), pero el único uso real (FAB de "reanudar entrenamiento" en
`tabs-layout.component.ts`) es verde "emerald" (`#10b981`).

Confirmado con el usuario: corregir los tokens al color real en vez de migrar las
pantallas reales al color del token (que es lo que ya está bien establecido en
producción).

## Metodología

Se preserva el patrón ya existente en el archivo: **dark mode usa un escalón más
claro que light mode** en la escala Tailwind (ej. antes: light sky-500 → dark
sky-400). Aplicado a blue: dark = blue-500 (`#3b82f6`, el valor real usado) → light
= blue-600 (`#2563eb`, un escalón más oscuro, coherente con fondo claro). Mismo
patrón para hover/dark de cada capa (base/hover/dark = 500/600/700 en light,
400/500/600 en dark — dark-mode-hover más CLARO que la base, como ya hacía el sky
original).

Verificación cruzada: los valores derivados matematicamente coincidieron con hex ya
presentes en el código real sin que se buscaran a propósito — `--color-primary-hover`
dark derivado = `#60a5fa` (coincide exacto con `hover:text-[#60a5fa]` en
`login.component.ts`); `--color-primary-dark` dark derivado = `#2563eb` (coincide
exacto con el gradiente usado en `login.component.ts` y `profile.page.ts`). Esto
confirma que el mapeo es el correcto, no una aproximación.

**Contraste WCAG** (regla del proyecto: mínimo AA 4.5:1 en dark sobre `--bg-surface`
`#18181b`):
- `--ds-brand` dark nuevo (`#3b82f6`) sobre `#18181b` → **4.82:1** (AA — antes el sky
  anterior daba 8.22:1 AAA; se documenta la baja de AAA a AA en el comentario del
  token, es una pérdida real de margen pero sigue cumpliendo el mínimo del proyecto).
- `--state-success` dark nuevo (`#10b981`) sobre `#18181b` → **6.99:1** (sigue en
  rango AAA, sin pérdida).

## ACs Afectados

Ninguno (no hay spec funcional) — cambio de valores de design tokens.

## Cambio

En `src/styles/tokens/_variables.scss`:
1. Bloque `:root` (light): `--state-success`/`-bg`/`-border` → familia emerald.
   `--ds-brand`, `--color-primary`, `--color-primary-hover`, `--color-primary-dark`,
   `--color-primary-muted`, `--color-primary-tint`, `--accent-border`,
   `--accent-glow`, `--shadow-focus`, `--gradient-primary`, `--gradient-hero`,
   `--gradient-subtle` → familia blue.
2. Bloque `[data-mode='dark']`: mismos tokens, valores dark de la misma familia.
3. `--state-info` (light `#0284c7` / dark `#38bdf8`) queda **sin tocar** — no estaba
   en el alcance aprobado y no hay evidencia de uso real con un color específico que
   corregir (solo aparece en `_primeng-overrides.scss`/`tailwind.css` como
   definición de utility, sin consumidor visible en pantallas auditadas). Queda
   documentado como posible inconsistencia menor a revisar aparte: ahora difiere del
   nuevo `--ds-brand` en vez de coincidir como antes.

## Test de Regresión

`npm run test:ci` en verde. No debería haber specs que dependan de valores hex
literales de tokens (son variables CSS, no lógica TS), pero se corre igual como
guardrail general.
