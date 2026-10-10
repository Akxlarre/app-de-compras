> id: 0018-cuenta
> refs: `docs/RECORRIDO-UX.md` §5 Perfil (P1–P9) y §6 (paso 5 del orden replanificado);
> `docs/adr/ADR-001-base-de-datos-compartida.md` (la cuenta es la misma para Compras y Entrenamiento).
> status: draft — falta que el dueño confirme D1–D7
> created: 2026-10-10

## Problema
Antes de publicar en Google Play faltan funciones básicas de cuenta, y una es obligatoria:

1. **No se puede borrar la cuenta desde la app** (P5). Google Play lo exige a toda app que permite
   crear una cuenta; sin esto la publicación puede ser rechazada.
2. **No se puede cambiar el propio nombre** (P1). Quien se registró sin nombre queda como la parte del
   correo ("test3") en los avatares, en "marcado por" y en "Familia de …".
3. **No se puede cambiar la contraseña estando dentro** (P6); solo "¿Olvidaste tu contraseña?".
4. **Invitar es difícil** (P7): hay que dictar o copiar un código de 8 caracteres.
5. **El Perfil ocupa media pantalla en el encabezado** (P2), "Unirme a otra familia" está siempre a
   la vista aunque se usa una vez (P3) y "Buscar actualizaciones" no dice qué versión tienes (P4).

## Contexto que cambia las decisiones
- **La cuenta es compartida.** Compras y Entrenamiento usan la misma base y el mismo login
  (ADR-001). Borrar la cuenta borra también los datos de Entrenamiento (`ON DELETE CASCADE` desde
  `auth.users`).
- **Al borrar el usuario, su fila de `family_members` se va sola** (FK a `profiles` en cascada), pero
  la familia queda: si era el único miembro, la familia y todo lo suyo (listas, catálogo, compras,
  boletas, fotos) quedaría huérfano; si era el dueño y hay otros, nadie podría quitar miembros.
- **No hay un dominio web** para la app (es un APK de Capacitor): un enlace que abra la app directo
  (Android App Links) necesita publicar `assetlinks.json` en un dominio propio.

## Decisiones (el dueño debe confirmar o cambiar)
- **D1. "Borrar mi cuenta" borra la cuenta completa**, también la de Entrenamiento, y lo dice antes
  de confirmar ("También se borran tus rutinas y entrenamientos"). Es lo que pide Google Play.
  *Alternativa:* borrar solo los datos de Compras y dejar la cuenta (no cumple con Play si el login
  es el mismo).
- **D2. La familia al borrar la cuenta.** Si eras el único miembro, se borra la familia con todo
  (listas, catálogo, compras, boletas y sus fotos). Si hay otros, la familia queda con ellos; si
  eras el dueño, pasa a serlo el miembro más antiguo. Lo que marcaste queda sin nombre.
- **D3. Confirmar con la contraseña.** Borrar pide escribir la contraseña (no un "Sí" que se toca
  sin pensar). Después cierra la sesión y vuelve al login con "Tu cuenta fue borrada".
- **D4. Nombre editable** en Perfil (1 a 40 caracteres). Se ve en los avatares, en "marcado por" y
  en el nombre por defecto de la familia.
- **D5. Cambiar contraseña** en Perfil: la actual y la nueva (dos veces, mínimo 6). Si la actual está
  mal, no cambia nada.
- **D6. Invitar sin enlace por ahora.** "Invitar" comparte un mensaje listo para WhatsApp ("Únete a
  mi familia en App de Compras: Perfil → Unirme a otra familia → código ABCD-1234"), y "Unirme"
  acepta pegar el mensaje completo (saca el código solo). El enlace que abre la app queda para
  cuando haya un dominio (spec aparte). *Si ya tienes un dominio, dímelo y lo incluyo.*
- **D7. Perfil compacto.** Encabezado en una fila (avatar chico, nombre, correo y "Editar"),
  "¿Te invitaron a otra familia?" plegado, y la versión de la app junto a "Buscar actualizaciones"
  ("Versión 1.0.7 · Estás al día").

## Fuera de alcance
- Salir de la familia y pasar el rol de dueño a mano (P8): solo el traspaso automático de D2.
- Preferencias (P9), foto de perfil, cambiar el correo, iniciar sesión con Google.
- Enlace de invitación que abre la app (necesita dominio; ver D6).

## Criterios de aceptación
**Borrar cuenta (D1–D3)**
- [ ] AC1. Perfil → "Borrar mi cuenta" explica qué se borra (Compras y Entrenamiento; la familia si
  eras el único miembro) y pide la contraseña. Con la contraseña equivocada no borra nada.
- [ ] AC2. Siendo el único miembro, después de borrar no queda nada de la familia: ni listas,
  catálogo, compras, boletas ni sus fotos en el bucket `receipts`.
- [ ] AC3. Con otros miembros, la familia y sus datos siguen; si el que se fue era el dueño, el
  miembro más antiguo pasa a ser dueño y puede quitar miembros.
- [ ] AC4. Después de borrar: no se puede iniciar sesión con ese correo, la sesión se cierra y el
  login dice "Tu cuenta fue borrada".

**Nombre y contraseña (D4, D5)**
- [ ] AC5. Editar el nombre (1–40) lo cambia en Perfil, en los avatares de la familia y en "marcado
  por" de Mi Lista.
- [ ] AC6. Cambiar contraseña pide la actual y la nueva dos veces; si la actual está mal o las nuevas
  no coinciden, avisa y no cambia; si todo está bien, la nueva sirve para entrar.

**Invitar (D6)**
- [ ] AC7. "Invitar" comparte el mensaje con el código (o lo copia si el teléfono no puede compartir).
- [ ] AC8. "Unirme" acepta el código solo o el mensaje completo pegado.

**Perfil (D7)**
- [ ] AC9. El encabezado ocupa una fila; "¿Te invitaron a otra familia?" está plegado; se ve la
  versión instalada.

**General**
- [ ] AC10. Migración en `plataforma-db` con pgTAP (borrar siendo único miembro y siendo dueño con
  otros; un usuario no puede preparar el borrado de otro). Edge Function `delete-account` con
  tests de su lógica.
- [ ] AC11. `npm run test:ci`, `npm run lint:arch` y `ng build` pasan, con tests de cada decisión.
- [ ] AC12. Verificado en staging a 375×667 con cuentas de prueba creadas para esto (no `test3` ni
  `test5`): borrar solo, borrar siendo dueño con otro miembro, cambiar nombre y contraseña, invitar
  y unirse pegando el mensaje.
