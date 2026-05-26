# MotoTwin deploy — reference

## Directory layout on VPS

```
/opt/mototwin/
  .env                    # Docker Postgres password (not app env)
  app/
    mototwin/             # git clone (monorepo root) ← deploy here
      .env                # Next.js / Prisma env
      deploy/
      prisma/
      src/
```

Verify if unsure:

```bash
systemctl show mototwin -p WorkingDirectory -p EnvironmentFile
```

## Production `.env` checklist (names only)

- `NODE_ENV=production`
- `DATABASE_URL`
- `AUTH_SECRET` (≥ 32 chars)
- `MOTOTWIN_BETA_ALLOWED_EMAILS`
- `AUTH_BASE_URL` (public URL)
- `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` must be **unset or false**

## Post-deploy smoke (with session)

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@mototwin.online","password":"..."}' \
  -c /tmp/mt.jar

curl -s -b /tmp/mt.jar http://127.0.0.1:3000/api/garage
curl -s -b /tmp/mt.jar "http://127.0.0.1:3000/api/expenses?year=2026&vehicleId=VEHICLE_ID"
```

Test accounts are created with `npx tsx scripts/seed-beta-test-users.ts` on server (passwords not stored in git).

## Nginx / TLS

Config template: `deploy/nginx/mototwin.conf` (domain `mototwin.online` on current server).

## Related npm scripts (local vs server)

| Script | Where |
|--------|--------|
| `npm run build` | production bundle |
| `npm run db:seed:motorcycle` | safe on prod |
| `npm run db:seed` | **local / empty DB only** |
| `bash deploy/scripts/backup.sh` | cron on VPS |
