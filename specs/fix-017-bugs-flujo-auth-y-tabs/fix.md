# Fix: bugs encontrados en revisión manual de flujos (signup, tabs, íconos)

> id: fix-017-bugs-flujo-auth-y-tabs
> refs: pedido explícito del usuario — "revisa los flujos de la app con el
>   navegador, crea una nueva cuenta... y te logeas". Se creó una cuenta real
>   contra Supabase local (Docker) y se navegó la app autenticada, detectando
>   3 causas raíz distintas. Usuario confirmó via AskUserQuestion: "Sí,
>   arreglar los 4 (Recommended)".
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Contexto de la verificación

Se levantó Supabase local (Docker Desktop + `npx supabase start`, stack ya
estaba corriendo en contenedores previos) y se probó el flujo completo en el
navegador: `/login` → "Crear cuenta" → registro con
`qa.fittrack.test@example.com` → verificación de sesión → logout → login con
las mismas credenciales → navegación por tabs.

## Causa raíz 1 — Tabs de navegación completamente rotas (CRÍTICO)

**Síntoma:** al hacer click en "Ejercicios" o "Perfil" en la tab-bar no pasa
nada. Reproducible 100% de las veces. Consola tira exactamente:
`Error: Cannot activate an already activated outlet` (1 error por click,
confirmado con conteo exacto de mensajes de consola antes/después de un click
aislado).

**Causa raíz:** `app.config.ts` nunca provee
`{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }`, que Ionic
Angular requiere para que `<ion-tabs>` (con su `<ion-router-outlet tabs="true">`
interno) funcione correctamente con el Router de Angular al cambiar entre
tabs hermanas. Sin este provider, la estrategia de reuse por defecto de
Angular no sabe cómo destruir/activar rutas dentro del outlet anidado de
Ionic.

**Cambio:** agregar el provider en `src/app/app.config.ts`.

```ts
import { IonicRouteStrategy } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
// ...
providers: [
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  // ...resto de providers existentes
]
```

## Causa raíz 2 — Signup no redirige tras éxito (ALTO impacto, silencioso)

**Síntoma:** tras enviar "Crear Cuenta" con datos válidos, la pantalla se
queda igual — sin error, sin mensaje de éxito, sin redirect — aunque la
cuenta y la sesión SÍ se crean correctamente (confirmado: token válido en
`localStorage`, fila en `profiles` creada por trigger, navegación manual a
`/app` carga bien).

**Causa raíz:** en `login.component.ts` (case `'register'` de `onSubmit()`),
la condición `data?.session || this.auth.isAuthenticated()` se evalúa
inmediatamente después del `await this.auth.signUp(...)`. `data.session`
debería venir poblado en la respuesta de Supabase (autoconfirm está activo en
local), pero aparentemente no llega poblado de forma confiable en todos los
casos, y `isAuthenticated()` depende de un signal que se actualiza de forma
asíncrona vía el listener `onAuthStateChange` (no está garantizado que ya
haya corrido en este punto). Al fallar ambas condiciones, cae al branch de
"éxito sin sesión" (`switchMode('login')` + mensaje) — pero ni siquiera ese
mensaje se vio en la reproducción, lo que sugiere el error real puede estar
en cómo se lee `data.session` de la respuesta del facade.

**Cambio:** en vez de confiar en el resultado síncrono de `signUp()`, esperar
explícitamente a que `AuthFacade` confirme la sesión antes de decidir la
rama, con un timeout corto de seguridad — mismo patrón que ya usa
`auth.guard.ts` con `whenReady`/timeout. Si tras el timeout no hay sesión,
mostrar el mensaje de éxito + cambiar a modo login (comportamiento actual
para el caso de confirmación por email pendiente en otros entornos).

## Causa raíz 3 — Íconos Lucide rotos: `clipboard-list` y `play`

**Síntoma:** consola tira `Error: The "X" icon has not been provided by any
available icon providers` para `clipboard-list` y `play`. El ícono
simplemente no renderiza (queda vacío).

**Causa raíz:** `icon.component.ts` mantiene un set local `PROVIDED_ICONS`
(~160 nombres) que se usa para decidir si `<app-icon>` renderiza el ícono
"local" (vía `<lucide-icon>`, sin red) o si lo descarga dinámicamente del CDN.
Ese set está desincronizado del registro REAL de íconos en
`app.config.ts` → `LucideAngularModule.pick({...})` (~65 íconos). Ambos
nombres están en `PROVIDED_ICONS` pero NUNCA fueron importados/pickeados en
`app.config.ts`, así que Angular intenta renderizarlos "localmente" y
Lucide Angular tira el error porque no están registrados.

- `clipboard-list` es una **regresión de este mismo track de trabajo**
  (fix-016): se usó para el ícono de empty-state en `workouts.page.ts` y
  `history.page.ts`, confiando en que `PROVIDED_ICONS` reflejaba la realidad.
- `play` es preexistente (ya se usaba en `workouts.page.ts` antes de esta
  sesión) — no relacionado a fix-016, pero visible ahora que se probó la app
  end-to-end por primera vez con Supabase local corriendo.

**Cambio:** agregar `ClipboardList` y `Play` al import + `pick({...})` de
`LucideAngularModule` en `app.config.ts`. No se toca `PROVIDED_ICONS` en
`icon.component.ts` — sigue siendo correcto que esos nombres "deberían" ser
locales, solo faltaba completar el registro real.

## Fuera de alcance

- Auditoría completa de `PROVIDED_ICONS` vs `LucideAngularModule.pick()` para
  encontrar OTROS posibles nombres desincronizados que aún no se manifestaron
  en pantalla — no se relevó exhaustivamente, solo se corrigen los 2 casos
  confirmados por error real en consola. Si aparecen más, ameritan su propio
  fix.
- Falla puntual de `npx supabase start` en background
  (`Bind for 0.0.0.0:54352 failed: port is already allocated`) — no es un bug
  de la app, fue una ejecución redundante mía sobre un stack de Docker que ya
  estaba corriendo. Sin acción requerida.

## ACs Afectados

Ninguno formal (no hay spec con ACs para estos flujos), pero corrige
funcionalidad core: registro, login y navegación por tabs.

## Test de Regresión

Manual en navegador (Supabase local, cuenta nueva `qa.fittrack.verify2@example.com`):
- ✅ Signup redirige automáticamente a `/app` sin necesidad de reload manual.
- ✅ Click en "Ejercicios" → navega al catálogo de ejercicios sin errores en consola.
- ✅ Click en "Perfil" → navega y muestra datos del usuario (nombre, email, avatar) sin errores.
- ✅ Ícono `play` renderiza correctamente en botón "Iniciar Sesión Libre".
- ✅ Ícono `clipboard-list` renderiza correctamente en empty-state de "Historial Reciente".
- ✅ Consola limpia de `Cannot activate an already activated outlet` y de errores
  "icon has not been provided" tras los 3 cambios.

`npm run test:ci` → 31 archivos / 76 tests, 0 fallos.
`ng build` (producción) → build exitoso, solo los 2 warnings NG8107 preexistentes
y fuera de alcance (`history.page.ts`/`workouts.page.ts`).
