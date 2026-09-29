> id: fix-046-firma-apk-estable
> refs: Actualización a la versión nueva (2026-09-29): "no se instaló la app debido a un conflicto con un paquete"
> status: done
> created: 2026-09-29

## Síntoma
Al actualizar desde el aviso de la app, Android no instala el APK nuevo: "conflicto con un paquete".
Hay que desinstalar la app para instalar la versión nueva.

## Causa raíz
`release.yml` firma con `ANDROID_KEYSTORE_BASE64`, que en app-de-compras nunca se configuró. Sin ese
secret genera una llave **nueva en cada release** (con contraseña fija en el código). Android solo
instala una actualización firmada con la misma llave que la app instalada. En app-de-entrenamiento el
secret existe (el log del release del 2026-09-29 decodifica un keystore de 2830 bytes), pero GitHub no
deja leer un secret, así que no se puede reutilizar, y el dueño no tiene el archivo.

## Solución (decisión del dueño, 2026-09-29: "Automático")
La llave se genera **una sola vez** en el workflow y se guarda en el bucket privado `ci-signing` de
Supabase (plataforma-db#12: sin policies, solo la service role que el release ya usa). Nunca pasa por
una sesión de Claude ni por el repo. `scripts/ci/ensure-keystore.sh` decide:
1. Si existe el secret `ANDROID_KEYSTORE_BASE64`, lo usa (prioridad; opción para el futuro).
2. Si no, descarga `ci-signing/shop/release.keystore` y `shop/signing.json` (alias y contraseña).
3. Si no existen, genera la llave (contraseña aleatoria) y la sube. Si otro release la subió al mismo
   tiempo, usa la que quedó guardada.
4. **Cualquier otro error de Supabase detiene el release.** Nunca se firma con una llave desechable:
   ese es justamente el bug.

La contraseña se oculta en los logs (`::add-mask::`). Una vez guardada la llave, la primera versión
exige desinstalar la app una última vez; desde ahí las actualizaciones se instalan encima.

## ACs afectados
Ninguno de specs (build y publicación). Resuelve el pendiente "Keystore de Android" de
`docs/PENDIENTES.md`.

## Test de regresión
`scripts/ci/ensure-keystore.test.sh` (Supabase simulado; keytool real):
- dos releases seguidos firman con **la misma** llave (misma huella SHA-256);
- con el secret configurado se usa el secret y no se consulta Supabase;
- con una llave ya guardada se descarga y no se genera otra;
- un error de Supabase (500) o el bucket inexistente detienen el release sin generar llave;
- si al subir ya existe una (carrera entre dos releases), se usa la guardada.

También corre en CI (`ci.yml`, "Test de la firma estable del APK").

## Verificación (2026-09-29)
- `ensure-keystore.test.sh`: 8/8 en verde localmente (keytool real, Supabase simulado).
- plataforma-db#12: pgTAP `core_ci_signing` 4/4 (bucket privado, sin policies, invisible para
  `authenticated` y `anon`).
- Pendiente de confirmar con releases reales (depende de aplicar plataforma-db#12 en producción): el
  primero debe decir "Origen de la llave de firma: generated", el siguiente "storage", y la app debe
  actualizarse encima sin desinstalar.
