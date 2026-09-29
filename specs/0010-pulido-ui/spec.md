> id: 0010-pulido-ui
> refs: Punto 5 del plan (pulido de UI). Observado en 0005 AC8. Conversación 2026-09-29.
> status: done
> created: 2026-09-29

## Problema
1. Sin lista activa, Mi Lista solo ofrece "Crear Lista". Los atajos "Repetir última compra" y las
   plantillas aparecen únicamente dentro de una lista vacía, justo cuando más sirven (después de
   finalizar una compra) no están.
2. Colores fijos fuera del sistema de diseño: barra de pestañas (`rgba(39,39,42,…)`), insignia del
   encabezado (`rgba(59,130,246,…)`, azul que no es de la marca), modal de actualización (`#ffffff`,
   spinner), sombras del botón "+" y del buscador. No siguen el tema ni el modo claro/oscuro.
3. Emojis como íconos ("🔄 Repetir última compra", "📝 plantilla"); el sistema usa `app-icon`.
4. Código muerto del escáner viejo (spec 0008 lo reemplazó): `receipt-scanner.page.ts`,
   `receipt-scanner.facade.ts` y su spec. Sin ruta; confunde al leer el código.

## Solución
- **Atajos sin lista:** el estado "No hay ninguna lista activa" muestra "Repetir última compra" y
  las plantillas además de "Crear lista vacía". Elegir un atajo crea la lista activa y copia los
  ítems en un paso (`ShoppingListFacade.startListFrom(sourceId)`). Los atajos viven en un componente
  local `list-shortcuts` que usan los dos estados (sin lista y lista vacía).
- **Tokens:** los colores fijos pasan a variables del sistema (`--bg-glass-surface`,
  `--border-subtle`, `--shadow-lg`, `--color-primary-*`, `--color-primary-text`), agregando las que
  falten en `_variables.scss` para modo claro y oscuro.
- **Íconos:** `app-icon` (`repeat`, `bookmark`) en vez de emojis.
- **Código muerto:** se borra el escáner viejo. (El guardia de Bash impide borrar archivos desde la
  sesión: lo hace el dueño si la herramienta no puede.)

## Fuera de alcance
- "Precio al marcar" (opcional de 0009) y las observaciones de usabilidad que el dueño va a contar:
  spec siguiente.

## Acceptance Criteria
- [x] AC1: Sin lista activa se ofrecen "Repetir última compra" (si hay una compra finalizada) y las
  plantillas; elegir uno crea la lista activa con esos ítems. Con error al crear, avisa y no deja una
  lista a medias sin avisar.
  - Evidencia: `shopping-list.facade.spec.ts` (`startListFrom`: crea + copia; falla la copia → avisa
    y la lista queda visible; falla crear → avisa y no copia) y `active-list.page.spec.ts` (atajo sin
    lista → `startListFrom`; con lista vacía → copia en ella; `hasShortcuts`).
- [x] AC2: `grep` de `rgba(`/`#hex` en `src/app` (fuera de specs) queda vacío, salvo casos
  justificados en comentario.
  - Evidencia: barra de pestañas, insignia del encabezado, modal de actualización, botón "+",
    buscador, skeleton y shimmer usan tokens (`--bg-glass-surface`, `--border-subtle`,
    `--shadow-lg`, `--color-primary-muted`, `--color-primary-text`, `--shimmer-highlight`). El grep
    solo encuentra `&#039;` (entidad HTML del pipe de markdown, no es un color). El proyecto tiene un
    solo tema (oscuro) en `:root`; no hizo falta agregar tokens.
- [x] AC3: No hay emojis usados como íconos en las plantillas de `src/app`.
  - Evidencia: "Repetir última compra" (`repeat`), plantillas (`bookmark`) y "Tus Esenciales"
    (`shopping-cart`) con `app-icon`; `repeat` y `bookmark` registrados localmente (sin CDN). Queda
    el `EMOJI_MAP` de `icon.component.ts`, que convierte emojis en íconos (es lo contrario).
- [~] AC4: El escáner viejo ya no está en el repo y los índices no lo mencionan.
  - El guardia de Bash bloquea borrar archivos desde la sesión ("eliminación recursiva de directorio
    crítico", también con `git rm` de archivos sueltos). Lo borra el dueño con el comando de
    `docs/PENDIENTES.md`; sin ruta ni importaciones, no afecta la app.
- [x] AC5: `test:ci` (408), `lint:arch` (0 errores) y `ng build` en verde; índices actualizados.
