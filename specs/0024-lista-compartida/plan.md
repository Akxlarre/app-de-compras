> spec: 0024-lista-compartida
> status: done
> created: 2026-10-10

# Plan
BD: `list_items.added_by` en plataforma-db #21 (compartida con 0023 y 0025).

## T1. Util (test primero) — AC2
- `core/utils/share-list.utils.ts`: `pendingListText(items)` con el formato de D2
  (`groupByAisle` + `formatQuantity`).

## T2. Servicio — AC2
- `core/services/share.service.ts`: `openWhatsApp(text)` → abre `https://wa.me/?text=…` (en el
  teléfono, Capacitor lo manda a WhatsApp; en la web, una pestaña nueva). Si no se pudo, copia el
  texto: devuelve `'opened' | 'copied' | 'failed'`.

## T3. Mi Lista — AC1, AC2
- `addedByLabel(item)`: "Pedido por Ana" en pendientes de otros miembros (más de un miembro).
- Detalle del ítem: `ItemDetail.addedBy` ("Lo agregó Ana" / "Lo agregaste tú").
- "Compartir" en las acciones de la lista si hay pendientes; aviso si se copió.

## T4. Validar y cerrar — AC3–AC5
