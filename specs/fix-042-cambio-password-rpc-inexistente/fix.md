> id: fix-042-cambio-password-rpc-inexistente
> refs: Hallazgo del análisis (sesión 2026-09-25)
> status: done
> created: 2026-09-25

## Síntoma
En "Restablecer contraseña", la contraseña se cambia en Supabase Auth pero la pantalla muestra
"Contraseña actualizada, pero hubo un error al sincronizar…". Siempre.

## Causa raíz
`AuthFacade.updatePassword` llama a la RPC `user_complete_first_login`, heredada de la app de
entrenamiento. No existe en `supabase/migrations/` y esta app no tiene concepto de primer login
(`firstLogin` se setea siempre en `false` en `loadUserFromSession`).

## Solución
Quitar la llamada a la RPC. `updatePassword` solo usa `auth.updateUser` y devuelve su error.

## Acceptance Criteria
- [x] AC1: `updatePassword` no invoca `rpc()`; éxito de `auth.updateUser` → `{ error: null }`.
- [x] AC2: Error de `auth.updateUser` se propaga.

## Test de regresión
`src/app/core/facades/auth.facade.spec.ts` — casos de `updatePassword`.
