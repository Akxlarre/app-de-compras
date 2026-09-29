#!/usr/bin/env bash
# Test de regresión de fix-046: la llave de firma de los APK no cambia entre releases.
#   bash scripts/ci/ensure-keystore.test.sh
# Simula Supabase Storage con un `curl` falso (en PATH) que guarda objetos en un directorio; keytool
# es el real. Requiere keytool, jq y base64.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/ensure-keystore.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
fallas=0
ok() { echo "ok - $1"; }
falla() { echo "not ok - $1"; fallas=$((fallas + 1)); }

# ── curl falso: Storage en $FAKE_STORE; FAKE_MODE = normal | error500 | nobucket | race ──────────
mkdir -p "$WORK/bin"
cat > "$WORK/bin/curl" <<'FAKE'
#!/usr/bin/env bash
out=""; fmt=""; method="GET"; data=""; url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2;;
    -w) fmt="$2"; shift 2;;
    -X) method="$2"; shift 2;;
    -H) shift 2;;
    --data-binary) data="${2#@}"; shift 2;;
    -s|-S|-sS|--silent|--show-error) shift;;
    *) url="$1"; shift;;
  esac
done
echo "$method $url" >> "$FAKE_STORE/calls.log"
key="${url##*/storage/v1/object/}"
file="$FAKE_STORE/objects/$key"
respond() { printf '%s' "$2" > "${out:-/dev/null}"; [ -n "$fmt" ] && printf '%s' "$1"; }
case "${FAKE_MODE:-normal}" in
  error500) respond 500 '{"statusCode":"500","error":"internal","message":"boom"}'; exit 0;;
  nobucket) respond 400 '{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}'; exit 0;;
esac
if [ "$method" = "GET" ]; then
  if [ -f "$file" ]; then cp "$file" "$out"; [ -n "$fmt" ] && printf 200
  else respond 400 '{"statusCode":"404","error":"not_found","message":"Object not found"}'; fi
else
  # race: otro release subió su llave justo antes que éste
  if [ "${FAKE_MODE:-}" = "race" ] && [ ! -f "$file" ]; then
    mkdir -p "$(dirname "$file")"; cp "$FAKE_STORE/other.json" "$file"
  fi
  if [ -f "$file" ]; then respond 400 '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}'
  else mkdir -p "$(dirname "$file")"; cp "$data" "$file"; respond 200 '{"Key":"ok"}'; fi
fi
FAKE
chmod +x "$WORK/bin/curl"

fingerprint() { # $1 = dir con release.keystore + signing.env
  ( set -a; . "$1/signing.env"; set +a
    keytool -list -keystore "$1/release.keystore" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" \
      2>/dev/null | grep -o 'SHA-256.*' )
}

run() { # $1 = dir de salida; resto = variables extra
  local dir="$1"; shift
  mkdir -p "$dir"
  env PATH="$WORK/bin:$PATH" FAKE_STORE="$STORE" SUPABASE_URL="https://abc.supabase.co" \
    SUPABASE_SERVICE_ROLE_KEY="service-role" "$@" bash "$SCRIPT" "$dir" > "$dir/log" 2>&1
}

nuevo_store() { STORE="$WORK/store-$1"; mkdir -p "$STORE/objects"; : > "$STORE/calls.log"; }

# 1. Dos releases seguidos sin secret: el primero genera y guarda, el segundo reutiliza.
nuevo_store 1
run "$WORK/r1"; c1=$?
run "$WORK/r2"; c2=$?
f1="$(fingerprint "$WORK/r1")"; f2="$(fingerprint "$WORK/r2")"
if [ $c1 -eq 0 ] && [ $c2 -eq 0 ] && [ -n "$f1" ] && [ "$f1" = "$f2" ]; then
  ok "dos releases seguidos firman con la misma llave"
else falla "dos releases seguidos firman con la misma llave (c1=$c1 c2=$c2 '$f1' vs '$f2')"; cat "$WORK/r1/log" "$WORK/r2/log"; fi
grep -q '^SIGNING_SOURCE=generated' "$WORK/r1/signing.env" && grep -q '^SIGNING_SOURCE=storage' "$WORK/r2/signing.env" \
  && ok "el primero la genera y el segundo la descarga" || falla "origen de la llave (generated → storage)"
[ -f "$STORE/objects/ci-signing/shop/signing.json" ] && ok "queda guardada en ci-signing/shop/signing.json" \
  || falla "la llave no quedó en ci-signing/shop/signing.json"
pw="$(sed -n 's/^KEYSTORE_PASSWORD=//p' "$WORK/r1/signing.env")"
grep -q "::add-mask::$pw" "$WORK/r1/log" && ! grep -v '::add-mask::' "$WORK/r1/log" | grep -q "$pw" \
  && ok "la contraseña se enmascara y no aparece en el log" || falla "la contraseña quedó visible en el log"

# 2. Con el secret configurado se usa el secret y no se consulta Supabase.
nuevo_store 2
keytool -genkeypair -keystore "$WORK/secret.jks" -alias mia -keyalg RSA -keysize 2048 -validity 100 \
  -storepass secreta123 -keypass secreta123 -storetype PKCS12 -dname "CN=Test" >/dev/null 2>&1
run "$WORK/s" KEYSTORE_BASE64="$(base64 -w0 "$WORK/secret.jks")" KEY_ALIAS=mia KEY_PASSWORD=secreta123
if [ $? -eq 0 ] && grep -q '^SIGNING_SOURCE=secret' "$WORK/s/signing.env" && grep -q '^KEY_ALIAS=mia' "$WORK/s/signing.env" \
  && [ ! -s "$STORE/calls.log" ]; then ok "con el secret se usa el secret y no se toca Supabase"
else falla "con el secret se usa el secret"; cat "$WORK/s/log"; fi

# 3. Error de Supabase (500): se detiene sin generar llave.
nuevo_store 3
run "$WORK/e" FAKE_MODE=error500
if [ $? -ne 0 ] && ! grep -q '^POST' "$STORE/calls.log" && [ ! -f "$WORK/e/signing.env" ]; then
  ok "un error de Supabase detiene el release sin generar llave"
else falla "un error de Supabase detiene el release"; cat "$WORK/e/log"; fi

# 4. Bucket inexistente (migración sin aplicar): se detiene con un mensaje claro.
nuevo_store 4
run "$WORK/b" FAKE_MODE=nobucket
if [ $? -ne 0 ] && grep -q 'ci-signing' "$WORK/b/log" && ! grep -q '^POST' "$STORE/calls.log"; then
  ok "sin el bucket se detiene y lo explica"
else falla "sin el bucket se detiene"; cat "$WORK/b/log"; fi

# 5. Carrera: otro release subió una llave justo antes; se usa la guardada, no la recién generada.
nuevo_store 5
run "$WORK/o"; cp "$STORE/objects/ci-signing/shop/signing.json" "$STORE/other.json"
rm -rf "$STORE/objects"; mkdir -p "$STORE/objects"
run "$WORK/c" FAKE_MODE=race
if [ $? -eq 0 ] && [ "$(fingerprint "$WORK/c")" = "$(fingerprint "$WORK/o")" ]; then
  ok "en una carrera se usa la llave que quedó guardada"
else falla "en una carrera se usa la llave guardada"; cat "$WORK/c/log"; fi

echo "# fallas: $fallas"
[ $fallas -eq 0 ]
