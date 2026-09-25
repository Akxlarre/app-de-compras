# Fix: environment.prod.ts commiteado sin geminiApiKey
> id: fix-003-environment-prod-falta-geminiapikey
> refs: fix-001-apk-produccion-supabase-local
> status: done
> closed: 2026-09-14
> created: 2026-09-14

## Root Cause
Al implementar fix-001 se agregó `geminiApiKey` al template que `scripts/set-env.js`
genera dinámicamente para `environment.prod.ts`, pero el archivo `environment.prod.ts`
que queda **commiteado en git** (el placeholder con `url`/`anonKey` vacíos que usa
`fileReplacements` en `angular.json`) nunca se actualizó con ese mismo campo.

Como `environment.ts` sí tiene `geminiApiKey` y `gemini.service.ts` lo referencia,
cualquier build de producción que use el `environment.prod.ts` commiteado tal cual
—sin haber corrido antes `set-env.js` para regenerarlo— falla en compilación con
`TS2339: Property 'geminiApiKey' does not exist...`. Esto rompe `npm run build`
(que usa `production` como configuración default) para cualquiera que lo corra
localmente sin las variables de entorno de CI seteadas.

## ACs Afectados
Ninguno — fix autónomo (corrige un cabo suelto de fix-001, sin AC funcional propio).

## Cambio
- **Archivo:** `src/environments/environment.prod.ts`
  **Qué cambia:** agrega `geminiApiKey: ""` para que la forma del objeto coincida con
  `environment.ts` y con lo que `scripts/set-env.js` ya genera en CI.

## Test de Regresión
No aplica test automatizado (config de build). Verificación manual:
- `npx ng build --configuration=production` sin `SUPABASE_URL`/`SUPABASE_ANON_KEY`
  seteadas (o sea, sin correr `set-env.js` antes) debe compilar sin el error TS2339 ✓
  — **verificado, build local exitoso.**
