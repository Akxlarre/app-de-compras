# Spec: Sesión activa en Tier 3 — superficie de registro

> id: 0010-sesion-activa-tier-dato
> refs: pendientes del rediseño Eclipse. Es la única vista Tier 3
>   (`_tiers.scss`: "sesión activa, y solo esa").
> status: done
> created: 2026-09-18

## Contexto

La sesión activa es la pantalla que se usa **entrenando**: pulso alto,
manos húmedas, veinte segundos entre series. Es **Tier 3 — Dato**, con
reglas propias: objetivos de **56px** (`--target-min-critical`), sin
Anton, sin sombras, sin superficie decorativa, y lo único que se mueve
es el cronómetro.

La página tiene dos partes. Esta spec cubre la **superficie de
registro**: encabezado, cronómetro, descanso, tarjetas de ejercicio,
filas de serie y botones de añadir. Los seis modales (descartar, quitar
ejercicio, terminar, tipo de serie, feedback, resumen) van en 0011.

Medido en navegador antes de tocar nada (2026-09-18, 375×812), con una
sesión de ejemplo cargada **solo en el navegador** (el usuario no tenía
ninguna en curso):

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 5 — Ergonomía | **Los 42 objetivos** están bajo 56px, y varios bajo 44: Coach, Descartar y Terminar (**30px**), feedback y quitar ejercicio (**26px**), tipo de serie (**28px**), el check (**38px**, el control más usado de la app), "Añadir Serie" (**35px**), "Iniciar Descanso" (**37px**). Los campos de peso, reps y RIR miden 44 |
| 4 — Legibilidad | Cabecera de la tabla (SERIE, KG, REPS, RIR) a **10.4px**; "Obj: 8-10" a **8.8px**; "Descanso: 90s" a **11.5px** |
| 6 — Intensidad | La vista **no declara tier**. Anton en el cronómetro (36px) y en "Sesión" (**16px**). Sombras en el encabezado y en el check. Encabezado de vidrio con desenfoque |
| 7 — Sistema | Azul de la marca anterior (foco de los campos, feedback con nota, "Añadir Ejercicio", "Saltar" y el destello del descanso); botón Coach en degradado violeta (`#c084fc`); tipos de serie en amarillo y morado, como tenía el detalle antes de 0008 |
| 1 — Semántica | "Terminar" en verde de éxito: es una acción, no un estado. "Al fallo" en rojo de error |

## Acceptance Criteria

- **AC-01** — La vista declara `.tier-dato`. Lo único que se mueve es el
  cronómetro: sin entradas animadas, pulsos ni destellos en el descanso.
- **AC-02** — Todo objetivo táctil de la superficie de registro mide
  ≥ 56px de alto y de ancho: encabezado, tipo de serie, campos, check,
  añadir serie, añadir ejercicio, feedback, quitar ejercicio y los
  botones del descanso.
- **AC-03** — Ningún texto baja de 13px. Nada en Anton: el cronómetro y
  la cuenta del descanso van en `--font-data` con cifras tabulares.
- **AC-04** — Sin sombras, sin desenfoque y sin superficie decorativa:
  los ejercicios se separan con línea, no con tarjeta.
- **AC-05** — Color por rol, sin azul ni violeta: tipos de serie
  neutros (como 0008) con `aria-label`; serie completada en
  `--state-success`; "Terminar" en ember (acción principal); descartar
  en `--state-error-*`. Cero hex y cero `rgba()` escritos a mano en la
  superficie de registro, el cronómetro y el descanso.
- **AC-06** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- Los seis modales y sus estilos: van en 0011.
- El texto: solo diseño visual. Las letras C/D/F se mantienen.
- La lógica de la sesión y del descanso.

## Test de Regresión

`npm run test:ci` + `ng build`, y en navegador: cargar una sesión de
ejemplo **solo en memoria** (sin sesión real en curso), medir objetivos,
tamaños, fuentes, sombras y colores; completar y desmarcar una serie,
correr y saltar el descanso. **No** terminar la sesión (escribiría en la
base) y borrar la sesión de ejemplo al final.
