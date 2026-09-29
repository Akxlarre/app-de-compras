> id: 0010-pulido-ui
> refs: Punto 5 del plan (pulido de UI). Observado en 0005 AC8. Conversación 2026-09-29.
> status: in-progress
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
- [ ] AC1: Sin lista activa se ofrecen "Repetir última compra" (si hay una compra finalizada) y las
  plantillas; elegir uno crea la lista activa con esos ítems. Con error al crear, avisa y no deja una
  lista a medias sin avisar.
- [ ] AC2: `grep` de `rgba(`/`#hex` en `src/app` (fuera de specs) queda vacío, salvo casos
  justificados en comentario.
- [ ] AC3: No hay emojis usados como íconos en las plantillas de `src/app`.
- [ ] AC4: El escáner viejo ya no está en el repo y los índices no lo mencionan.
- [ ] AC5: `test:ci`, `lint:arch` y `ng build` en verde; índices actualizados.
