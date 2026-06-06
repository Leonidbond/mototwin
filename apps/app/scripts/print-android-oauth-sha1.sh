#!/usr/bin/env bash
# Print SHA-1 fingerprints for Google Cloud Android OAuth client.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  fi
fi

echo "Package name: ru.mototwin.app"
echo ""
echo "From Gradle signingReport:"
(cd "$ANDROID_DIR" && ./gradlew signingReport 2>/dev/null | grep -A1 "SHA1:" | head -20)
