# Pendientes operativos

Lo que depende del dueño del proyecto (secretos, producción) y quedó anotado para después.
Al completar uno, bórralo de aquí en el mismo commit que lo cierra.

## Borrar el escáner viejo de boletas (spec 0010, AC4)

Quedó sin uso desde la spec 0008 y el guardia de la sesión no deja borrar archivos. En tu PC, dentro
del repo actualizado:
```bash
git rm src/app/features/shopping/receipt-scanner/receipt-scanner.page.ts \
  src/app/core/facades/receipt-scanner.facade.ts \
  src/app/core/facades/receipt-scanner.facade.spec.ts
git commit -m "chore(boletas): borrar el escáner viejo (reemplazado por el cierre de compra)"
git push
```
Después, en `indices/REPOSITORIES.md` y `indices/FACADES.md` se quita `ReceiptScannerFacade`
(`npm run indices:sync` actualiza FACADES).

## Firma estable del APK (fix-046): aplicar plataforma-db#12 en producción

La llave de firma ya es automática: el release la genera una vez y la guarda en el bucket privado
`ci-signing` de Supabase (solo la service role lo lee). Falta crear ese bucket en producción:
plataforma-db → Actions → *Deploy de migraciones* → Run workflow con `confirmar = produccion`
(migración `20260929040000_core_ci_signing_bucket`). Sin él, el release se detiene en "Firmar APK"
con ese mismo aviso; nunca firma con una llave desechable.

La primera versión firmada con la llave estable exige desinstalar la app una última vez; desde ahí
las actualizaciones se instalan encima.

## Migraciones de boletas en el Historial en producción (plataforma-db#11)

Antes de publicar la release que trae la spec 0009. Al mergear, staging se aplica solo. Producción:
plataforma-db → Actions → *Deploy de migraciones* → Run workflow con `confirmar = produccion`.
Agrega `attach_receipt`, `create_receipt_purchase` y `set_purchase_total`; si faltan, la
verificación de RPCs de `release.yml` detiene la release.
