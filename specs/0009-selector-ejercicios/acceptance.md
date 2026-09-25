# Acceptance — 0009-selector-ejercicios

> verificado: 2026-09-18, navegador a 375×812 (modo md), con la sesión
> del usuario. El selector se abrió desde "Nueva Rutina", que no se
> guardó, y no se eligió ningún ejercicio.

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | Los 19 objetivos de la primera pantalla miden ≥ 44px (antes, 18 debajo). Cerrar 44×44 (era 32), chips 44 de alto (eran 30), info 44×44 (eran 40), borrar búsqueda 44×44 (no tenía tamaño). La zona que elige la fila mide 44 |
| AC-02 | ✅ | Ningún texto visible bajo 13px (antes: subtítulo 12, chips 12.8, contador 11.5). Título: Anton, 28px, peso 400 (era 20px y 800). El campo de búsqueda pasa a 16px, con menos iOS hace zoom al enfocar |
| AC-03 | ✅ | 0 miniaturas. El músculo va primero en la meta, en `--text-secondary`. De paso, el equipo ya no se corta: "Peso Corporal" se leía "Peso ..." |
| AC-04 | ✅ | `rgba(` y hex: 0 en el archivo (eran 45). Fondo del selector y de la lista `#0a0608`. Chip activo: ember con tinta, sin sombra. Foco del buscador: borde ember y `--shadow-focus` (antes, azul). Estado vacío en tokens |
| AC-05 | ✅ | Cada botón de info se anuncia "Detalle de {ejercicio}"; abre el detalle de ese ejercicio con "Seleccionar Ejercicio" |
| AC-06 | ✅ | `npm run test:ci`: 112 tests pasan. `ng build` compila; sus avisos son anteriores y de otros archivos (dos NG8107 y el presupuesto de `workouts.page.ts`, que fix-032 corrige en otra rama) |

Recorrido: filtrar por "Pecho" (84 ejercicios), buscar "zzqxw" (estado
vacío), borrar la búsqueda (vuelven los 84 del filtro) y abrir el
detalle desde info.

**Agregado al hacerlo:** "Borrar búsqueda" como `aria-label` del botón
que limpia el campo, que era solo un ícono. El guardia de arquitectura
lee "Borrar" como acción destructiva y exige `data-llm-action`: se le
puso `limpiar-busqueda`.

**Sin verificar:** el selector abierto desde la sesión activa. Es el
mismo componente, pero elegir una fila ahí agrega el ejercicio a la
sesión real.
