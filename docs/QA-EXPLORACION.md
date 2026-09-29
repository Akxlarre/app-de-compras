# Exploración de usabilidad (QA manual)

Recorrido de la app contra **staging** a 375×667 (celular), cuenta nueva sin compras previas.
Cada hallazgo tiene severidad, cómo reproducirlo y la causa cuando se encontró en el código.

Severidad: **Alta** = bloquea una acción o deja datos incorrectos · **Media** = confunde o se
ve mal en un flujo frecuente · **Baja** = pulido.

## Ronda 1 — 2026-09-29 (Mi Lista, buscador, cierre, Historial, Perfil)

### Reportados por el dueño (reproducidos)

| # | Sev. | Hallazgo | Reproducción | Causa |
|---|---|---|---|---|
| Q1 | Alta | "Cerrar sesión" queda debajo de la barra de tabs y no se puede tocar. | Perfil → bajar al final. El botón queda en y≈729–780 y la barra en 724–796. | `profile.page.ts` no reserva espacio para la barra flotante (las demás páginas usan `pb-32`). `--chrome-bottom` existe en `tabs-layout.component.ts:54` pero nadie la usa. |
| Q2 | Alta | Se ofrece "Repetir última compra · 0 items". | Lista con productos → Finalizar sin marcar nada → Ahora no → Descartarlos. | Tres fallas encadenadas: (a) se puede cerrar una compra con 0 marcados; (b) "Descartarlos" deja la compra vacía en el Historial; (c) `findLastCompleted` no filtra compras sin ítems. |
| Q3 | Media | El check se anima como 3 veces o con lag. | Marcar cualquier producto. | Bug de timing en el FLIP de `GsapAnimationsService.animateBentoLayoutChange`: mide la posición nueva dos `requestAnimationFrame` después del cambio, cuando el navegador ya la pintó. Medido por frame: 0–13 ms el ítem ya está abajo con el check → 18 ms salta a su posición vieja → 700 ms deslizándose. Se suman las transiciones CSS de fondo, opacidad y sombra del ítem. |
| Q4 | Media | El selector de cantidad debería estar solo en la lista, no en el buscador. | Abrir `+` con un producto ya en la lista. | Además, en el buscador `−` con cantidad 1 **borra el producto de la lista** sin avisar (`product-search.component.ts:310`); en la lista el mismo `−` se detiene en 1. |
| Q5 | Baja | El login tarda y el cambio a la app es brusco. | Iniciar sesión. | Sin revisar todavía. |

### Encontrados en el recorrido

| # | Sev. | Hallazgo | Dónde |
|---|---|---|---|
| Q6 | Alta | La compra vacía cuenta en el mes ("1 compra · 1 estimada") y pide agregarle boleta a algo de $0. | Historial |
| Q7 | Media | Cerrar con todo pendiente dice "Quedan 2 pendientes sin comprar" en vez de avisar que no se marcó nada. | Finalizar |
| Q8 | Media | El `+` flotante tapa el botón `+` de cantidad del último producto visible. | Mi Lista |
| Q9 | Media | "Crear y añadir" cierra el buscador: para armar una lista de N productos nuevos hay que abrirlo N veces. Elegir uno existente, en cambio, no lo cierra. | Buscador |
| Q10 | Media | Catálogo tampoco reserva espacio para la barra (`p-4` sin `pb-32`): con muchos productos, los últimos quedan tapados. | Catálogo |
| Q11 | Media | El buscador no indica que un producto ya está en la lista; solo cambia el `+` por un stepper. | Buscador |
| Q12 | Baja | "Crear Lista" es la única acción de la pantalla y se ve como botón secundario apagado. | Mi Lista sin lista |
| Q13 | Baja | El texto muestra backticks literales (`` `+` ``) y ofrece "usa un atajo rápido" aunque no haya ninguno. | Mi Lista vacía (`active-list.page.html:108`) |
| Q14 | Baja | La lista se crea con el nombre fijo "Compra de la Semana", sin preguntar. | Crear lista |
| Q15 | Baja | "Guardar Plantilla" se parte en dos líneas junto al título. | Mi Lista |
| Q16 | Baja | El título de la página está corrido a la derecha respecto de la etiqueta "SHOPPING". | Mi Lista, Historial, Catálogo |
| Q17 | Baja | "Tus esenciales" no muestra un producto recién creado hasta la siguiente apertura del buscador (se cargan al abrir y no se refrescan al crear). | Buscador |
| Q18 | Baja | En Historial ninguna pestaña de la barra aparece activa. | Historial |
| Q19 | Baja | Al desmarcar, el producto no vuelve a su lugar original (el orden depende de lo que devuelve el servidor). | Mi Lista |
| Q20 | Baja | El `+` flotante no tiene nombre accesible (un lector de pantalla dice solo "botón"). | Mi Lista |
| Q21 | Baja | El campo de precio del Catálogo es un "$" sin etiqueta. | Catálogo |
| Q22 | Baja | Boletas sin lista activa muestra "Compra sin lista" dos veces (título y subtítulo). | Boletas |

## Ronda 2 — 2026-09-29 (doble toque, cierre sin boleta, Historial, plantillas)

| # | Sev. | Hallazgo | Dónde / causa |
|---|---|---|---|
| Q23 | Alta | Doble toque en `+` de un producto del buscador lo agrega **dos veces como filas separadas** (Leche ×1 y Leche ×1). | `ShoppingListFacade.addItem`: el "¿ya está en la lista?" mira el estado local, y el alta no es optimista (espera al servidor + `refreshSilently`), así que el segundo toque no ve el primero. |
| Q24 | Media | Doble toque en "Lista vacía" / "Crear Lista" no tiene protección en el cliente; puede crear dos listas activas (no verificable sin acceso a la BD; `findLatestActive` mostraría solo la más nueva y la otra quedaría huérfana). | `active-list.page.ts:173`. Confirmar si la BD tiene un índice único de lista activa por familia (plataforma-db). |
| Q25 | Media | No se puede borrar ni editar una compra del Historial: la compra vacía de Q2 queda para siempre sumando al mes. | Historial |
| Q26 | Media | Todas las compras se llaman "Compra de la Semana": dos del mismo día no se distinguen en el Historial. | Historial (ver Q14) |
| Q27 | Media | Borrar un producto de la lista solo se puede deslizando: no hay pista visual y no se puede deshacer. | Mi Lista |
| Q28 | Media | Las plantillas no se pueden borrar ni renombrar, y solo se ofrecen con la lista vacía (no se puede sumar una plantilla a una lista en curso). | Plantillas |
| Q29 | Media | "Cerrar sin boleta" vuelve a preguntar si pasar los pendientes (ya se respondió en el diálogo anterior) y el botón "Cerrar compra" aparece tapado por la barra de tabs al entrar. | Cerrar sin boleta |
| Q30 | Baja | Guardar plantilla sin nombre cierra el diálogo sin guardar ni avisar; con nombre tampoco confirma. El campo no toma el foco solo. | `active-list.page.ts:162` |
| Q31 | Baja | Precios con formato distinto en la misma pantalla: "$1290" en el ítem y "$1.290" en el costo estimado. | Mi Lista (`active-list.page.html:170`) |
| Q32 | Baja | Si el total pagado no calza con la suma de los precios, no se muestra la diferencia; el total se escribe sin formato de moneda. El `$` va a la derecha del monto. | Cerrar sin boleta |
| Q33 | Baja | "Preferencias" no hace nada ("disponible próximamente"). | Perfil |
| Q34 | Baja | Durante el cierre de compra sigue visible la barra de tabs, que invita a salir a mitad del flujo. | Cerrar sin boleta |

Verificado sin problemas: doble toque en "Cerrar compra" (el botón se desactiva), traspaso de
pendientes a la lista nueva, detalle de compra en el Historial, "Agregar boleta" / "Ingresar
total" según corresponda. Modo claro: no aplica, la app es solo oscura (`index.html` fija
`data-mode="dark"`).

## Ronda 3 — 2026-09-29 (familia con dos cuentas: test1 dueño, test2 invitado)

| # | Sev. | Hallazgo | Dónde / causa |
|---|---|---|---|
| Q35 | Alta | Si dos miembros agregan el mismo producto casi a la vez, quedan **dos filas** del producto y el costo estimado se duplica. Las filas duplicadas se traspasan a la lista siguiente y nunca se juntan. | Misma causa que Q23, pero entre usuarios: la corrección tiene que estar en la BD (único `list_id + product_id` y alta tipo upsert que sume cantidad), no solo en el cliente. |
| Q36 | Alta | A un miembro recién quitado de la familia la app le sigue mostrando la lista, y lo que marca **se pierde sin error**: en su pantalla queda marcado, pero en la BD no cambia nada. | RLS bloquea el UPDATE, que afecta 0 filas y no devuelve error; el cliente no se entera de que ya no es miembro hasta recargar. |
| Q37 | Media | Dos miembros tocan `+` de cantidad a la vez: quedó 2 en vez de 3 (se pierde una actualización). | `updateItemQuantity` manda la cantidad absoluta; debería ser un incremento en la BD (RPC). |
| Q38 | Media | Al quitar a alguien de la familia, esa persona no recibe ningún aviso: tras recargar aparece en una familia nueva, vacía, sin explicación. | Perfil / Mi Lista del quitado |
| Q39 | Media | El buscador a veces abre con "Aún no tienes productos guardados" aunque la familia tenga productos; al reabrirlo aparecen. No hay estado de carga, así que mientras cargan se ve el vacío. | `product-search.component.ts` (`onShow` → `loadEssentials`) |
| Q40 | Baja | Todas las familias se llaman "Mi Familia" por defecto: el diálogo de unirse dice "¿Unirte a «Mi Familia»? … eres el único miembro de «Mi Familia»". | Unirse a familia |
| Q41 | Baja | El botón `×` para quitar a un miembro no tiene nombre accesible. | Perfil |
| Q42 | Baja | Todos los avatares muestran "TE" (iniciales del correo `test…`); con nombres parecidos no se distinguen. | Perfil |

Verificado sin problemas: código inexistente ("No hay ninguna familia con ese código"), el propio
código ("Ya estás en esa familia"), código en minúsculas y sin guion, advertencia antes de dejar
una familia en la que eres el único miembro, contador de miembros en vivo para el dueño,
producto agregado por otro miembro aparece sin recargar, "marcado por test1" visible para el
otro, cierre de compra por un miembro traslada al otro a la lista nueva, confirmación al quitar
un miembro con cambio de código.

### Pendiente de recorrer

- Cierre con boleta (OCR): necesita una foto de boleta real.
- Textos largos, red lenta o sin red.
- Registro, recuperar contraseña y cambio de contraseña.
