# MotoTwin deploy — reference

Production host: **`mototwin-vps2`** → `https://mototwin.space`

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
ssh mototwin-vps2 'sudo systemctl show mototwin -p WorkingDirectory -p EnvironmentFile'
```

## Production `.env` checklist (names only)

- `NODE_ENV=production`
- `DATABASE_URL`
- `AUTH_SECRET` (≥ 32 chars)
- `MOTOTWIN_BETA_ALLOWED_EMAILS`
- `AUTH_BASE_URL` → `https://mototwin.space`
- `NEXTAUTH_URL` → `https://mototwin.space`
- OAuth: `AUTH_GOOGLE_*`, `GOOGLE_OAUTH_CLIENT_ID` — see [docs/auth-oauth-production.md](../../docs/auth-oauth-production.md); add redirect URI for `mototwin.space` in Google Console
- `MOTOTWIN_ENABLE_DEV_USER_SWITCHER` must be **unset or false**

## Post-deploy smoke (with session)

On server (`ssh mototwin-vps2`):

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@mototwin.online","password":"..."}' \
  -c /tmp/mt.jar

curl -s -b /tmp/mt.jar http://127.0.0.1:3000/api/auth/me
curl -s -b /tmp/mt.jar http://127.0.0.1:3000/api/garage
```

Public HTTPS check:

```bash
curl -sI https://mototwin.space/ | head -5
curl -s -o /dev/null -w "%{http_code}\n" https://mototwin.space/api/auth/me
```

Test accounts: `npx tsx scripts/seed-beta-test-users.ts` on server (passwords in script, not in git docs).

## Nginx / TLS

- Live config: `/etc/nginx/sites-enabled/mototwin` on vps2
- Template: `deploy/nginx/mototwin.conf` — replace domain with `mototwin.space` before fresh install
- Cert: `sudo certbot --nginx -d mototwin.space --redirect`
- Renew: `certbot.timer` (systemd)

## SSH access summary

| Role | User | How |
|------|------|-----|
| Deploy agent / admin | `lbondarenko` | `ssh mototwin-vps2` |
| App, git, npm, docker | `deploy` | `sudo -u deploy bash -c 'cd /opt/mototwin/app/mototwin && ...'` |
| systemd / nginx | `lbondarenko` | `sudo systemctl restart mototwin` |

## Related npm scripts (local vs server)

| Script | Where |
|--------|--------|
| `npm run build` | production bundle |
| `npm run db:seed:motorcycle` | safe on prod |
| `npm run db:seed` | **local / empty DB only** |
| `bash deploy/scripts/backup.sh` | cron on VPS |

## Legacy

Old production: `mototwin-vps` (`195.24.71.143`, `mototwin.online`). Do not use for deploy unless explicitly requested.
