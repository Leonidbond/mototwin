#!/usr/bin/env bash
# Daily Postgres backup. Cron: 0 3 * * * /opt/mototwin/app/deploy/scripts/backup.sh
set -euo pipefail

BACKUP_DIR="${MOTOTWIN_BACKUP_DIR:-/opt/mototwin/backups}"
CONTAINER="${MOTOTWIN_PG_CONTAINER:-mototwin-postgres}"
DB_USER="${MOTOTWIN_PG_USER:-mototwin_app}"
DB_NAME="${MOTOTWIN_PG_DB:-mototwin}"

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/mototwin_${STAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"
find "$BACKUP_DIR" -name 'mototwin_*.sql.gz' -mtime +14 -delete

echo "Backup written: $OUT"
