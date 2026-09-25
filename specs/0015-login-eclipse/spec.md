# Spec: el login (y recuperar contraseña) en Eclipse

> id: 0015-login-eclipse
> refs: última vista sin migrar junto con el Plan (0014). Es la primera
>   pantalla que ve alguien: Tier 1 — Ceremonia.
> status: draft
> created: 2026-09-20
> autor del contrato: sesión de rediseño Eclipse. **La implementación la
>   toma otra sesión**: leer `specs/PENDIENTES-ECLIPSE.md` antes de
>   empezar.

## Contexto

Dos archivos con la misma tarjeta y el mismo encabezado:

| Archivo | Ruta | Líneas |
|---|---|---|
| `features/auth/login/login.component.ts` | `/login` (ingresar, crear cuenta, recuperar) | 399 |
| `features/auth/reset-password/reset-password.page.ts` | `/reset-password` (clave nueva) | 399 |

Es **Tier 1 — Ceremonia**: se ve una vez, no se opera bajo presión. Es
el único lugar donde la marca puede ocupar espacio. Aun así valen los
pisos duros: 13px de texto, 44px de objetivo, Anton solo sobre 28px.

Leído en el código, sin tocar nada (2026-09-20):

| Criterio | Hallazgo |
|---|---|
| 7 — Sistema | Colores fuera del sistema: `text-zinc-400` (**8** en login, 4 en recuperar), `text-zinc-600`, `text-white` (6 y 5), `border-white/[0.08]`, `bg-white/[0.04]`, y a mano `#93c5fd` (**azul**, ×3), `#f87171` (rojo), `#34d399` (verde), `#121217` (fondo de la tarjeta). La regla prohíbe colores Tailwind arbitrarios: van tokens |
| 4 — Legibilidad | `text-xs` (**12px**) ×8 en cada archivo: bajada del título, textos de ayuda, enlaces y avisos. El piso es 13px |
| 4 — Legibilidad | `h1` "FITTRACK" con `font-black italic`: lo toma la regla global de `h1, h2` y sale en **Anton**, que no tiene ni peso 900 ni cursiva — el navegador la **falsifica**. El `h2` de la tarjeta ("Iniciar Sesión") queda en **Anton a 20px**, bajo su piso de 28 (misma causa que fix-038) |
| 6 — Intensidad | Entrada por clase CSS `animate-fade-in-up`, no por `GsapAnimationsService`; la vista no declara tier |
| 1 — Semántica | El error de credenciales y el aviso de éxito se distinguen **solo por color** (`#f87171` / `#34d399`). La regla de estados de Eclipse pide forma: ícono + textura de borde + posición |

## Acceptance Criteria

- **AC-01** — Las dos vistas declaran `.tier-ceremonia` y su entrada
  pasa por `gsap.animateTierEnter()`; se va `animate-fade-in-up`.
- **AC-02** — **0 colores fuera del sistema**: ni `zinc-*`, ni
  `text-white`, ni `white/[0.0x]`, ni hex a mano. Todo por tokens
  (`--text-primary/secondary/muted`, `--bg-surface/elevated`,
  `--border-subtle`, `--ds-brand`, `--state-error/-success`).
- **AC-03** — **Ningún texto baja de 13px**.
- **AC-04** — **0 textos en Anton bajo 28px**, y ningún peso ni cursiva
  falsificados: si "FITTRACK" va en Anton, va en su peso real (400) y
  sin `italic`; el título de la tarjeta baja a `--font-body` con peso
  alto.
- **AC-05** — Todo objetivo táctil ≥ **44px**, incluidos los enlaces de
  "¿Olvidaste tu contraseña?" y "Crear cuenta". Los campos a **16px**
  (debajo de eso iOS hace zoom al enfocar).
- **AC-06** — Error y éxito se reconocen **sin color**: ícono propio y
  borde distinto, no solo el tono.
- **AC-07** — Ningún texto cambia, ni el voseo.
- **AC-08** — `npm run test:ci` en verde, `ng build` sin avisos y las
  dos vistas dentro de su presupuesto de estilos.

## Fuera de alcance

- La lógica de autenticación, el `AuthFacade` y los mensajes de error
  que llegan de Supabase (se les cambia la forma, no el texto).
- El registro de cuentas nuevas como funcionalidad: solo su aspecto.

## Riesgos

- **La verificación exige cerrar sesión.** La sesión abierta en el
  navegador es la del usuario: hay que pedirle **a él** que la cierre y
  vuelva a entrar, o trabajar en una ventana privada. Una IA no crea
  cuentas ni escribe contraseñas: si hace falta entrar, lo hace la
  persona.
- Las tres vistas del login (ingresar, crear cuenta, recuperar) comparten
  tarjeta: hay que recorrer las tres, más `/reset-password`, más el
  estado de error y el de éxito.
- Subir 12px a 13px y los enlaces a 44px estira la tarjeta: revisar que
  entre a 375×812 sin scroll raro y con el teclado abierto.

## Cómo verificar

Navegador a **375×812**, con la sesión cerrada por el usuario. La misma
consulta que 0014 (textos bajo 13px, Anton bajo 28px, objetivos bajo
44px), en seis estados:

1. Ingresar (vacío)
2. Ingresar con error de credenciales
3. Crear cuenta
4. Recuperar contraseña
5. Aviso de correo enviado
6. `/reset-password` con clave nueva

En cada uno: 0 textos bajo 13px, 0 en Anton bajo 28px, 0 objetivos bajo
44px, ningún texto cortado. Además, capturar error y éxito y comprobar
que se distinguen **en escala de grises**.

Cierre: `specs/0015-login-eclipse/acceptance.md` con la evidencia medida
antes y después de cada estado.
