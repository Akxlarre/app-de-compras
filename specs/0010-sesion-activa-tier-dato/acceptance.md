# Acceptance — 0010-sesion-activa-tier-dato

> verificado: 2026-09-18, navegador a 375×812 (modo md), con la sesión
> del usuario y **una sesión de ejemplo cargada solo en el navegador**
> (`activeSession` + `localStorage`; el usuario no tenía ninguna en
> curso ni sincronizaciones pendientes). Nunca se tocó "Terminar y
> Guardar", que es lo único que escribe en la base.

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | `ion-header` e `ion-content` llevan `.tier-dato`; el cronómetro y el descanso, `.tier-cronometro`. El descanso ya no tiene `@keyframes`: 0 animaciones corriendo en él, sin entrada, pulso, destello ni "pop". Se queda el anillo (el cronómetro) y el medio segundo de respuesta del check al tocarlo |
| AC-02 | ✅ | Los 42 objetivos de la superficie miden ≥ 56px de alto y de ancho (antes, los 42 debajo). Atrás 56×56 (Ionic fija 48 en su `:host`); campos 77×56 y 61×56, con `ion-input` ocupando la celda entera, porque es su área táctil; check 56×56 (era 38); tipo de serie 56 (era 28); descanso: -15s, +30s, +1m y Saltar a 56 de alto |
| AC-03 | ✅ | 0 textos bajo 13px (antes 10.4, 8.8 y 11.5). 0 elementos en Anton. Cronómetro, cuenta del descanso, campos y "¡A DARLE!" en Oswald con `tabular-nums` |
| AC-04 | ✅ | 0 sombras y 0 `backdrop-filter` en la superficie. Ejercicios separados con línea `--border-default`, sin tarjeta; sin la mancuerna repetida |
| AC-05 | ✅ | Tipos de serie neutros con `aria-label` ("Serie 1: Calentamiento", "Serie 4: Al fallo"…); fila completada en `--state-success-bg`, check en `--state-success` con tinta; "Terminar" en ember con tinta; descartar en `--state-error-*`; foco del campo con borde ember. Ningún color de la marca anterior en pantalla (azul, violeta, amarillo). En el código: 0 hex y 0 `rgba()` en cronómetro y descanso; en la página quedan 35, todos en los modales (0011). El archivo tenía 98 |
| AC-06 | ✅ con aviso | `npm run test:ci`: 112 tests pasan (incluye 2 nuevos de `nombreTipoSerie`). `ng build` compila, pero los estilos de la página pasan el presupuesto de 10 kB (11.06 kB). Se resuelve en 0011, que va en el mismo PR: los modales cargan la mayor parte del CSS que sobra |

Recorrido: completar la serie 3 (arranca el descanso), forzar el estado
urgente (anillo y cifras en dorado, sin moverse), forzar el final
("¡A DARLE!" en Oswald y ember), enfocar un campo y desmarcar la serie.

**Decisión anotada:** lo urgente del descanso pasó del rojo de error al
dorado de aviso: que el descanso se termine no es una falla.
