# Plan técnico — 0007-detalle-ejercicio

## Estrategia

Primero **deduplicar**, después corregir una sola vez. El detalle es
Tier 2: se consulta con atención parcial, a veces entre series. Los
colores se reducen a neutros; la marca queda en el brillo del marcador
sin imagen y en el CTA del selector.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `core/utils/exercise-detail.utils.ts` (+ spec) | Nuevo: las 4 funciones, puras y testeadas |
| `features/explorer/components/exercise-detail/exercise-detail.component.ts` | Nuevo: el detalle en Eclipse, con `ng-content` para acciones extra |
| `features/explorer/explorer.page.ts` | El drawer usa el componente; salen los métodos duplicados |
| `features/explorer/exercise-selector/exercise-selector.component.ts` | Ídem, con "Seleccionar Ejercicio" proyectado y corregido |
| `shared/components/drawer/drawer.component.ts` | Título a `--font-display-floor`, cerrar a `--target-min` |

## Orden

1. Tests de las funciones puras y luego las funciones (TDD).
2. Componente de detalle:
   - neutros de superficie, sin morado;
   - pasos con marcador neutro y número en `--font-data`;
   - etiquetas a `--text-xs`;
   - aviso de traducción con `--state-warning-*`;
   - consejo neutro;
   - fotos sobre `--bg-subtle`.
3. Catálogo y selector pasan a usarlo.
4. Drawer: título y cerrar.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Nombres largos de ejercicio en Anton 28 ocupan varias líneas | `text-wrap: balance` y `line-height` ajustado; se mide con un nombre largo |
| El selector pierde su botón al extraer | Se proyecta con `ng-content`; se verifica que aparezca |
| Cambiar el drawer afecta al Coach | Es el efecto buscado (su título también reprobaba); se remide ahí |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: el mismo script de la línea base.
