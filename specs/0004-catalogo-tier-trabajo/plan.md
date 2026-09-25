# Plan técnico — 0004-catalogo-tier-trabajo

## Estrategia

**Tier 2 significa restarle, no sumarle.** Entrenar necesitaba ganar
presencia; el Catálogo necesita lo contrario: sacarle decoración para
que la fila de ejercicio se lea de un vistazo mientras el usuario
scrollea buscando algo concreto.

Los tres arreglos de ergonomía y legibilidad no son estéticos: un chip
de 30px y una etiqueta de 10.88px son defectos de uso medidos, no
opiniones.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/explorer/explorer.page.ts` | Raíz en tier, chips a 44px, pisos tipográficos, barrido de hex, iconos, estados |

## Orden

1. Raíz `.tier-trabajo` + `animateTierEnter` en `ngAfterViewInit`
2. Chips de filtro: alto ≥ `--target-min`, con separación real entre
   ellos para que no se toquen con el pulgar
3. Buscador a `--target-min`
4. Subir los tres tamaños por debajo de 13px a `--text-xs`
5. Barrido de `#eab308` y demás hardcode → tokens
6. Iconos repetidos de la lista: quitar el círculo idéntico
7. Estados: vacío, carga, y "sin resultados" distinto de "sin datos"

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Subir los chips a 44px rompe el scroll horizontal de la fila | Verificar en 375px que la fila sigue desplazándose y no hay scroll de página |
| Quitar el icono deja la fila sin ancla visual | La fila ya tiene nombre + grupo + equipo; el círculo no aportaba nada |
| Subir tamaños de fuente desborda textos largos | Verificar con los nombres más largos del catálogo |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: re-medir objetivos táctiles y tamaños de fuente con el
mismo script que produjo el diagnóstico, y probar búsqueda y filtro.
