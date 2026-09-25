> id: 0003-entorno-staging
> status: done
> created: 2026-09-25

# Entorno de desarrollo contra staging

## Problema
El único entorno de desarrollo apunta a Supabase local (`localhost:54351`), que exige Docker y
levantar plataforma-db. Producción es de app-de-entrenamiento (usuarios reales) y compras aún no
se publica. Falta una forma de desarrollar compras contra un Supabase real sin tocar producción.

## Objetivo
`npm run start:staging` levanta la app contra el proyecto de staging (plataforma-db,
`okcekripvbimlloqlihv`), que ya tiene el schema `shop` expuesto.

## Fuera de alcance
- Flujo de publicación de la app de compras.
- Cambiar el `ng serve` por defecto (sigue en local) o el build de producción.

## Acceptance Criteria
- [x] AC1: `src/environments/environment.staging.ts` **generado** por `scripts/set-env.js --target staging`
  desde `.env.staging` (ambos fuera de git; plantilla `.env.staging.example`). El Architect Guard
  prohíbe credenciales escritas a mano en environment files.
- [x] AC2: configuración `staging` en `angular.json` (build + serve) que reemplaza `environment.ts`.
- [x] AC3: script `npm run start:staging`; README lo documenta.
- [x] AC4: la app levanta con `start:staging` y la pantalla de login carga contra staging.
- [x] AC5: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.

## Evidencia (2026-09-25)
- AC1: `npm run start:staging` imprime "environment.staging.ts configurado correctamente" con la URL
  de staging; el archivo y `.env.staging` quedan fuera de git (`git status` limpio de ambos).
- AC2/AC3: `ng build --configuration staging` OK; README "Puesta en marcha" opción A.
- AC4: Chromium headless en `/login`: la app llama a `okcekripvbimlloqlihv.supabase.co`
  (`/rest/v1/app_updates`, `/auth/v1/token`); credenciales inventadas → "Error de autenticación".
- AC5: `test:ci` 157/157, `lint:arch` 0 errores (2 avisos previos), `ng build` OK.
- Extra: `set-env.js --target <desconocido>` falla con exit 1; sin `--target` sigue generando
  `environment.prod.ts` (release.yml sin cambios).
