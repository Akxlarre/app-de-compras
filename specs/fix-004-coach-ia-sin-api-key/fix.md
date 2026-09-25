# Fix: Coach Virtual IA sin API key real en producción
> id: fix-004-coach-ia-sin-api-key
> refs: fix-001-apk-produccion-supabase-local
> status: in_progress
> created: 2026-09-14

## Root Cause
`GeminiService` ([gemini.service.ts:22](../../src/app/core/services/ai/gemini.service.ts))
usa `environment.geminiApiKey` como Bearer token para llamar directo a la API de Groq
(`https://api.groq.com/openai/v1/chat/completions`). `scripts/set-env.js` (el script que
CI corre para generar `environment.prod.ts`) nunca inyectaba un valor real para este
campo — solo lo agregó vacío (`geminiApiKey: ''`) en fix-003, únicamente para que la
forma del objeto no rompiera la compilación. Groq recibe `Authorization: Bearer ` (vacío)
y responde con error de autenticación, que `GeminiService` atrapa como el mensaje
genérico "Hubo un inconveniente al comunicarme con tu Coach (Groq)."

En local, `environment.ts` tiene el placeholder literal `"TU_API_KEY_AQUI"` — nunca se
configuró una key real ahí tampoco. El usuario ya agregó el secret `GEMINI_API_KEY` en
GitHub; falta conectarlo en el pipeline de build.

## ACs Afectados
Ninguno — fix autónomo.

## Cambio
- **Archivo:** `scripts/set-env.js`
  **Qué cambia:** lee `process.env.GEMINI_API_KEY` y lo escribe en `geminiApiKey` del
  `environment.prod.ts` generado, en vez de dejarlo siempre vacío.
- **Archivo:** `.github/workflows/release.yml`
  **Qué cambia:** agrega `GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}` al env del paso
  que corre `set-env.js`.

## Test de Regresión
No aplica test automatizado (config de build/CI). Verificación manual:
- Publicar un nuevo release e instalar el APK.
- En el Coach Virtual IA, enviar un mensaje y confirmar que responde en vez de mostrar
  el error de Groq ✓
