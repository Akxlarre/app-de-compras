# Fix: botón "Preferencias" en Perfil no hace nada al tocarlo

> id: fix-025-preferencias-sin-feedback
> refs: encontrado revisando Perfil tras fix-024. Usuario autorizó seguir
>   revisando ("si").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Síntoma

En Perfil → Opciones, "Preferencias" se ve idéntico a "Buscar
Actualizaciones" (mismo `ion-item button` con chevron indicando
navegación), pero al tocarlo no pasa absolutamente nada — sin feedback,
sin navegación, sin mensaje. El usuario no puede distinguir si es un bug o
una función que todavía no existe.

## Causa raíz

`profile.page.ts`: el `<ion-item>` de "Preferencias" (línea 69) nunca tuvo
un `(click)` asignado — a diferencia del de "Buscar Actualizaciones"
(línea 50-56, correctamente conectado a `checkForUpdates()`). No existe
ninguna pantalla de preferencias en el proyecto todavía.

## Cambio

Conectar `(click)="showPreferencesComingSoon()"` que emite
`toast.info('Preferencias', 'Esta sección estará disponible
próximamente.')` — usando `ToastService` (ya en uso desde fix-019),
siguiendo el mismo patrón de comunicar "(Próximamente)" que ya usa el
creador de mesociclo para su tercera estrategia de periodización, en vez
de dejar un botón sin efecto visible.

## Fuera de alcance

- No se construye ninguna pantalla de Preferencias real — el pedido era
  corregir el botón sin feedback, no implementar la funcionalidad.
- No se toca el caso similar detectado en `mesocycle-builder.page.ts`
  ("Periodización Ondulante (Próximamente)" es en realidad clickeable y
  SÍ selecciona esa estrategia pese a la etiqueta) — es un hallazgo
  distinto, en un archivo distinto, que amerita su propio fix si se
  decide abordarlo.

## ACs Afectados

Ninguno formal.

## Test de Regresión

Verificado por DOM (más confiable que una captura de pantalla: el toast
dura 3s y la latencia de red entre pasos de la sesión de pruebas lo hacía
desaparecer antes de la captura): al hacer click en "Preferencias" aparece
`<p-toastitem class="p-toast-message-info">` con el contenido correcto en
el DOM inmediatamente después del click.

`npm run test:ci` → 86 tests, 0 fallos. `ng build` (producción) → build
exitoso, solo los 2 warnings NG8107 preexistentes.
