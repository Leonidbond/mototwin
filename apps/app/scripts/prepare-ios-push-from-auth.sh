#!/usr/bin/env bash
# Копирует APNs .p8 из auth/ в apps/app/ перед загрузкой в EAS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
AUTH="$ROOT/auth"
APP="$ROOT/apps/app"
META="$AUTH/apns_push.key"

if [[ ! -f "$META" ]]; then
  echo "ERROR: missing auth/apns_push.key"
  echo "Create APNs key in Apple Developer (see auth/apns_push_steps.txt), then add:"
  echo "  KEY_ID=XXXXXXXXXX"
  echo "  TEAM_ID=BM9LAU7B7D"
  echo "  P8_FILE=AuthKey_XXXXXXXXXX.p8"
  exit 1
fi

# shellcheck disable=SC1090
source "$META"

if [[ -z "${KEY_ID:-}" || -z "${TEAM_ID:-}" || -z "${P8_FILE:-}" ]]; then
  echo "ERROR: auth/apns_push.key must define KEY_ID, TEAM_ID, P8_FILE"
  exit 1
fi

SRC="$AUTH/$P8_FILE"
DST="$APP/apns-key.p8"
if [[ ! -f "$SRC" ]]; then
  echo "ERROR: APNs key not found: $SRC"
  exit 1
fi

cp "$SRC" "$DST"
echo "copied $P8_FILE -> apps/app/apns-key.p8"
echo "OK: APNs key ready (Key ID $KEY_ID, Team $TEAM_ID)"
