#!/usr/bin/env bash
# Build current MotoTwin Android app (EAS preview APK) and install on a connected device.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PROFILE="${EAS_BUILD_PROFILE:-preview}"
TMP_APK="${TMPDIR:-/tmp}/mototwin-device-$(date +%s).apk"

die() {
  echo "error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

require_cmd eas
require_cmd curl
require_cmd python3

if [[ ! -x "$ADB" ]]; then
  die "adb not found at $ADB (set ADB=... or install Android platform-tools)"
fi

echo "==> Checking connected Android device(s)"
DEVICES="$("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}' | tr '\n' ' ')"
DEVICES="${DEVICES%% }"
if [[ -z "$DEVICES" ]]; then
  die "no Android device in 'device' state — connect USB or wireless adb (adb devices)"
fi
echo "    found: $DEVICES"

cd "$APP_DIR"

echo "==> EAS build: platform=android profile=$PROFILE (includes uncommitted local changes)"
BUILD_JSON="$(mktemp)"
trap 'rm -f "$BUILD_JSON"' EXIT

if ! eas build -p android --profile "$PROFILE" --non-interactive --wait --json >"$BUILD_JSON"; then
  die "EAS build failed — see output above or expo.dev builds"
fi

APK_URL="$(
  python3 - "$BUILD_JSON" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
rows = data if isinstance(data, list) else [data]
for row in reversed(rows):
    artifacts = row.get("artifacts") or {}
    url = artifacts.get("applicationArchiveUrl") or artifacts.get("buildUrl")
    if url:
        print(url)
        break
PY
)"

if [[ -z "$APK_URL" ]]; then
  BUILD_ID="$(
    python3 - "$BUILD_JSON" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
rows = data if isinstance(data, list) else [data]
for row in reversed(rows):
    bid = row.get("id")
    if bid:
        print(bid)
        break
PY
  )"
  [[ -n "$BUILD_ID" ]] || die "could not parse build id from EAS JSON"
  APK_URL="$(eas build:view "$BUILD_ID" --json | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('artifacts') or {}).get('applicationArchiveUrl') or '')")"
fi

[[ -n "$APK_URL" ]] || die "APK URL missing — build may have failed or profile is not APK (use preview)"

echo "==> Downloading APK"
curl -fsSL -o "$TMP_APK" "$APK_URL"
ls -lh "$TMP_APK"

echo "==> Installing on device (-r = replace existing)"
"$ADB" install -r "$TMP_APK"

echo "==> Done"
echo "    APK: $APK_URL"
echo "    Package: ru.mototwin.app"
echo "    API: https://mototwin.space (from eas.json profile env)"
