# Plan técnico — 0012-editor-rutinas

## Estrategia

Mismo lenguaje que las vistas de trabajo ya migradas: tarjetas en
`--bg-surface`, campos en `--bg-elevated`, selección en ember
(`--color-primary-muted` + borde ember, como los modales de 0011) y
tipos de serie neutros (como 0008 y 0010).

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/workouts/routines/routine-editor.page.ts` | Plantilla y estilos |

## Decisiones

- **Cabecera del ejercicio**: el número y el nombre a lo ancho, como
  título de la tarjeta; debajo, una fila con arrastrar (44) a la
  izquierda y subir, bajar y quitar (44) a la derecha. El número pierde
  el círculo azul y va en `--font-data`.

  > Corregido al medir: la primera versión ponía todo en una fila y el
  > nombre, entre cuatro controles de 44, quedaba en cuatro líneas
  > ("Press de / banca / inclinado con / mancuernas").
- **Descanso**: etiqueta y cuatro pastillas de 44, sin la franja negra
  de fondo.
- **Tabla de series**: columnas `44px 1fr 72px 44px` y relleno de
  tarjeta de 12px: en 375px la columna de tipo mide ~139px y entra
  "Calentamiento (W)" en una línea. "OBJETIVO REPS" toma también la
  columna de borrar, que no tiene encabezado. Filas sin tarjeta propia
  (se repiten: regla de densidad).
- **Campos** a 16px: el nombre ya está en 16.8; notas y reps suben. Las
  notas pasan de 2 a 3 líneas: a 16px el ejemplo ya no entraba en 2.
- **"Guardar"** (`ion-button` de Ionic, color primary = ember desde
  fix-030) a 44 de alto.
- **Estado vacío** a `app-empty-state`, con el mismo texto.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| La cabecera no entra con cuatro controles de 44 | El nombre se envuelve; se mide en 375px con un nombre largo |
| Guardar escribe en la base | No se toca; el borrador vive en memoria |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: el mismo script de la línea base.
