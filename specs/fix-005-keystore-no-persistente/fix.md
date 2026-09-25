# Fix: keystore de firma no persistente entre builds
> id: fix-005-keystore-no-persistente
> refs: —
> status: in_progress
> created: 2026-09-14

## Root Cause
El paso "Firmar APK" de `.github/workflows/release.yml` espera el secret
`ANDROID_KEYSTORE_BASE64` con un keystore real. Si no está configurado (o es
inválido), cae en un fallback que **genera un keystore autofirmado nuevo y aleatorio
en cada ejecución del workflow** ([release.yml:58-77](../../.github/workflows/release.yml:58)).

Como `ANDROID_KEYSTORE_BASE64` nunca se configuró como secret, TODOS los releases
publicados hasta ahora (v1.0.13 a v1.0.18) quedaron firmados con certificados
distintos entre sí. Android trata el certificado de firma como la identidad del
paquete: si no coincide con el instalado, rechaza la actualización in-place con
"No se instaló la app debido a un conflicto con un paquete" — obliga a desinstalar
la app (perdiendo su caché/estado local) antes de poder instalar la nueva versión.

## ACs Afectados
Ninguno — fix autónomo (config de CI/CD, no de una spec funcional).

## Cambio
No requiere cambios de código — `release.yml` ya soporta un keystore real vía
secrets, solo faltaba configurarlo:
- Generar un keystore de release permanente (una sola vez).
- Configurar los secrets en GitHub: `ANDROID_KEYSTORE_BASE64` (el .keystore en
  base64), `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- Guardar una copia de respaldo del `.keystore` fuera del repo (nunca commitear)
  y que el usuario la respalde en un lugar seguro — perderlo significa no poder
  publicar más actualizaciones que Android acepte para instalaciones existentes.

## Test de Regresión
No aplica test automatizado (config de CI, credencial de firma). Verificación manual:
- Publicar dos releases consecutivos (ej. v1.0.19 y v1.0.20) usando el keystore
  configurado y confirmar que el segundo se instala como ACTUALIZACIÓN sobre el
  primero (sin error de "conflicto con un paquete", sin desinstalar antes) ✓
