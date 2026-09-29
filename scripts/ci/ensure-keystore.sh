#!/usr/bin/env bash
# Deja en <dir> la llave con que se firman los APK de la app, siempre la MISMA (fix-046).
#   bash scripts/ci/ensure-keystore.sh <dir>   → <dir>/release.keystore + <dir>/signing.env
#
# Android solo instala una actualización firmada con la misma llave que la app instalada. Orden:
#   1. Secret ANDROID_KEYSTORE_BASE64 (+ KEY_ALIAS, KEY_PASSWORD), si está configurado.
#   2. La llave guardada en Supabase Storage, bucket privado `ci-signing` (solo service role):
#      `<app>/signing.json` = { alias, password, keystore_base64 } (un objeto: se sube de una vez).
#   3. Si no hay ninguna, se genera UNA y se guarda ahí para los próximos releases.
# Cualquier otro error de Supabase detiene el release: firmar con una llave desechable es el bug.
#
# Entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SIGNING_APP (default shop),
#          SIGNING_BUCKET (default ci-signing), KEYSTORE_BASE64 / KEY_ALIAS / KEY_PASSWORD (opcionales).
set -euo pipefail

OUT="${1:?uso: ensure-keystore.sh <dir>}"
APP="${SIGNING_APP:-shop}"
BUCKET="${SIGNING_BUCKET:-ci-signing}"
mkdir -p "$OUT"
KS="$OUT/release.keystore"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

write_env() { # $1 alias, $2 password, $3 origen
  echo "::add-mask::$2"
  {
    echo "KEY_ALIAS=$1"
    echo "KEYSTORE_PASSWORD=$2"
    echo "KEY_PASSWORD=$2"
    echo "SIGNING_SOURCE=$3"
  } > "$OUT/signing.env"
}

# ── 1. Secret del repositorio ────────────────────────────────────────────────────────────────────
if [ -n "${KEYSTORE_BASE64:-}" ]; then
  printf '%s' "$KEYSTORE_BASE64" | tr -d '\r\n ' | base64 -d > "$KS"
  if [ "$(wc -c < "$KS")" -lt 50 ] || [ -z "${KEY_ALIAS:-}" ] || [ -z "${KEY_PASSWORD:-}" ]; then
    echo "❌ ANDROID_KEYSTORE_BASE64 no es un keystore válido o faltan ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD."
    exit 1
  fi
  write_env "$KEY_ALIAS" "$KEY_PASSWORD" secret
  echo "🔑 Firmando con la llave del secret ANDROID_KEYSTORE_BASE64."
  exit 0
fi

# ── 2 y 3. Llave guardada en Supabase (o generarla una vez) ──────────────────────────────────────
: "${SUPABASE_URL:?falta SUPABASE_URL}" "${SUPABASE_SERVICE_ROLE_KEY:?falta SUPABASE_SERVICE_ROLE_KEY}"
BASE="https://$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|').supabase.co"
OBJ="$BASE/storage/v1/object/$BUCKET/$APP/signing.json"
AUTH=(-H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

bucket_missing() {
  echo "❌ No existe el bucket '$BUCKET' en Supabase. Aplica la migración de plataforma-db"
  echo "   (20260929040000_core_ci_signing_bucket: Actions → Deploy de migraciones, confirmar=produccion)."
  exit 1
}

# 0 = descargada en $TMP/signing.json · 1 = no existe · sale del script ante cualquier otro error.
download() {
  local code
  code="$(curl -sS -o "$TMP/signing.json" -w '%{http_code}' "${AUTH[@]}" "$OBJ")" || {
    echo "❌ No se pudo conectar con Supabase Storage para leer la llave de firma."; exit 1; }
  if [ "$code" = "200" ]; then return 0; fi
  if grep -q 'Bucket not found' "$TMP/signing.json" 2>/dev/null; then bucket_missing; fi
  if [ "$code" = "404" ] || grep -qE 'not_found|Object not found' "$TMP/signing.json" 2>/dev/null; then return 1; fi
  echo "❌ Supabase Storage respondió HTTP $code al leer la llave de firma; no se firma con otra llave."
  exit 1
}

use_downloaded() { # $1 origen
  local alias pw
  alias="$(jq -er '.alias' "$TMP/signing.json")" && pw="$(jq -er '.password' "$TMP/signing.json")" \
    && jq -er '.keystore_base64' "$TMP/signing.json" | base64 -d > "$KS" || {
      echo "❌ ci-signing/$APP/signing.json está incompleto; revísalo antes de publicar."; exit 1; }
  write_env "$alias" "$pw" "$1"
}

if download; then
  use_downloaded storage
  echo "🔑 Firmando con la llave guardada en $BUCKET/$APP."
  exit 0
fi

echo "🛠️ Primera release con firma estable: se genera la llave y se guarda en $BUCKET/$APP."
ALIAS="compras"
PW="$(openssl rand -hex 24)"
echo "::add-mask::$PW"
keytool -genkeypair -keystore "$TMP/new.keystore" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12 \
  -storepass "$PW" -keypass "$PW" \
  -dname "CN=App de Compras, O=App de Compras, C=CL" >/dev/null 2>&1
jq -n --arg a "$ALIAS" --arg p "$PW" --arg k "$(base64 -w0 "$TMP/new.keystore")" \
  '{alias: $a, password: $p, keystore_base64: $k}' > "$TMP/upload.json"

code="$(curl -sS -o "$TMP/upload.resp" -w '%{http_code}' -X POST "${AUTH[@]}" \
  -H "Content-Type: application/json" -H "x-upsert: false" \
  --data-binary @"$TMP/upload.json" "$OBJ")" || { echo "❌ No se pudo subir la llave a Supabase Storage."; exit 1; }

if [ "$code" = "200" ]; then
  cp "$TMP/new.keystore" "$KS"
  write_env "$ALIAS" "$PW" generated
  echo "✅ Llave guardada en $BUCKET/$APP. Desde ahora todas las versiones se firman con ella."
  exit 0
fi
if grep -q 'Bucket not found' "$TMP/upload.resp" 2>/dev/null; then bucket_missing; fi
if [ "$code" = "409" ] || grep -qE 'Duplicate|already exists' "$TMP/upload.resp" 2>/dev/null; then
  # Otro release la guardó entre la lectura y la subida: manda la guardada.
  download || { echo "❌ La llave existe pero no se pudo leer."; exit 1; }
  use_downloaded storage
  echo "🔑 Otro release guardó la llave primero; se usa esa."
  exit 0
fi
echo "❌ Supabase Storage respondió HTTP $code al guardar la llave; no se publica con una llave que no quedó guardada."
exit 1
