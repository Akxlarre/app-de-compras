# Fix: error 406 recurrente al consultar app_updates con la tabla vacía

> id: fix-024-406-app-updates
> refs: ruido de consola visto en practicamente TODA la sesion de pruebas
>   (`Failed to load resource: 406 Not Acceptable`), documentado como
>   "fuera de alcance" en fix-018 y fix-022 hasta ahora. Se identificó su
>   origen exacto al revisar Perfil → "Buscar Actualizaciones". Usuario
>   autorizó seguir revisando ("si").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Síntoma

Cada vez que la app consulta actualizaciones disponibles (al bootstrap y
al tocar "Buscar Actualizaciones" en Perfil), la consola muestra
`Failed to load resource: the server responded with a status of 406 (Not
Acceptable)` para `GET .../app_updates?select=*&order=build_number.desc&limit=1`.
No rompe nada visible — la app sigue funcionando y loguea "App is up to
date" — pero es ruido real en cada carga, en un entorno donde
`app_updates` está vacía (no hay ninguna build publicada todavía en local).

## Causa raíz

`app-update.service.ts` → `getLatestUpdate()` usa `.single()` después de
`.limit(1)`. `.single()` le pide a PostgREST el header
`Accept: application/vnd.pgrst.object+json`, que exige **exactamente 1**
fila — con 0 filas (tabla vacía) responde `406 Not Acceptable` a nivel de
red. El código ya anticipaba este caso a nivel de JS (`if (error.code !==
'PGRST116') console.error(...)`, PGRST116 es literalmente "no rows"), pero
eso solo evita el log de la propia app — el error 406 de red ya ocurrió y
el navegador lo loguea igual como fallo de carga de recurso,
independientemente de cómo se maneje el objeto `error` en JS.

## Cambio

Cambiar `.single()` por `.maybeSingle()`. Con `.maybeSingle()`, PostgREST
responde `200 OK` con `data: null` cuando no hay filas (solo error si hay
más de una) — no hay 406 de red que loguear. Se simplifica el manejo de
error ya que el caso "sin filas" ahora llega como `data: null` sin
`error`, no como `error.code === 'PGRST116'`.

## Fuera de alcance

- No se auditan otros usos de `.single()` en el resto del código en busca
  del mismo patrón — se corrige puntualmente el caso confirmado y
  reproducido en consola durante esta sesión.

## ACs Afectados

Ninguno formal.

## Test de Regresión

Verificado por Network (fuente autoritativa — la consola del navegador de
pruebas conserva el log acumulado entre navegaciones, así que mostraba
entradas 406 viejas incluso después del fix): las peticiones más recientes
a `app_updates` tras el cambio devuelven `200 OK` de forma consistente,
antes del fix devolvían `406`.

`npm run test:ci` → 86 tests, 0 fallos. `ng build` (producción) → build
exitoso, solo los 2 warnings NG8107 preexistentes.
