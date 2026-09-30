> id: 0011-integridad
> refs: `docs/QA-EXPLORACION.md` (Q23, Q24, Q35, Q36, Q37, Q38). Reevaluación y decisiones del
> dueño, conversación 2026-09-29.
> status: approved
> created: 2026-09-29

## Problema
Las reglas de la lista viven solo en el cliente, y el cliente trabaja con un estado que puede estar
viejo. La base de datos no protege nada:

1. **Productos duplicados (Q23, Q35).** Doble toque en `+`, o dos miembros agregando el mismo
   producto a la vez, dejan dos filas del mismo producto en la lista. El costo estimado se duplica y
   las filas se traspasan juntas a la lista siguiente sin juntarse nunca. `addItem` decide "¿ya
   está?" mirando el estado local y el alta no es optimista.
2. **Cantidades pisadas (Q37).** Dos miembros tocan `+` a la vez y la cantidad sube 1, no 2:
   `updateItemQuantity` manda el valor absoluto.
3. **Cambios que se pierden sin error (Q36).** Un miembro quitado de la familia sigue viendo la
   lista y lo que marca se ve marcado, pero RLS bloquea el UPDATE: afecta 0 filas, Supabase no
   devuelve error y la app no se entera. Lo mismo le pasaría a cualquier mutación sin permiso.
4. **Sin aviso al quitado (Q38).** Al recargar aparece en una familia nueva y vacía sin explicación.
5. **Varias listas activas (Q24).** Nada impide dos listas `active` en la misma familia (doble toque
   en "Crear Lista"); `findLatestActive` muestra la más nueva y la otra queda huérfana.
6. **Sin conexión.** En el súper la señal es mala y la app no lo maneja: un marcado sin red falla y
   se deshace, o se pierde. Contradice el principio "cero fricción en el pasillo".

## Decisiones (del dueño)
- **Una sola lista activa por familia**, garantizada por la base de datos.
- **La cola de cambios sin conexión entra en esta spec.**
- La verificación manual sigue en **staging**.

## Solución
- **BD (plataforma-db, migración nueva):**
  - Índice único `list_items (list_id, product_id)`. Antes, la migración junta los duplicados que ya
    existan: suma cantidades y queda marcado si alguna fila lo estaba.
  - Índice único parcial de una lista `active` por familia. Antes, las listas activas sobrantes
    pasan sus ítems a la más nueva y se archivan.
  - RPC `add_list_item(list_id, product_id, quantity)`: si el producto ya está, suma la cantidad.
    Devuelve la fila.
  - RPC `change_item_quantity(item_id, delta)`: suma en la BD con mínimo 1. Devuelve la cantidad
    final.
  - Crear lista activa: si ya hay una, devuelve esa en vez de fallar (doble toque inocuo).
  - `complete_list` y el traspaso de pendientes suman cantidades en lugar de duplicar filas.
- **Mutaciones que fallan fuerte:** los repositories verifican las filas afectadas. Si un UPDATE o
  DELETE afecta 0 filas, lanzan un error tipado (`not_allowed` / `not_found`); las RPCs lanzan el
  suyo. La UI revierte el cambio optimista y avisa.
- **Ya no eres miembro:** ante `not_allowed` sobre la familia, o si Realtime informa que te
  quitaron, la app recarga la familia y muestra "Ya no eres parte de «X»" una vez. Después queda en
  su propia familia.
- **Cola sin conexión (solo marcar/desmarcar y cantidades):**
  - Se detecta la red con `navigator.onLine` y los eventos `online`/`offline`, más el fallo de red
    de una petición. Mi Lista muestra un aviso discreto "Sin conexión: tus cambios se guardan y se
    envían al volver".
  - Sin red, marcar y cambiar la cantidad se aplican en pantalla y se guardan en una cola
    persistida, que sobrevive a cerrar la app. Las cantidades se guardan como incremento y los
    marcados como valor final (idempotentes).
  - Al volver la red, la cola se envía en orden y se refresca la lista. Si un cambio es rechazado
    (el ítem ya no existe, ya no eres miembro, la lista se cerró), se descarta y se avisa una vez
    con cuántos no se pudieron guardar.
  - Sin red se deshabilitan, con explicación, las acciones que no entran en la cola: agregar y
    crear productos, borrar ítems, finalizar, crear lista y plantillas.

## Fuera de alcance
- Agregar productos, borrar o finalizar sin conexión (quedan deshabilitados; spec futura si hace
  falta).
- Qué es una compra, sus nombres y borrar compras del Historial: spec 0012.
- Los casos de UI reportados por el dueño (barra que tapa Cerrar sesión, animación del check,
  cantidad en el buscador…) y el resto de hallazgos de UI: spec 0013.
- Sugerencias de reposición visibles: spec 0014.
- Supabase local y e2e automáticos de estos flujos.

## Acceptance Criteria
- [ ] AC1: Doble toque en `+` de un producto, o dos miembros agregándolo a la vez, dejan **una**
  fila con la cantidad sumada. Verificable en staging con dos cuentas y en tests del facade/repo.
- [ ] AC2: Dos miembros tocan `+` de cantidad a la vez sobre el mismo ítem en 1 → queda en 3.
- [ ] AC3: La BD rechaza una segunda lista activa en la misma familia; doble toque en "Crear Lista"
  deja una sola lista y ningún error visible.
- [ ] AC4: Los datos existentes no rompen la migración: duplicados de `list_items` y listas activas
  sobrantes se juntan (probado en staging, que hoy tiene duplicados de la cuenta `test1`).
- [x] AC5: Una mutación que afecta 0 filas lanza error; la UI revierte el cambio y avisa. Test por
  cada repository de lista.
- [ ] AC6: Un miembro quitado que intenta marcar ve el aviso "Ya no eres parte de «X»" y su pantalla
  pasa a su propia familia sin recargar a mano. Nada queda marcado en la lista de la familia.
- [ ] AC7: Sin red, marcar y cambiar la cantidad se ven al instante, aparece el aviso de "sin
  conexión" y, al volver la red, los cambios llegan a la BD y el otro miembro los ve.
- [ ] AC8: La cola sobrevive a cerrar y reabrir la app sin red.
- [ ] AC9: Un cambio de la cola rechazado al sincronizar (ítem borrado por otro miembro) se descarta
  y se avisa una vez; los demás se aplican.
- [x] AC10: Sin red, agregar, borrar, finalizar y crear lista están deshabilitados con explicación.
- [ ] AC11: `test:ci`, `lint:arch` (0 errores) y `ng build` en verde; índices (DATABASE,
  REPOSITORIES, FACADES) actualizados; PR de plataforma-db aplicado en staging.

> **Estado (2026-09-30):** código y tests listos para AC1–AC10 (BD: pgTAP + carrera real en
> Postgres local; app: tests de repos, facade y página). AC1–AC4 y AC6–AC9 quedan abiertos hasta
> probarlos en staging, que requiere aplicar plataforma-db#13. AC11: todo en verde salvo ese paso.
