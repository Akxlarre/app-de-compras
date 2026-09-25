# Plan técnico — 0015-login-eclipse

> Deriva de `spec.md`. Conviene hacerlo **después** de 0014: el Plan es
> más grande y comparte los mismos tokens.

## Antes de escribir código

1. `/spec-activate 0015-login-eclipse`.
2. Rama desde `main` actualizado: `feature/login-eclipse`.
3. Server por `preview_start` (configuración `app-de-entrenamiento`),
   nunca `ng serve` por Bash.
4. **Pedirle al usuario que cierre sesión** (o usar una ventana
   privada) y medir la línea base en los seis estados de `spec.md`.
   No crear cuentas ni escribir contraseñas: eso lo hace la persona.

## Archivos

| Archivo | Qué cambia |
|---|---|
| `features/auth/login/login.component.ts` | Tier, tokens en lugar de `zinc-*` / `white/[0.0x]` / hex, textos al piso de 13px, `h1`/`h2` fuera de Anton falsificado, objetivos a 44px, campos a 16px, error y éxito con forma |
| `features/auth/reset-password/reset-password.page.ts` | Lo mismo: comparte encabezado y tarjeta |

Si al terminar las dos tarjetas quedan idénticas, evaluar mover lo
repetido a `tailwind.css` (`@layer components`), como `.modal-btn-*` en
0011. No crear un componente nuevo solo para eso sin medir antes cuánto
se repite.

No se toca `AuthFacade` ni las rutas.

## Pasos

1. **Línea base medida** en los seis estados.
2. **Color**: cada clase arbitraria y cada hex → token. Commit propio.
3. **Tipografía**: 12px → 13px; `h1` en Anton real (sin `font-black` ni
   `italic`) o en cuerpo si no llega al piso; `h2` de la tarjeta a
   `--font-body`. Commit propio.
4. **Ergonomía**: enlaces y botones a 44px, campos a 16px. Commit
   propio.
5. **Estados**: error y éxito con ícono y borde propios, mismo texto.
   Commit propio.
6. **Tier y entrada**: `.tier-ceremonia` + `animateTierEnter()`, se va
   `animate-fade-in-up`. Commit propio.
7. **Verificación** en los seis estados (incluida la prueba en escala de
   grises), `npm run test:ci`, `ng build`, `acceptance.md`, cerrar track
   y abrir PR.

## Reglas que aplican

Las mismas que 0014: tokens obligatorios, `@if`/`@for`, `input()`/
`output()`, `OnPush`, GSAP para animaciones (prohibido `@keyframes` y
`@angular/animations`), `data-llm-action` en botones que mutan estado
(el submit del login ya lo necesita), commits Conventional con archivos
puestos a mano, nunca commitear `environment.ts`, PR contra `main` sin
push directo.

## Criterio de "hecho"

Los ocho AC verificados con medición en los seis estados,
`acceptance.md` escrito, tests en verde, build sin avisos y PR abierto.
