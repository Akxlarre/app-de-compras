# Fix: borrar una rutina destruye en silencio las sesiones del plan que la usan

> id: fix-026-cascade-rutina-destruye-plan
> refs: hallado durante la migración visual de Entrenar (spec 0002).
>   El usuario eligió "Bloquear en la base, siempre".
> status: done
> created: 2026-09-15
> closed: 2026-09-15
>
> **Cierre.** Verificado: `confdeltype = r` en la base viva y sin vínculo
> duplicado (siguen exactamente tres FK hacia `routines`). Prueba en una
> transacción con `ROLLBACK`: borrar una rutina usada por un plan falla con
> `23503`, la sesión del plan sobrevive y no queda residuo. Tests: 94 en
> verde; los 4 nuevos de `deleteRoutine` reemplazan al placeholder. Build
> limpio.
>
> **Queda sin verificar en ejecución:** el mensaje en español de la Edge
> Function (no hay runtime local) y el toast renderizado en la app. Este
> último no se probó en navegador para no crear un plan real ni accionar un
> control destructivo sobre datos del usuario; su lógica la cubren los tests
> unitarios. El problema de `GeminiService` quedó propuesto como tarea
> aparte.

## Síntoma

Borrar una rutina que forma parte de un plan (mesociclo) elimina sin
aviso las sesiones de ese plan que la usan y todos sus objetivos de
progresión: peso, repeticiones y RIR planificados. El diálogo de la app
solo dice "Esta acción no se puede deshacer".

## Causa raíz

`mesocycle_sessions.routine_id → routines ON DELETE CASCADE`
(migración `20260913172746_mesocycles_schema.sql`, línea 40).

Verificado en la base viva, no asumido por convención:

| Tabla | Constraint | Al borrar |
|---|---|---|
| `mesocycle_sessions` | `mesocycle_sessions_routine_id_fkey` | **c — cascade** |
| `routine_exercises` | `routine_exercises_routine_id_fkey` | c — cascade |
| `workouts` | `workouts_routine_id_fkey` | n — set null |

La cascada continúa a `mesocycle_session_targets` por
`session_id ON DELETE CASCADE`.

Hay **dos caminos** de borrado:

1. **App** — diálogo en Entrenar → `RoutineFacade.deleteRoutine()`.
2. **Coach IA** — herramienta `eliminar_rutina` →
   `McpClientService.callTool()` → Edge Function `mcp-server`
   (`index.ts:158`), que borra contra la base **sin pasar por
   `RoutineFacade` y sin ningún diálogo**.

Un guard en Angular no alcanza el camino 2. La única capa que protege
ambos es la base de datos.

## Cambio

1. **Migración** — `mesocycle_sessions_routine_id_fkey` pasa a
   `ON DELETE RESTRICT`. Idempotente.
2. **`RoutineFacade.deleteRoutine()`** — detecta el código Postgres
   `23503` (foreign_key_violation) y, en vez del error crudo, muestra un
   toast en español que explica por qué y cómo resolverlo: borrar el plan
   primero, cosa que la app ya permite (`MesocycleFacade.deleteMesocycle`).
   Toda otra falla también muestra toast; antes no mostraba nada.
3. **Edge Function `mcp-server`, `eliminar_rutina`** — mismo mapeo de
   `23503` a un mensaje en español.

   > **Corrección — ese mensaje hoy no le llega a nadie.** Se asumió que la
   > IA podría explicárselo al usuario; al implementar se verificó que no.
   > Toda excepción de una herramienta termina en el `catch` global de la
   > Edge Function (`index.ts:788`), que responde **HTTP 500**. El cliente
   > lo recibe como `HttpErrorResponse`, `McpClientService` lo relanza, y
   > `GeminiService` llama a `callTool` **sin try/catch dentro del bucle**
   > (`gemini.service.ts:257`): el error salta al `catch` exterior
   > (`gemini.service.ts:280`) y el turno completo del Coach termina en
   > error. El modelo nunca ve el texto de la herramienta.
   >
   > **El dato sí queda protegido**: el `RESTRICT` rechaza el borrado igual.
   > Lo que falla es solo la explicación.
   >
   > No es un efecto de este fix: **cualquier** error de herramienta (rutina
   > inexistente, `routine_id` faltante, fallas de `crear_rutina`) ya
   > colapsaba el turno así. Arreglarlo implica tocar `GeminiService`, una
   > superficie no declarada en este fix. Queda **fuera de alcance** y se
   > propone como track propio. El cambio en la Edge Function se conserva
   > porque es correcto y es prerrequisito de ese arreglo.

## No cambia

- `routine_exercises_routine_id_fkey` sigue en cascade: son los
  ejercicios propios de la rutina.
- `workouts_routine_id_fkey` sigue en set null: el historial de
  entrenamientos sobrevive al borrado.

## Fuera de alcance

- Nombrar el plan en el mensaje: requiere una consulta adicional.
- `RoutineFacade` llama `.client.from()` directo en vez de usar un
  Repository, contra `architecture.md`. Deuda preexistente.
- El spec de `RoutineFacade` era un placeholder (`expect(true)` con el
  comentario "just dummy test to satisfy architectural rules"). Este fix
  agrega tests reales **solo de `deleteRoutine`**.

## Limitación de verificación

No hay runtime de Edge Functions local (`docker ps` sin contenedor de
edge). El camino del Coach IA no puede ejecutarse de punta a punta en
local. La protección real vive en la base y eso es lo que se verifica;
el mensaje traducido de la Edge Function queda **sin verificar en
ejecución** hasta que se despliegue.

## Test de Regresión

- **Unit** — `routine.facade.spec.ts`: un borrado bloqueado (`23503`)
  devuelve `false`, no quita la rutina de la lista y muestra un toast sin
  jerga de Postgres; un borrado normal sí la quita.
- **Base** — dentro de una transacción con `ROLLBACK`: crear un plan con
  una sesión que usa una rutina, intentar borrar la rutina y confirmar
  que falla con `23503`. Confirmar `confdeltype = r` en el constraint.
- `npm run test:ci` + `ng build`.
