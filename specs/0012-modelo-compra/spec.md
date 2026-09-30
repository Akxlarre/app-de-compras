> id: 0012-modelo-compra
> refs: `docs/QA-EXPLORACION.md` (Q2, Q6, Q7, Q14, Q25, Q26). Decisiones del dueño, conversación
> 2026-09-30.
> status: approved
> created: 2026-09-30

## Problema
"Lista" y "compra" son la misma fila (`shopping_lists`) y la app no separa bien una de otra:

1. **Compras vacías (Q2, Q6, Q7).** Se puede finalizar sin haber marcado nada. Queda una compra de
   $0 en el Historial que suma al mes ("1 compra · 1 estimada"), pide boleta, y aparece como
   "Repetir última compra · 0 items". El diálogo dice "Quedan 2 pendientes" en vez de avisar que no
   se marcó nada.
2. **Todas se llaman igual (Q14, Q26).** Toda lista nace como "Compra de la Semana" (o "Compra
   Inteligente"); dos compras del mismo día no se distinguen en el Historial y no hay cómo
   renombrarlas.
3. **No se pueden borrar (Q25).** Una compra equivocada queda para siempre sumando al gasto del
   mes y a "última compra" de sus productos.

## Decisiones (del dueño)
- **Sin nada marcado no es una compra.** Finalizar se bloquea con 0 marcados y lo explica; para
  tirar la lista hay una acción aparte, "Vaciar lista".
- **Nombre por fecha automática.** La lista activa es "Lista de compras"; la compra cerrada se
  muestra como "Compra del mié 30 sep" mientras no se renombre. Se puede renombrar en el Historial.
- **Borrar compras con confirmación**, incluida su boleta y foto. La última compra de cada producto
  se recalcula con las compras que quedan.

## Solución
- **BD (plataforma-db, migración nueva):**
  - `complete_list` (y por lo tanto `close_list_manual` y `apply_receipt`) rechaza cerrar sin
    marcados: error `nothing_checked`. La lista que recibe pendientes se llama "Lista de compras".
  - `start_active_list` usa "Lista de compras" por defecto.
  - Limpieza: se borran las compras cerradas sin ítems y sin boleta (las de Q2 que ya existen).
  - RPC `delete_purchase(list_id) → image_path`: solo compras cerradas de mi familia; borra la
    compra (ítems y boleta en cascada) y recalcula `products.last_purchased_at` de sus productos con
    las compras que quedan. Devuelve la ruta de la foto para que la app la borre del bucket.
  - RPC `rename_purchase(list_id, name)`: nombre no vacío, máx. 60 caracteres.
- **App:**
  - Nombre visible: función pura `purchaseTitle(list)`: si el nombre es uno de los automáticos
    ("Lista de compras", "Compra de la Semana", "Compra Inteligente", "Compra sin lista"), muestra
    la fecha local ("Compra del mié 30 sep"; con boleta sin lista, "Compra sin lista del …"); si
    no, el nombre que puso el usuario.
  - Mi Lista: Finalizar deshabilitado con 0 marcados y texto "Marca lo que compraste para
    finalizar". Nueva acción "Vaciar lista" (con confirmación) que borra los ítems de la lista
    activa y la deja vacía.
  - Historial: el título usa `purchaseTitle`; en el detalle, "Renombrar" y "Borrar compra"
    (confirmación que dice que también se borra la boleta y deja de contar en el mes).
  - `nothing_checked` de la BD (otra pantalla, otro miembro) se muestra como el mismo aviso.

## Fuera de alcance
- Renombrar la lista activa (el nombre visible de la activa no se usa en el Historial).
- Borrar o renombrar plantillas (Q28), editar ítems de una compra cerrada.
- Casos de UI de la 0013 (barra, FAB, animación, buscador) y sugerencias (0014).

## Acceptance Criteria
- [x] AC1: Con 0 marcados, Finalizar está deshabilitado con explicación; la BD también rechaza
  cerrar (`complete_list`, `close_list_manual`, `apply_receipt`) con `nothing_checked`.
- [x] AC2: "Vaciar lista" con confirmación deja la lista activa sin ítems; no crea nada en el
  Historial.
- [x] AC3: La migración borra las compras cerradas vacías sin boleta; ya no aparecen en el
  Historial, en el gasto del mes ni en "Repetir última compra".
- [x] AC4: Las compras del Historial se ven como "Compra del <día> <fecha>" salvo que se hayan
  renombrado; dos del mismo día se distinguen por hora si hace falta.
- [x] AC5: Renombrar una compra desde el detalle del Historial cambia su nombre (lo ve el otro
  miembro); nombre vacío o de más de 60 caracteres se rechaza con aviso.
- [x] AC6: Borrar una compra (con confirmación) la saca del Historial y del gasto del mes, borra su
  boleta y foto, y recalcula la "última compra" de sus productos.
- [x] AC7: Otra familia no puede borrar ni renombrar mis compras (pgTAP), y no se puede borrar la
  lista activa ni una plantilla con `delete_purchase`.
- [x] AC8: `test:ci`, `lint:arch` (0 errores) y `ng build` en verde; pgTAP en CI de plataforma-db;
  índices (DATABASE, REPOSITORIES, FACADES) actualizados; verificado en staging con test3/test4.

## Verificación (staging, 2026-09-30)
Migración `20260930020000_shop_purchase_model` desplegada (plataforma-db#14, run 36780672073).
- AC1: con 0 marcados `complete_list`, `close_list_manual` y `apply_receipt` → `nothing_checked`
  (API, test3); en la app Finalizar deshabilitado con "Marca lo que compraste para finalizar".
- AC2: "Vaciar lista" + confirmación → 0 ítems, 0 compras nuevas en el Historial.
- AC3: 0 compras cerradas sin ítems ni boleta en la familia de test3.
- AC4: "Compra del mié 30 sep", y "· 21:43" / "· 21:44" con dos del mismo día.
- AC5: vacío y 61 caracteres → `invalid_name` (toast "Nombre no válido"); "Super QA" lo ve test4
  tras unirse a la familia.
- AC6: borrar una compra con boleta y foto desde la app → sin lista, sin boleta, foto 400 en el
  bucket, gasto del mes baja ($8.642 → $4.321) y `last_purchased_at` vuelve a la compra anterior.
  Encontrado y corregido aquí: la confirmación no abría (`ion-alert` con `inputs: undefined`).
- AC7: test4 (otra familia) → `list_not_found` al renombrar y borrar; lista activa →
  `list_not_completed`.
- AC8: 496 tests, `lint:arch` 0 errores, build OK; pgTAP en CI de plataforma-db.
