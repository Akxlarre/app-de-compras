# Pendientes operativos

Lo que depende del dueño del proyecto (secretos, producción) y quedó anotado para después.
Al completar uno, bórralo de aquí en el mismo commit que lo cierra.

## Firma estable del APK (fix-046): aplicar plataforma-db#12 en producción

La llave de firma ya es automática: el release la genera una vez y la guarda en el bucket privado
`ci-signing` de Supabase (solo la service role lo lee). Falta crear ese bucket en producción:
plataforma-db → Actions → *Deploy de migraciones* → Run workflow con `confirmar = produccion`
(migración `20260929040000_core_ci_signing_bucket`). Sin él, el release se detiene en "Firmar APK"
con ese mismo aviso; nunca firma con una llave desechable.

La primera versión firmada con la llave estable exige desinstalar la app una última vez; desde ahí
las actualizaciones se instalan encima.

## Cierre con boleta confiable (spec 0015): migración antes que la app

plataforma-db#17 (migración `20261009010000_shop_receipt_reliable`) ya está en staging. **Falta
producción, y tiene que ir antes de publicar la release de la app que trae la spec 0015:** el
Historial pide `purchase_lines` y sin la tabla la consulta falla. plataforma-db → Actions →
*Deploy de migraciones* → Run workflow con `confirmar = produccion`.

## Migraciones de boletas en el Historial en producción (plataforma-db#11)

Antes de publicar la release que trae la spec 0009. Al mergear, staging se aplica solo. Producción:
plataforma-db → Actions → *Deploy de migraciones* → Run workflow con `confirmar = produccion`.
Agrega `attach_receipt`, `create_receipt_purchase` y `set_purchase_total`; si faltan, la
verificación de RPCs de `release.yml` detiene la release.
