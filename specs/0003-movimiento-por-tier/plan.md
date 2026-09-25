# Plan técnico — 0003-movimiento-por-tier

## Estrategia

**El tier se lee del DOM, no se pasa como parámetro.** La vista ya
declara `.tier-ceremonia` / `.tier-trabajo` / `.tier-dato` en su raíz
(spec 0001). El servicio lo lee de ahí. Así es imposible que una vista
declare un tier en CSS y pida otro en TypeScript.

**Fail-visible, no fail-hidden.** El riesgo real de cualquier animación
de entrada es dejar contenido en `opacity: 0` si algo falla: sin GSAP,
con reduced-motion, o si el selector no encuentra nada. El método
arranca poniendo todo visible y solo entonces anima desde un estado
inicial — nunca al revés.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `core/services/ui/gsap-animations.service.ts` | Método nuevo `animateTierEnter()` |
| `features/workouts/workouts.page.ts` | Llamarlo en `ngAfterViewInit`, reemplazando el `staggerListItems` suelto del `effect()` |

## Implementación

1. `animateTierEnter(rootEl)`:
   - Lee la clase de tier del propio `rootEl`
   - `tier-dato` o `prefers-reduced-motion` → `gsap.set(..., {clearProps})` y salir
   - `tier-ceremonia` → timeline: ceremonia (`[data-anim="ceremonia"]`) primero,
     luego el resto con stagger
   - `tier-trabajo` → stagger parejo
2. Duraciones desde `--duration-slower` (600ms) y `--duration-normal` (300ms)
   vía el `getCssDuration()` que ya existe
3. Marcar el bloque de ceremonia de Entrenar con `data-anim="ceremonia"`

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Contenido queda invisible si algo falla | El método setea visible primero; AC-05 lo verifica en navegador |
| El `effect()` actual de Entrenar anima `.history-card` en paralelo y pelea | Se reemplaza por la entrada por tier |
| Animar en cada cambio de tab marea | Solo en `ngAfterViewInit`, no en cada re-entrada |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: opacidad final 1 en todos los bloques, y lo mismo con
`prefers-reduced-motion` emulado.
