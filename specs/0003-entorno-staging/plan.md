# Plan — 0003-entorno-staging

1. `src/environments/environment.staging.ts`: misma forma que `environment.ts`
   (`production: false`, `supabase.url`, `supabase.anonKey`), valores de staging.
2. `angular.json`:
   - `build.configurations.staging` = `development` + `fileReplacements` → `environment.staging.ts`.
   - `serve.configurations.staging.buildTarget` = `app-de-compras:build:staging`.
3. `package.json`: `"start:staging": "ng serve --configuration staging"`.
4. README: sección "Puesta en marcha" con la opción staging.
5. Validar: `test:ci`, `lint:arch`, `ng build`, `ng build --configuration staging`; levantar
   `start:staging` y capturar el login con Chromium headless.

Riesgo: ninguno para producción — el build de producción sigue usando `environment.prod.ts`.
