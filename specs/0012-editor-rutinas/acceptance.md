# Acceptance — 0012-editor-rutinas

> verificado: 2026-09-19, navegador a 375×812 (modo md), con la sesión
> del usuario. "Nueva Rutina" con un borrador de dos ejercicios cargado
> **solo en memoria**; nunca se tocó "Guardar".

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | 0 objetivos bajo 44px (eran 36). La vista declara `.tier-trabajo`. Borrar serie, subir, bajar, quitar y arrastrar a 44×44; pastillas de descanso 44 (medían 35×18); tipo de serie 139×44; reps, "Añadir Serie", "Añadir" y "Guardar" a 44 de alto |
| AC-02 | ✅ | 0 textos bajo 13px (eran 17). Ningún elemento de la tabla desborda: "SERIE" en una línea, "Calentamiento (W)" en una línea (139px), "OBJETIVO REPS" ocupa también la columna de borrar. El nombre largo ("Press de banca inclinado con mancuernas") va en 2 líneas a lo ancho de la tarjeta |
| AC-03 | ✅ | Campos: nombre 18px, notas 16px, reps 16px (medían 16.8, 14 y 13.6) |
| AC-04 | ✅ | "Añadir": ember con tinta (`#ff6a1a` / `#0a0608`), sin sombra. Descanso elegido: `--color-primary-muted` y borde ember. Tipos de serie neutros; número de ejercicio en `--font-data` gris. Ningún azul, violeta, amarillo ni verde de éxito en la vista |
| AC-05 | ✅ | `rgba(`, hex y `style="`: 0 en el archivo (tenía 46 colores). "Sin ejercicios en la rutina" se muestra con `app-empty-state` y el mismo texto |
| AC-06 | ✅ | `npm run test:ci`: 128 pasan. `ng build`: sin avisos |

Recorrido con clics reales: tipo de la serie 2 de Normal a Calentamiento,
descanso 1.5m → 2m (120 s), "Mover abajo" en el primer ejercicio (el
orden se invierte) y "+ Añadir Serie" en el segundo (4 → 5 series).

**Corregido al medir** (anotado en el plan): la primera versión dejaba
el nombre del ejercicio en cuatro líneas y "OBJETIVO REPS" desbordando
su columna; las notas, a 16px, cortaban el ejemplo.

**Sin verificar:** el modo `isInline` (desde el creador de plan) y
"Editar Rutina" con una rutina real; comparten plantilla y estilos.
