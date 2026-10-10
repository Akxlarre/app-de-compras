> id: 0018-cuenta
> refs: `docs/RECORRIDO-UX.md` §5 Perfil (P1–P4, P6) y §6 (paso 5 del orden replanificado).
> status: done (2026-10-10: el dueño quitó D1 y D6 —no se publica en Google Play— y con D1 caen
> D2 y D3; quedan D4, D5 y D7)
> created: 2026-10-10
> closed: 2026-10-10

## Problema
1. **No se puede cambiar el propio nombre** (P1). Quien se registró sin nombre queda como la parte del
   correo ("test3") en Perfil, en los miembros de la familia y en "Familia de …".
2. **No se puede cambiar la contraseña estando dentro** (P6); solo "¿Olvidaste tu contraseña?".
3. **El Perfil ocupa media pantalla en el encabezado** (P2), "Unirme a otra familia" está siempre a
   la vista aunque se usa una vez (P3) y "Buscar actualizaciones" no dice qué versión tienes (P4).

## Contexto
- El nombre vive en dos lugares: `user_metadata.display_name` (lo que lee la sesión, `AuthFacade`)
  y `public.profiles.display_name` (lo que usan `shop.get_family_members` y el nombre por defecto de
  la familia). Hay que cambiar los dos. La RLS `profiles_update_own_safe` deja actualizar la fila
  propia sin tocar el rol.
- La cuenta es compartida con Entrenamiento (ADR-001): el nombre y la contraseña nuevos valen también
  allá. Se dice en el texto de ayuda.

## Decisiones (confirmadas)
- **D4. Nombre editable** en Perfil (1 a 40 caracteres): cambia el nombre de Perfil, de los miembros
  de la familia y el que ven los demás.
- **D5. Cambiar contraseña** en Perfil: la actual y la nueva dos veces (mínimo 6). Si la actual está
  mal o las nuevas no coinciden, no cambia nada.
- **D7. Perfil compacto.** Encabezado en una fila (avatar chico, nombre, correo y "Editar"), "¿Te
  invitaron a otra familia?" plegado, y la versión de la app junto a "Buscar actualizaciones".

## Fuera de alcance
- Borrar la cuenta (no se publica en Google Play), invitar con enlace o mensaje, salir de la familia,
  pasar el rol de dueño, preferencias, foto de perfil, cambiar el correo.

## Criterios de aceptación
- [x] AC1. "Editar" el nombre (1–40) lo cambia en Perfil y en los miembros de la familia (lo que ven
  los demás); vacío o más largo avisa y no cambia nada.
- [x] AC2. Cambiar contraseña pide la actual y la nueva dos veces; si la actual está mal, si las
  nuevas no coinciden o si es corta, avisa y no cambia; si todo está bien, avisa y la nueva sirve
  para entrar.
- [x] AC3. El encabezado del Perfil ocupa una fila (no más de ~100 px).
- [x] AC4. "Unirme a otra familia" está plegado bajo "¿Te invitaron a otra familia?" y se abre al
  tocarlo.
- [x] AC5. En la app instalada, junto a "Buscar actualizaciones" se ve la versión ("Versión 1.0.7"); en la
  web no se muestra (el build web no tiene versión: `package.json` dice 0.0.0).
- [x] AC6. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [x] AC7. Verificado en staging a 375×667 con una cuenta de prueba creada para esto: cambiar el
  nombre (se ve en la familia), cambiar la contraseña y volver a entrar con la nueva.

## Verificación en staging (2026-10-10)
Cuenta nueva `cuenta0018x89276@test.com` (no `test3` ni `test5`), 375×667, capturas en el
scratchpad (`ux-0018/`).
- **AC3:** el encabezado mide 76 px y la familia empieza en y=149 (antes ≈350).
- **AC4:** "¿Te invitaron a otra familia?" parte plegado; al tocarlo aparece el campo del código.
- **AC5:** en la web no se muestra la versión (no hay versión instalada); en Android sale de
  `App.getInfo()` (test de facade y servicio).
- **AC2:** "no coinciden" → "Las contraseñas nuevas no coinciden."; actual equivocada → "La contraseña
  actual no es correcta."; bien → "Contraseña cambiada". Después de salir, la vieja no entra y la
  nueva sí.
- **AC1 — bloqueado por la BD:** guardar el nombre dio HTTP 500 `42P17 infinite recursion detected in
  policy for relation "profiles"`. La policy `profiles_update_own_safe` (baseline compartida)
  consulta `profiles` dentro de su WITH CHECK: nadie puede actualizar su perfil. La app avisó "No se
  cambió el nombre" y no cambió nada (como corresponde). Arreglo: RPC
  `public.set_my_display_name` en plataforma-db #19 (pgTAP 7/7); la app ya la usa.
- **AC1 tras el merge del #19** (deploy a staging en verde): nombre vacío → "No se cambió el nombre ·
  Escribe un nombre de 1 a 40 caracteres."; "Benja Prueba" → "Nombre actualizado". Se ve en Perfil,
  sigue después de recargar y en los miembros de la familia ("BP Benja Prueba · Tú · Dueño"). Sin
  errores HTTP.
