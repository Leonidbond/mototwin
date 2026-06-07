---
name: mototwin-deploy
description: Deploy MotoTwin to production VPS via SSH — git pull, Prisma migrate, build, systemd restart. Use when the user asks to deploy, update the server, release to production, mototwin.space, mototwin.online, VPS, mototwin-vps2, or says «деплой».
---

# MotoTwin production deploy

## Server facts (canonical — production)

| Item | Value |
|------|--------|
| Host | `158.160.161.173` |
| SSH alias | `mototwin-vps2` (configure in `~/.ssh/config`) |
| SSH login | `lbondarenko` (admin via `sudo`) |
| App user | `deploy` (runs app + git + docker compose) |
| **App root** | `/opt/mototwin/app/mototwin` |
| Branch | `main` |
| Remote | `origin` |
| Public site | `https://mototwin.space` |
| systemd unit | `mototwin` |
| App env | `/opt/mototwin/app/mototwin/.env` |
| Postgres env | `/opt/mototwin/.env` |
| TLS | Let's Encrypt `/etc/letsencrypt/live/mototwin.space/` |

Repo docs: [docs/deploy/vps.md](../../docs/deploy/vps.md)

## Legacy server (retired — do not deploy here unless user asks)

| Item | Value |
|------|--------|
| SSH alias | `mototwin-vps` |
| Host | `195.24.71.143` |
| Public site (was) | `https://mototwin.online` |
| SSH login | `root` |

## SSH config (user machine)

```sshconfig
Host mototwin-vps2
    HostName 158.160.161.173
    User lbondarenko
    IdentityFile ~/.ssh/mototwin_vps2
    IdentitiesOnly yes
    AddKeysToAgent yes
    UseKeychain yes

Host mototwin-vps
    HostName 195.24.71.143
    User root
    IdentityFile ~/.ssh/mototwin_vps
    IdentitiesOnly yes
```

Prefer key auth. App/git/docker commands: `sudo -u deploy`. `systemctl` / nginx / certbot: `sudo` as `lbondarenko`.

First-time git on server:

```bash
sudo -u deploy git config --global --add safe.directory /opt/mototwin/app/mototwin
```

## Agent workflow

1. **Local**: ensure changes are on `main` (`git push origin main`). Do not commit unless the user asked.
2. **SSH**: use `required_permissions: ["all"]` for deploy commands. Target **`mototwin-vps2`**.
3. **Deploy** (remote):

```bash
ssh -o BatchMode=yes -o ServerAliveInterval=30 mototwin-vps2 'bash -s' <<'REMOTE'
set -euo pipefail
APP=/opt/mototwin/app/mototwin
cd "$APP"
sudo -u deploy git config --global --add safe.directory "$APP" 2>/dev/null || true
sudo -u deploy git pull origin main
sudo -u deploy bash -c "cd $APP && export NODE_OPTIONS=--max-old-space-size=4096 && npm ci && npx prisma migrate deploy && npx prisma generate && npm run db:seed:motorcycle && npm run build"
sudo systemctl restart mototwin
sleep 2
sudo systemctl is-active mototwin
REMOTE
```

4. **Smoke test**:

```bash
ssh mototwin-vps2 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/auth/me'
# expect 401 without cookie

ssh mototwin-vps2 'curl -s -o /dev/null -w "%{http_code}\n" https://mototwin.space/api/auth/me'
# expect 401 without cookie
```

Optional: login as test user and hit a changed endpoint — see [reference.md](reference.md).

5. Report commit SHA (`git rev-parse --short HEAD` on server) and `systemctl is-active mototwin`.

## What each step does

| Step | Command | Notes |
|------|---------|--------|
| Dependencies | `npm ci` | clean install |
| DB schema | `npx prisma migrate deploy` | never `migrate dev` on prod |
| Client | `npx prisma generate` | after schema change |
| Motorcycle catalog | `npm run db:seed:motorcycle` | idempotent upsert CSVs |
| Build | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` | needs ~4 GB RAM; swap 4G on vps2 |
| Run | `sudo systemctl restart mototwin` | as `lbondarenko`; `npm run start` as `deploy` |

Do **not** run full `npm run db:seed` on production unless the user explicitly wants a fresh empty DB.

Beta test users (passwords): `npx tsx scripts/seed-beta-test-users.ts` — only when user asks.

## In-repo script

From server app root (as `deploy`):

```bash
cd /opt/mototwin/app/mototwin
git pull origin main
bash deploy/scripts/deploy-app.sh   # restart step may need: sudo systemctl restart mototwin
```

If `sudo` inside script fails for `deploy`, run `sudo systemctl restart mototwin` as `lbondarenko` after build.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `Permission denied (publickey)` | User must fix `~/.ssh/config` / key on Mac |
| `dubious ownership` | `git config --global --add safe.directory` for deploy |
| Build OOM | confirm `free -h`; keep `NODE_OPTIONS=4096`; swap at `/swapfile` |
| Build OK, old UI | `sudo systemctl restart mototwin`; hard refresh browser |
| Prisma field errors | `npx prisma migrate deploy` + `prisma generate` + restart |
| 401 on `/api/auth/me` without cookie | **expected** — not logged in |
| 401 on site after login | login via `/api/auth/login` (not NextAuth credentials only) |
| certbot fails | check A → `158.160.161.173`; **no AAAA** to old host; both reg.ru NS agree |

Logs: `ssh mototwin-vps2 'sudo journalctl -u mototwin -n 80 --no-pager'`

## Security

- Never print `.env`, `AUTH_SECRET`, or passwords in chat.
- Do not commit secrets or paste test-account tables into the repo README.
