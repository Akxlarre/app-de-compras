# Plan técnico — 0001-sistema-visual-eclipse (Fase 0)

> Deriva de `spec.md`. Cubre solo la fundación: cero archivos de `src/app/`.

## Estrategia

**Colapsar, no reemplazar.** El archivo de tokens tiene hoy dos bloques:
`:root` (paleta clara) y `[data-mode='dark']` (paleta oscura). La migración
consiste en mover los valores oscuros a `:root`, borrar el bloque
`[data-mode='dark']`, y aplicar la paleta Eclipse encima.

**Todos los nombres de token se conservan.** Ese es el punto de tener capa de
tokens: `--ds-brand` pasa de azul a ember y los 40+ componentes que lo
referencian cambian solos. Cero ediciones en `src/app/` (AC-02).

## Artefactos afectados

| Archivo | Slice | Qué cambia |
|---|---|---|
| `src/styles/tokens/_variables.scss` | 0.1 | Colapso dark-only + paleta Eclipse + tokens de ergonomía |
| `src/styles.scss` | 0.2 | Import de Google Fonts (Anton / Oswald / Archivo) |
| `src/styles/tokens/_variables.scss` | 0.2 | `--font-display`, `--font-data`, `--font-body` |
| ~~`src/tailwind.css`~~ | ~~0.3~~ | **Sin cambios.** Verificado en sesión: el mapa `@theme` ya referencia todo vía `var(--token)`, así que migró solo con el slice 0.1 |
| `src/styles/vendors/_primeng-overrides.scss` | 0.3 | Limpiar bloque `[data-mode="dark"]` (línea 766) |
| `src/styles/layout/_tiers.scss` | 0.4 | Archivo nuevo — clases de tier |
| `src/app/shared/components/alert-card/` | 0.5 | Semántica por forma (único toque a `src/app/`, ver nota) |

> Nota sobre 0.5: `alert-card` ya existe en `indices/COMPONENTS.md` como
> molécula estable. Modificarlo es tocar `src/app/`, lo que la spec declara
> fuera de alcance para Fase 0. **Se mueve a su propio slice al inicio de
> Fase 1**, cuando ya haya vistas donde verificarlo.

## Orden de ejecución

### Slice 0.1 — Tokens (este commit)
1. Colapsar valores de `[data-mode='dark']` dentro de `:root`; borrar el bloque
2. Añadir Capa 1: primitivas `--brand-*` (ink, bone, crimson, ember, gold, iron)
3. Añadir Capa 1: ergonomía `--target-min`, `--target-min-critical`, `--text-floor`
4. Añadir Capa 1: `--border-tier1/2/3`
5. Remapear Capa 2 (superficies, texto, bordes) a la paleta Eclipse
6. Remapear Capa 2 estados con la regla "la forma manda"
7. Remapear Capa 3 marca: `--ds-brand` azul → ember; `--color-primary-text` → tinta
8. Añadir `--gradient-flame`; reorientar `--gradient-hero` a suelo carmesí
9. Ajustar `.surface-hero` (texto bone, no tinta) e `.indicator-live` (ember, no verde)
10. Subir `--text-xs` de 12px a 13px (piso del sistema)

### Slices siguientes
- **0.2** Tipografía
- **0.3** Sincronización Tailwind + PrimeNG
- **0.4** Clases de tier

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Un componente hardcodea `#3b82f6` y queda azul huérfano en un mar de ember | Barrido de hex por vista en Fase 1+; ya está medido (115 hex) |
| `--color-primary-text` pasa de blanco a tinta y rompe un contraste asumido | Es justamente el fix: blanco sobre ember da 2.9:1 y reprueba |
| `--text-xs` 12px → 13px desplaza layouts apretados | Es el piso del sistema; si algo se rompe, el layout estaba mal |
| PrimeNG mantiene su propio `[data-mode="dark"]` | Se limpia en 0.3, no en 0.1 — se verifica que no rompa antes |

## Verificación por slice

```bash
npm run test:ci
ng build
```

Sin regresiones en tests y build de producción exitoso. Los 2 warnings NG8107
preexistentes son aceptables.

## Criterio de done (Fase 0)

Los siete AC de `spec.md` verificados, con los ratios de contraste calculados
y anotados como comentario en el propio archivo de tokens.
