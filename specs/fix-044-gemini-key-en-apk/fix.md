> id: fix-044-gemini-key-en-apk
> refs: Comparación con app-de-entrenamiento (sesión 2026-09-25)
> status: done
> created: 2026-09-25

## Síntoma
- `release.yml` pasa `GEMINI_API_KEY` a `scripts/set-env.js`, que la escribe en
  `environment.prod.ts` → queda dentro del bundle del APK (extraíble), aunque ningún código de
  `src/app` la usa: el OCR va por la Edge Function `process-receipt`.
- `scripts/set-local-env.js` (corre en `npm start` / `npm run build`) escribe la key de `.env`
  en `src/environments/environment.ts`, que está versionado → riesgo de commitearla.

## Causa raíz
Herencia de cuando el Coach IA llamaba a Gemini desde el cliente. app-de-entrenamiento ya lo
corrigió (key como secreto de Supabase); este repo no.

## Solución
- `set-env.js`: solo `SUPABASE_URL` / `SUPABASE_ANON_KEY`.
- Eliminar `set-local-env.js` y su uso en `package.json` (`start`, `build`, `start:raw`, `build:raw`).
- `environment*.ts`: sin `geminiApiKey`.
- `release.yml`: publicar `GEMINI_API_KEY` como secreto del proyecto Supabase (como hace
  entrenamiento) antes de desplegar `process-receipt`; no pasarla al build del APK.
- Guardia: regla (f) en `src/app/architecture.spec.ts` — los `environment*.ts` solo contienen
  configuración pública (`production`, `supabase.url`, `supabase.anonKey`).

## Acceptance Criteria
- [x] AC1: Ningún `environment*.ts` ni script de build contiene/inyecta `GEMINI_API_KEY`.
- [x] AC2: `process-receipt` recibe la key como secreto de Supabase desde el CI.
- [x] AC3: Regla (f) en rojo antes y en verde después.
- [x] AC4: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.

## Nota operativa
Si algún APK publicado se construyó con el secreto `GEMINI_API_KEY` presente, la key está
expuesta: rotarla en Google AI Studio y actualizar el secret del repo.

## Test de regresión
`src/app/architecture.spec.ts` → regla (f).
