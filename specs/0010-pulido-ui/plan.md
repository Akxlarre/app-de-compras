# Plan 0010 — Pulido de UI

## 1. Atajos sin lista activa (AC1)
- `ShoppingListFacade.startListFrom(sourceListId)`: crea la lista activa ("Compra de la Semana") y
  copia los ítems de la fuente; una sola recarga al final. `createList` devuelve el id creado.
- Componente local `features/shopping/active-list/list-shortcuts.component.ts` (dumb):
  `input` lastList + templates, `output` pick(id). Lo usan el estado "sin lista" (→ `startListFrom`)
  y la lista vacía (→ `cloneList`, como hoy).
- Tests: facade (crea + copia; si falla la copia, avisa) y página (qué atajo llama a qué).

## 2. Tokens de color (AC2)
- `_variables.scss`: `--tabbar-bg`, `--tabbar-border`, `--shadow-fab` en claro y oscuro si no
  existen equivalentes; reutilizar `--bg-glass-surface`, `--border-subtle`, `--shadow-lg`,
  `--color-primary-muted`, `--color-primary-text`.
- Reemplazos en tabs-layout, app-header, app-update-modal, active-list (FAB), product-search,
  skeleton-block (fallback).

## 3. Íconos (AC3)
- `repeat` y `bookmark` con `app-icon`.

## 4. Código muerto (AC4)
- Borrar `receipt-scanner.page.ts`, `receipt-scanner.facade.ts(.spec)`; índices sin menciones.

## 5. Verificación
`test:ci`, `lint:arch`, `ng build`, grep de AC2/AC3.
