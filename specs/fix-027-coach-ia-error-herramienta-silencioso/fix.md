# Fix: el Coach IA aborta el turno y oculta el error real cuando una herramienta MCP falla
> id: fix-027-coach-ia-error-herramienta-silencioso
> refs: propuesto en specs/fix-026-cascade-rutina-destruye-plan/fix.md como track separado
> status: done
> created: 2026-09-15
> closed: 2026-09-15
>
> **Cierre.** `gemini.service.spec.ts` — 6/6 verdes, incluyendo los 3 casos
> nuevos (tool error → mensaje limpio, sin mensaje genérico, fallback sin
> texto) y los 2 de regresión del catch exterior (429 intacto, otras fallas
> de Groq siguen devolviendo el mensaje de API Key). Suite completa: 99
> passed, 0 failed (61 skipped, preexistente). `ng build` compila limpio
> (los 3 warnings de bundle/optional-chaining son preexistentes, no
> tocados por este fix). No verificado en runtime real (sin Edge Functions
> local, como ya advertía fix-026) — cubierto por unit tests únicamente.

## Root Cause

En `GeminiService.generateResponse()`, el bucle de resolución de tool calls
(`gemini.service.ts:249-277`) llama `await this.mcpClient.callTool(...)`
(línea 257) **sin try/catch propio**. Cuando una herramienta MCP falla
—p.ej. `eliminar_rutina` rechazando un borrado con `23503`—, `callTool`
relanza el `HttpErrorResponse` (`mcp-client.service.ts:49-52`), que escapa
del bucle y cae en el `catch` exterior (línea 280). Ese catch solo
distingue el caso 429; para cualquier otro error devuelve el mensaje
genérico "Verifica tu API Key o conexión" (línea 286).

Consecuencia: el modelo nunca ve el texto de la herramienta y el usuario
recibe una explicación engañosa para **cualquier** falla de herramienta,
no solo la de `eliminar_rutina`.

## ACs Afectados

Ninguno — fix autónomo. Corrige un defecto expuesto (no introducido) por
fix-026, propuesto explícitamente como track separado en ese fix.md.

- AC-nuevo: si `mcpClient.callTool()` rechaza dentro del bucle de tool
  calls, `generateResponse()` empuja un mensaje `role: 'tool'` con el
  texto del error (mismo `tool_call_id`) y continúa el turno, en vez de
  abortar al catch exterior.
- AC-nuevo: el texto empujado es `err.error?.error` sin el prefijo
  `"Error: "` que agrega `String(err)` en la Edge Function.
- AC-nuevo: el manejo de 429 en el catch exterior no cambia — sigue
  aplicando solo a fallas reales de la llamada HTTP a Groq.

## Cambio

- **Archivo:** `src/app/core/services/ai/gemini.service.ts`
- **Qué cambia:** el `await this.mcpClient.callTool(...)` dentro del
  bucle de tool calls queda envuelto en try/catch. Ante error, un método
  privado `extractToolErrorMessage()` extrae `err.error?.error`, le quita
  el prefijo `"Error: "` y ese texto (o un mensaje de fallback si no hay
  texto utilizable) se usa como `content` del mensaje `role: 'tool'` que
  se empuja a `messages`. El turno continúa llamando a Groq de nuevo para
  que el modelo pueda explicarle el error al usuario.

## Test de Regresión

- `src/app/core/services/ai/gemini.service.spec.ts > generateResponse() > cuando una herramienta falla > empuja un mensaje role:tool con el error limpio y el modelo puede responder` ✓
- `src/app/core/services/ai/gemini.service.spec.ts > generateResponse() > cuando una herramienta falla > no usa el mensaje genérico de "Verifica tu API Key"` ✓
- `src/app/core/services/ai/gemini.service.spec.ts > generateResponse() > el manejo de 429 en la llamada a Groq sigue intacto` ✓
