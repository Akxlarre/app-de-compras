# Spec: Editor de rutinas en Eclipse

> id: 0012-editor-rutinas
> refs: pendientes del rediseño Eclipse. Abre el selector de ejercicios
>   ya migrado (0009).
> status: done
> created: 2026-09-19

## Contexto

"Nueva Rutina" / "Editar Rutina" arma la plantilla que después se
entrena: ejercicios, orden, descanso y series con su tipo y sus
repeticiones objetivo. Es **Tier 2 — Trabajo** (`_tiers.scss`:
"configurar"): objetivos de 44px, color solo para estado.

Medido en navegador antes de tocar nada (2026-09-19, 375×812), con un
borrador de dos ejercicios cargado **solo en memoria** (nada se guarda
hasta "Guardar"):

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 5 — Ergonomía | **36 objetivos bajo 44px**: borrar serie **20×20**, pastillas de descanso **35×18**, arrastrar **23×19**, subir/bajar/quitar **28×28**, tipo de serie **25**, "Añadir Serie" **29**, "Añadir" 30, "Guardar" 32, campo de reps 34 |
| 4 — Legibilidad | **17 textos bajo 13px**: cabecera de la tabla **10.4px** (y "SERIE" se parte en "SERI / E"), descanso **11.5px**, etiquetas de campo **12.5px**, tipos de serie 12px (y "Calentamiento (W)" se parte en dos líneas) |
| 5 — Ergonomía | Campos de reps a **13.6px** y notas a **14px**: iOS hace zoom al tocarlos (lo hace bajo 16px) |
| 3 — Contraste | "Añadir": texto hueso sobre ember, **2.9:1**, reprueba AA |
| 7 — Sistema | Azul de la marca anterior en la sombra de "Añadir", el número de ejercicio y el descanso elegido. **46** hex y `rgba()` escritos a mano |
| 1 — Semántica | Tipos de serie en verde de éxito (normal), amarillo, morado y rojo de error (al fallo) |

## Acceptance Criteria

- **AC-01** — La vista declara `.tier-trabajo` y todo objetivo mide
  ≥ 44px: guardar, añadir, arrastrar, subir, bajar, quitar, descanso,
  tipo de serie, reps, borrar serie y añadir serie.
- **AC-02** — Ningún texto baja de 13px y ninguno se corta a mitad de
  palabra ("SERIE", "Calentamiento (W)").
- **AC-03** — Los campos de texto miden 16px o más: iOS no hace zoom.
- **AC-04** — Color por rol: "Añadir" en ember con tinta (≥ 4.5:1);
  descanso elegido en ember; tipos de serie neutros; número de
  ejercicio neutro; sin azul, violeta ni amarillo.
- **AC-05** — Cero hex y cero `rgba()` escritos a mano en
  `routine-editor.page.ts`. El estado vacío usa `app-empty-state`.
- **AC-06** — `npm run test:ci` pasa y `ng build` compila sin avisos.

## Fuera de alcance

- El texto: solo diseño visual.
- La lógica: tipos de serie, reordenamiento, guardado.
- El modo `isInline` (se abre desde el creador de plan): comparte
  plantilla y estilos, se ve en la página del Plan.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: "Nueva Rutina" con un
borrador en memoria, medir objetivos, tamaños, fuentes y colores;
cambiar un tipo de serie, elegir un descanso, subir y bajar un
ejercicio y añadir una serie. **No** tocar "Guardar".
