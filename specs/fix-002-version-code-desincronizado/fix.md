# Fix: versionCode del APK desincronizado del build_number publicado
> id: fix-002-version-code-desincronizado
> refs: —
> status: done
> closed: 2026-09-14
> created: 2026-09-14

## Root Cause
`android/app/build.gradle` tiene `versionCode 1` hardcodeado — nunca cambia entre
builds, sin importar el tag/release. Mientras tanto, `scripts/publish-update.js`
calcula `build_number` para la fila que inserta en `app_updates` como
`(max(build_number) actual) + 1`, que sí se autoincrementa en cada publish (va en 4
después de v1.0.16).

`AppUpdateService.getCurrentBuild()` lee el `versionCode` real del APK instalado vía
`App.getInfo().build` (Capacitor) — que siempre es `1`. `AppUpdateFacade.checkForUpdates()`
compara `latestUpdate.build_number > currentBuild`. Como `currentBuild` nunca deja de
ser `1` y `latestUpdate.build_number` sigue subiendo, la condición es SIEMPRE verdadera,
incluso recién instalado el último APK: el modal de "nueva versión disponible" aparece
en loop infinito.

## ACs Afectados
Ninguno — fix autónomo (bug de configuración de build/CI, no de una spec funcional).

## Cambio
- **Archivo:** `android/app/build.gradle`
  **Qué cambia:** `versionCode` deja de ser un literal fijo y se lee de una property
  de Gradle (`-PversionCode=N`), con `1` como default si no se pasa (para builds
  locales de desarrollo).
- **Archivo:** `.github/workflows/release.yml`
  **Qué cambia:** el paso "Build Android APK" pasa `-PversionCode=${{ github.run_number }}`
  a `./gradlew assembleRelease`, y el paso "Publicar Actualización en Supabase" pasa
  ese mismo `github.run_number` como `VERSION_CODE` al script de publicación — un único
  número, generado una sola vez por el propio run de CI, en vez de dos cálculos
  independientes (uno en Gradle, otro en la query a `app_updates`).
- **Archivo:** `scripts/publish-update.js`
  **Qué cambia:** usa `process.env.VERSION_CODE` (si viene seteado) como `build_number`
  en vez de calcular `max(build_number) + 1` desde la tabla, eliminando la fuente de
  desincronización.

## Test de Regresión
No aplica test automatizado (config de build/CI). Verificación manual:
- Publicar un nuevo tag y confirmar en los logs de CI que "Build Android APK" y
  "Publicar Actualización en Supabase" usan el mismo número de build.
- Instalar el APK resultante y confirmar en Perfil → Buscar Actualizaciones que
  NO reporta una actualización disponible (ya está en la última versión) ✓
  — **verificado en dispositivo real: versionCode=30 instalado, "Buscar
  Actualizaciones" ya no muestra aviso.**
