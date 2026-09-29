# Pendientes operativos

Lo que depende del dueño del proyecto (secretos, producción) y quedó anotado para después.
Al completar uno, bórralo de aquí en el mismo commit que lo cierra.

## Keystore de Android (antes de la próxima release)

Sin `ANDROID_KEYSTORE_BASE64`, `release.yml` firma cada APK con una llave nueva generada en el
momento: Android no deja instalar una versión encima de la anterior y hay que desinstalar primero (se
pierde la sesión guardada; los datos quedan en la nube). La llave firma la app para siempre: se genera
y se guarda fuera de cualquier sesión de Claude, en un lugar seguro, con respaldo.

1. En tu PC, con Java instalado:
   ```bash
   keytool -genkeypair -v -keystore compras-release.jks -alias compras \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   Te pide una contraseña (anótala) y datos del certificado (nombre, ciudad; pueden ser genéricos).
2. Pasarlo a base64:
   - Linux/macOS: `base64 -w0 compras-release.jks > compras-release.b64` (macOS: `base64 -i compras-release.jks -o compras-release.b64`)
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("compras-release.jks")) > compras-release.b64`
3. GitHub → `app-de-compras` → Settings → Secrets and variables → Actions:
   - `ANDROID_KEYSTORE_BASE64` = contenido de `compras-release.b64`
   - `ANDROID_KEY_ALIAS` = `compras`
   - `ANDROID_KEY_PASSWORD` = la contraseña del paso 1
4. Guardar `compras-release.jks` y la contraseña en un gestor de contraseñas; borrar el `.b64`.
5. La primera release firmada así exige desinstalar la versión anterior una última vez.

## Migraciones de boletas en el Historial en producción (plataforma-db#11)

Antes de publicar la release que trae la spec 0009. Al mergear, staging se aplica solo. Producción:
plataforma-db → Actions → *Deploy de migraciones* → Run workflow con `confirmar = produccion`.
Agrega `attach_receipt`, `create_receipt_purchase` y `set_purchase_total`; si faltan, la
verificación de RPCs de `release.yml` detiene la release.
