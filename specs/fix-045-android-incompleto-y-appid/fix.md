> id: fix-045-android-incompleto-y-appid
> refs: Release v1.0.1 (2026-09-28): "Unable to access jarfile …/gradle-wrapper.jar"
> status: done
> created: 2026-09-28

## Síntoma
La primera release que llega a compilar el APK (v1.0.1) falla en `./gradlew assembleRelease`: no
existe `android/gradle/wrapper/gradle-wrapper.jar`.

## Causa raíz
1. El proyecto Android está incompleto en el repo: 12 archivos contra 77 de app-de-entrenamiento.
   Nunca se commitearon `android/gradle/wrapper/`, `android/app/src/main/` (manifest, MainActivity,
   recursos, íconos) ni `android/app/src/test|androidTest`.
2. `capacitor.config.ts` y `android/app/build.gradle` siguen con el `appId` del clon:
   `com.app.entrenamiento` / "FitTrack". Un APK con ese id Android lo trata como la app de
   entrenamiento (la reemplaza o no se instala). fix-043 lo dejó fuera porque cambiarlo rompe las
   actualizaciones de un APK ya instalado, pero compras nunca publicó un APK (release.yml corrió por
   primera vez hoy): es el único momento en que cambiarlo no rompe nada.

## Solución
- `appId` `com.app.compras`, `appName` "App de Compras" (capacitor.config.ts y build.gradle).
- Plataforma Android regenerada con `npx cap add android` (Capacitor 8, el del package.json),
  conservando los archivos que ya estaban versionados si fueron personalizados.

## ACs afectados
Ninguno de specs (build nativo). Deja de haber dos apps con el mismo id Android.

## Test de regresión
La release (`release.yml`, job build_and_deploy_apk) compila y firma el APK con `com.app.compras`.

## Verificación (2026-09-28)
Release v1.0.2 (run 36495978820, `36cb0d7`): `assembleRelease` compiló (1:56 min), el APK se firmó
("✅ Firmado exitoso") y se publicó como `update-v1.0.2-b6.apk` con `com.app.compras`.
Hallazgo aparte: esa release usó los secretos de STAGING (`SUPABASE_URL` → `okcekripvbimlloqlihv`), así
que el APK v1.0.2 quedó conectado a la base de staging; se agregó un freno en `release.yml` y
`deploy-functions.yml` y hay que corregir los 3 secretos y publicar v1.0.3.
