#!/usr/bin/env bash
# Копирует push-файлы из auth/ в apps/app/ перед eas build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUTH="$ROOT/auth"
APP="$ROOT/apps/app"

copy_if_exists() {
  local src="$1" dst="$2"
  if [[ -f "$src" ]]; then
    cp "$src" "$dst"
    echo "copied $(basename "$src") -> $dst"
  else
    echo "skip: $(basename "$src") not found in auth/"
  fi
}

copy_if_exists "$AUTH/google-services.json" "$APP/google-services.json"

if [[ -f "$AUTH/google-services.json" ]]; then
  echo "OK: google-services.json ready for EAS build"
else
  echo "WARN: add auth/google-services.json from Firebase Console first"
  exit 1
fi
