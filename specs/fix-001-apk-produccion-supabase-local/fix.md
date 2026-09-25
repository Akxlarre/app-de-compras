# Fix: APK de producción apunta a Supabase local
> id: fix-001-apk-produccion-supabase-local
> refs: —
> status: done
> closed: 2026-09-14
> created: 2026-09-14

## Root Cause
`src/environments/environment.ts` está commiteado en el repo apuntando a la instancia
local de Supabase (`http://localhost:54351` + anon key de `supabase-demo`) y además
marcado con `git update-index --assume-unchanged`, por lo que la copia local del
desarrollador (con la URL real de producción) nunca se refleja en `git status` ni se
commitea. El CI (`npm run build:raw` → `ng build`) compila con el `environment.ts` del
repo — es decir, con `localhost:54351` — y ese es el bundle que termina en el APK
publicado (confirmado extrayendo `chunk-KLGEL45Y.js` del APK instalado v1.0.15).

Como agravante, `angular.json` no define `fileReplacements` para la configuración
`production`, así que `src/environments/environment.prod.ts` (donde sí se pensaba
inyectar la URL real vía `scripts/set-env.js` en CI) nunca se usa — el build siempre
importa `environment.ts` sin importar la configuración.

En el celular, `localhost` resuelve al propio dispositivo, no hay nada escuchando en
el puerto 54351, y la conexión se rechaza de inmediato. `supabase-js` devuelve un error
de red que `mapAuthError()` no reconoce, cayendo en el mensaje genérico "Error de
autenticación. Por favor, verifica tus datos e intenta de nuevo." tanto en login como
en registro (confirmado vía logcat: la petición nunca llega a los logs de Supabase).

## ACs Afectados
Ninguno — fix autónomo (bug de configuración de build, no de una spec funcional).

## Cambio
- **Archivo:** `angular.json`
  **Qué cambia:** agrega `fileReplacements` en la configuración `production` del target
  `build`, para que reemplace `environment.ts` por `environment.prod.ts` en builds de
  producción (que es la `defaultConfiguration` y la que usa `ng build` en CI).
- **Archivo:** `.github/workflows/release.yml`
  **Qué cambia:** agrega un paso `node scripts/set-env.js` (usando los secrets
  `SUPABASE_URL` y `SUPABASE_ANON_KEY`) antes de "Build Web (Angular)", para que
  `environment.prod.ts` se rellene con las credenciales reales en cada build de release.
  (Se descarta hardcodear la key directo en `environment.prod.ts` — el Architect Guard
  del proyecto bloquea credenciales de Supabase en archivos de environment; el mecanismo
  correcto es el que el propio `set-env.js`/CI ya estaba diseñado para usar.)
- **Archivo:** `src/environments/environment.ts`
  **Qué cambia:** se quita el flag `assume-unchanged` (`git update-index --no-assume-unchanged`)
  para que vuelva a ser visible a git; se deja apuntando a Supabase local para desarrollo.
- **Requiere del usuario:** agregar el secret `SUPABASE_ANON_KEY` en GitHub (Settings →
  Secrets → Actions). `SUPABASE_URL` ya existe como secret (se usa en el paso de
  "Publicar Actualización en Supabase").

## Test de Regresión
No aplica test automatizado (es config de build, no lógica de negocio). Verificación manual:
- `ng build --configuration=production` con `SUPABASE_URL`/`SUPABASE_ANON_KEY` en el
  entorno y confirmar que el bundle resultante contiene `ibkyzgxqbxletnwildrm.supabase.co`
  y NO contiene `localhost:54351`.
- Publicar un nuevo APK (tag `v1.0.16`) e iniciar sesión desde un dispositivo real ✓ — **verificado, login funciona en dispositivo real.**
