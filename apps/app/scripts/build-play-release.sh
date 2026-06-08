#!/usr/bin/env bash
# Build Android App Bundle (AAB) for Google Play via EAS.
# Prerequisites: eas login, auth/google-services.json, FCM key in EAS credentials.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$APP_DIR/../.." && pwd)"

echo "==> Sync push files from auth/"
bash "$APP_DIR/scripts/sync-push-files-from-auth.sh"

echo "==> EAS production build (AAB, autoIncrement versionCode)"
cd "$APP_DIR"
eas build -p android --profile production "$@"

echo ""
echo "Done. Next steps:"
echo "  1. eas submit -p android --profile production   # upload draft to Play internal track"
echo "  2. Play Console: store listing, Data safety, content rating"
echo "  See docs/deploy/google-play.md"
