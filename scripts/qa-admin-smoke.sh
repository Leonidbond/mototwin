#!/usr/bin/env bash
# Smoke-test every admin page + JSON API as super-admin.
# Usage: bash scripts/qa-admin-smoke.sh [BASE_URL]
set -uo pipefail

BASE="${1:-http://localhost:3000}"
# By default we hit the panel as the seeded demo user, which has SUPER_ADMIN.
# Set MOTOTWIN_DEV_EMAIL="..." (and MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true on the server) to switch.
EMAIL="${MOTOTWIN_DEV_EMAIL:-}"
PAGES=(
  /admin
  /admin/users
  /admin/vehicles
  /admin/models
  /admin/catalog
  /admin/fitment
  /admin/moderation
  /admin/imports
  /admin/imports/new
  /admin/audit
  /admin/dictionaries
  /admin/dictionaries?tab=nodes
  /admin/reports
  /admin/settings
  /admin/service-rules
  /admin/notifications
  /admin/subscriptions
)

APIS=(
  /api/admin/dashboard/kpis
  /api/admin/dashboard/work-queue
  /api/admin/dashboard/fastest-growing-models
  /api/admin/dashboard/problem-areas
  /api/admin/dashboard/fitment-quality
  /api/admin/dashboard/catalog-coverage
  /api/admin/dashboard/activity-signals
  /api/admin/dashboard/alerts
  /api/admin/users
  /api/admin/vehicles
  /api/admin/models
  /api/admin/parts
  /api/admin/moderation/queue?key=parts
  /api/admin/imports
  /api/admin/audit-log
  /api/admin/team
  /api/admin/search?q=bm
)

curl_args=(-sS -o /dev/null -w "%{http_code}")
if [[ -n "$EMAIL" ]]; then
  curl_args+=(-H "x-mototwin-dev-user-email: $EMAIL")
fi

fail=0
echo "===== Pages ====="
for path in "${PAGES[@]}"; do
  code=$(curl "${curl_args[@]}" "$BASE$path")
  printf "GET %-46s → %s\n" "$path" "$code"
  [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]] || fail=$((fail+1))
done

echo
echo "===== APIs ====="
for path in "${APIS[@]}"; do
  code=$(curl "${curl_args[@]}" "$BASE$path")
  printf "GET %-46s → %s\n" "$path" "$code"
  [[ "$code" == "200" ]] || fail=$((fail+1))
done

echo
if (( fail == 0 )); then
  echo "✓ All admin endpoints responded successfully"
else
  echo "✗ $fail endpoint(s) returned an unexpected status"
  exit 1
fi
