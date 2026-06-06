#!/usr/bin/env bash
# Generate MotoTwin Android release keystore + keystore.properties (local only, gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
KEYSTORE_DIR="$ANDROID_DIR/keystores"
KEYSTORE_FILE="$KEYSTORE_DIR/mototwin-release.keystore"
PROPS_FILE="$ANDROID_DIR/keystore.properties"
ALIAS="mototwin-release"

if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "Keystore already exists: $KEYSTORE_FILE"
  echo "Delete it first if you really want to regenerate (you will break Play updates)."
  exit 1
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  else
    echo "Set JAVA_HOME to JDK 17+ and retry."
    exit 1
  fi
fi

KEYTOOL="$JAVA_HOME/bin/keytool"
mkdir -p "$KEYSTORE_DIR"

STORE_PASS="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
KEY_PASS="$STORE_PASS"

"$KEYTOOL" -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" -keypass "$KEY_PASS" \
  -dname "CN=MotoTwin, OU=Mobile, O=MotoTwin, L=, ST=, C=RU"

cat > "$PROPS_FILE" <<EOF
storeFile=keystores/mototwin-release.keystore
storePassword=${STORE_PASS}
keyAlias=${ALIAS}
keyPassword=${KEY_PASS}
EOF
chmod 600 "$KEYSTORE_FILE" "$PROPS_FILE"

echo "Created:"
echo "  $KEYSTORE_FILE"
echo "  $PROPS_FILE"
echo ""
echo "SHA-1 (add to Google Cloud Android OAuth client):"
"$KEYTOOL" -list -v -keystore "$KEYSTORE_FILE" -alias "$ALIAS" -storepass "$STORE_PASS" \
  | grep "SHA1:" | sed 's/^[[:space:]]*//'
echo ""
echo "Backup keystore + keystore.properties offline. Never commit them."
