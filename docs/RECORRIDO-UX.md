# Recorrido de experiencia por pestaña

Recorrido en **staging** a 375×667 (celular) con una cuenta nueva (`test5`, sin historial) y una
con uso (`test3`, familia con test4, historial y plantillas). Para cada pestaña: qué hay hoy, qué
falla o confunde, qué falta y qué daría un plus. Prioridad: **P1** = afecta el uso diario,
**P2** = mejora clara, **P3** = plus.

---

## 1. Mi Lista (2026-10-01)

### Qué hay hoy
- Lista activa compartida por la familia, en tiempo real (Realtime), con "quién marcó".
- Agregar con el buscador (bottom sheet): esenciales, búsqueda en el catálogo, "En la lista · N",
  crear producto nuevo sin cerrar.
- Marcar/desmarcar con animación; pendientes arriba, marcados abajo en orden de alta.
- Cantidad con stepper (enteros, mínimo 1).
- Quitar deslizando, con "Deshacer" y pista la primera vez.
- "Te puede faltar": sugerencias aprendidas del historial, `+`, "Agregar todas", "Todavía tengo".
- Plantillas (guardar, agregar a la lista, renombrar, borrar) y "Repetir última compra".
- Vaciar lista; Finalizar (con boleta / sin boleta / "Ahora no"), bloqueado sin marcados.
- Costo estimado con el último precio; contadores Pendientes / En carrito.
- Sin conexión: banner, marcar y cantidades en cola.
- Acceso a Historial (ícono arriba a la derecha).

### Qué falla o confunde
| # | Prio | Hallazgo | Detalle |
|---|---|---|---|
| L1 | P1 | **Se borra lo que escribes después de "Crear y añadir"** | El campo se vacía cuando vuelve el servidor (~1–2 s). Si ya empezaste a escribir el siguiente producto, se pierde. Reproducido con Playwright. Debe vaciarse al tocar (optimista). |
| L2 | P1 | **Caben 2 productos en pantalla** | Título "Mi Lista" + nombre de lista en 2 líneas + costo + acciones + contadores ocupan ~330 px de 667. Cada fila mide 82 px. Es la pantalla que se usa en el supermercado con una mano. |
| L3 | P1 | **Nombres largos se cortan sin forma de leerlos** | "Detergente l…": no hay segunda línea ni detalle del producto. |
| L4 | P2 | **"Est. Costo: $0" engaña** | Productos sin precio suman 0; no se dice cuántos no tienen precio. Mejor "$6.060 · 2 sin precio" o "Sin precios aún". |
| L5 | P2 | **El buscador parpadea** | Cada letra muestra "Buscando en catálogo…" y esconde los resultados anteriores (consulta al servidor desde 2 letras). Con catálogos de familia (decenas o cientos de productos) se puede filtrar en el teléfono al instante. |
| L6 | P2 | **"Ahora no" en Finalizar no se entiende** | Cierra la compra sin precios reales, pero el nombre sugiere "cancelar". Opciones: "Cerrar sin precios" o dejar solo "Con boleta / Sin boleta" + "Cancelar". |
| L7 | P2 | **El `+` flotante tapa el stepper al hacer scroll** | Al terminar el scroll queda bien (0013), pero a mitad tapa el `+` de cantidad de una fila. |
| L8 | P3 | **Dos títulos** | "Mi Lista" (encabezado) y "Lista de compras" (nombre) dicen lo mismo y el nombre no se puede cambiar. |
| L9 | P3 | **Contadores grandes "4 PENDIENTES / 0 EN CARRITO"** | Información útil pero ocupa mucho; una barra de progreso "1 de 4" en una línea hace lo mismo. |

### Qué falta (funcionalidad)
| # | Prio | Falta | Por qué |
|---|---|---|---|
| F1 | P1 | **Editar un ítem desde la lista** (tocar el nombre → detalle: nombre, cantidad, nota, precio) | Hoy tocar la fila solo marca; para cambiar algo hay que ir al Catálogo o borrar y volver a agregar. |
| F2 | P1 | **Nota por ítem** ("sin lactosa", "marca X", "el grande") | Es lo más común en listas compartidas: quien compra no es quien anotó. |
| F3 | P2 | **Unidades** (kg, g, L, paquete) y cantidades decimales | "1 Papas" no dice si es 1 kg o 1 unidad; la boleta trae kg. |
| F4 | P2 | **Agrupar por categoría / pasillo** | `products.category` existe pero no hay forma de asignarla ni de ver la lista por secciones (verduras, lácteos, aseo). Ordena el recorrido en el súper. |
| F5 | P2 | **Precio al marcar** (opcional) | Anotar el precio mientras se compra hace que el cierre "sin boleta" sea casi automático y el costo estimado se acerque al real. Pendiente desde 0009. |
| F6 | P3 | **Quién agregó cada producto** | Ya se muestra quién marcó; saber quién lo pidió ayuda a preguntar ("¿qué detergente?"). |

### Ideas que darían un plus
| # | Idea |
|---|---|
| X1 | **Compartir la lista por WhatsApp** (texto con los pendientes) para alguien que no usa la app. |
| X2 | **Presupuesto de la compra**: fijar un tope y ver "vas en $X de $Y" con el costo estimado. |
| X3 | **Modo supermercado**: pantalla siempre encendida, filas más grandes, solo pendientes. |
| X4 | **Agregar por voz o pegando un texto** ("leche, pan, 2 kg de papas") que se convierte en ítems. |
| X5 | **Aviso a la familia** cuando alguien empieza o termina de comprar ("Ana está en el súper"). |

### Mi recomendación para la próxima spec de Mi Lista (aprobada por el dueño, 2026-10-01)
1. L1 (bug, rápido), L2 + L9 (compactar encabezado y filas), L3, L4.
2. F1 + F2 (detalle del ítem con nota) — es lo que más valor agrega al uso compartido.
3. Después F3/F4/F5 juntos ("lista para el súper": unidades, pasillos, precio al marcar).
