#!/usr/bin/env bash
# Run on VPS as deploy from /opt/mototwin/app/mototwin after git pull.
set -euo pipefail

cd "$(dirname "$0")/../.."
echo "==> npm ci"
npm ci
echo "==> prisma migrate deploy"
npx prisma migrate deploy
echo "==> prisma generate"
npx prisma generate
echo "==> motorcycle catalog seed (upsert)"
npm run db:seed:motorcycle
echo "==> build"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
npm run build
echo "==> restart mototwin"
sudo systemctl restart mototwin
echo "Deploy complete."
