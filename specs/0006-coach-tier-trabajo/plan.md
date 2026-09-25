# Plan técnico — 0006-coach-tier-trabajo

## Estrategia

El Coach se usa con una mano y a veces entre series: lo primero es que
**se pueda tocar y leer**. La identidad es secundaria. Se corrige el
componente compartido, así la vista y el drawer mejoran juntos.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/coach/coach.page.ts` | Raíz en tier con `app-header`, alto desde `--chrome-bottom`, entrada animada |
| `shared/components/coach-chat/coach-chat.component.ts` | Objetivos a 44px, pisos de letra, Enviar con ícono en tinta, burbujas del usuario sin ember, sin `@keyframes` |
| `layout/tabs-layout/tabs-layout.component.ts` | El FAB del Coach se oculta en `/app/coach` |

## Orden

1. **Shell**: `isCoachRoute` junto a `isWorkoutRoute`, y el FAB suma
   `is-hidden` en esa ruta. Se reusa la clase que ya existe.
2. **Vista**: `.coach-page.tier-trabajo` con alto
   `calc(100dvh - var(--chrome-bottom))`, `app-header` con el título de
   siempre y el subtítulo debajo. Bloques con `data-anim="bloque"`.
3. **Chat — ergonomía**: chips, sugerencias del estado vacío y papelera
   con `min-height`/`min-width` de `--target-min`; campo y Enviar a 44px.
4. **Chat — legibilidad**: estado, hora y chips a `--text-xs` (13px).
5. **Chat — color**: Enviar con ícono en `--color-primary-text` (tinta
   sobre ember, 7.0:1). Burbuja del usuario en `--bg-subtle` con texto
   hueso; la del asistente queda en `--bg-base` con borde. El indicador
   de conexión pasa a `.indicator-live`, el punto ember del sistema.
6. **Chat — movimiento**: fuera el `@keyframes` local y las clases que
   lo usaban. La entrada de la vista la da `animateTierEnter`.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| `100dvh` no existe en un WebView viejo | Respaldo con `100vh` en una declaración previa |
| Los chips a 44px ocupan más alto en la conversación | Siguen en una fila que envuelve; es el costo de poder tocarlos |
| El drawer no tiene cromo inferior propio | El chat usa `h-full` dentro del drawer; se mide ahí también |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: el mismo script de la línea base, con y sin sesión en
curso, en la vista y en el drawer.
