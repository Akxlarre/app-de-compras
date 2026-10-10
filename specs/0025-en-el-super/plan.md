> spec: 0025-en-el-super
> status: done
> created: 2026-10-10

# Plan
BD: `shopping_lists.budget` en plataforma-db #21 (ya aplicada en staging).

## T1. Repositorio y facade — AC2
- `ShoppingListsRepository.setBudget(listId, budget | null)` (solo la lista activa).
- `ShoppingListFacade.setBudget(budget | null)`: optimista con rollback; necesita conexión.

## T2. Util (test primero) — AC2, AC3
- `shopping-list.utils.ts`: `budgetProgress(amount, budget)` → `{ percent (0–100), over }`
  (`over` = cuánto se pasa, o null).
- `parsePrice` (ya existe) lee el monto escrito.

## T3. Servicio — AC1
- `core/services/wake-lock.service.ts`: `keepScreenOn()` / `release()` con `navigator.wakeLock`;
  si no existe o falla, no hace nada.

## T4. Mi Lista — AC1–AC3
- `superMode`, `showCart`; `rows` en modo súper: solo pendientes (pasillos con pendientes) y,
  con "N en el carro" abierto, los marcados al final.
- Letra más grande, se esconden resumen, sugerencias, acciones y selector de vista.
- `listSummary.cartCost` (lo marcado); barra de presupuesto con el estimado o, en modo súper, con
  el carro.
- Acciones: "Modo súper" y "Presupuesto" (alerta con un campo; vacío lo quita).
- `ionViewWillLeave` sale del modo súper.

## T5. Validar y cerrar — AC4–AC6
