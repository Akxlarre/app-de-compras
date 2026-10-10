> spec: 0018-cuenta
> status: approved
> created: 2026-10-10

# Plan
Sin cambios de BD ni Edge Functions. Antes de empezar: `spec.md`, `docs/RECORRIDO-UX.md` §5 e
índices (`FACADES.md`, `REPOSITORIES.md`, `COMPONENTS.md`).

## Mapa actual
```
features/profile/profile.page.ts                    encabezado grande (avatar 88 px), familia, "Buscar
                                                    actualizaciones", "Cerrar sesión"
features/profile/family-section/family-section.*    familia, código, miembros, "Unirme" siempre visible
core/facades/auth.facade.ts                         currentUser (name de user_metadata.display_name),
                                                    updatePassword (sin verificar la actual)
core/services/infrastructure/supabase.service.ts    signIn, updatePassword (auth.updateUser)
core/repositories/profiles.repository.ts            findById
core/services/app-update.service.ts                 App.getInfo() (versión en Android)
```

## Tareas (cada una con su test primero)
### T1. Datos — AC1, AC2
- `ProfilesRepository.updateDisplayName(id, name)`: `update({ display_name })` en `profiles`.
- `SupabaseService.updateUserMetadata(data)`: `auth.updateUser({ data })` (solo sesión, como
  `updatePassword`).
- `AuthFacade.rename(input)` → `{ ok }`: valida 1–40; actualiza `user_metadata` y `profiles`;
  actualiza `currentUser` (nombre e iniciales).
- `AuthFacade.changePassword(current, next, repeat)` → `{ ok, error? }`: valida (coinciden, mínimo
  6, distinta de la actual); verifica la actual con `signIn(email, current)`; luego
  `updatePassword(next)`. Errores legibles con `mapAuthError`.

### T2. Versión — AC5
- `AppUpdateFacade.currentVersion` (signal): `App.getInfo()` en nativo; en web, la versión de
  `package.json` (vía `environment.version` o import del json). Test con el servicio falso.

### T3. Perfil — AC1–AC5
- `profile.page`: encabezado en una fila (avatar 48 px, nombre, correo, botón "Editar" → alerta con
  input); sección "Cuenta" con "Cambiar contraseña" (alerta con 3 inputs `password`); "Buscar
  actualizaciones" con la versión debajo.
- `family-section`: "¿Te invitaron a otra familia?" (botón con `aria-expanded`) que muestra el
  formulario de unirse.
- Tests de página: validaciones llaman al facade; plegado.

### T4. Índices, docs y verificación — AC6, AC7
- `/sync-indices`; `docs/RECORRIDO-UX.md`: P1–P4, P6 resueltos; paso 5 hecho (P5, P7 descartados).
- Staging con una cuenta nueva (`cuenta0018`): nombre (se ve en Perfil y en la familia), contraseña
  (salir y entrar con la nueva). Anotar en `spec.md` § Verificación.
