---
name: mototwin-deploy
description: Deploy MotoTwin to production VPS via SSH — git pull, Prisma migrate, build, systemd restart. Use when the user asks to deploy, update the server, release to production, mototwin.online, VPS, or says «деплой».
---

# MotoTwin production deploy

## Server facts (canonical)

| Item | Value |
|------|--------|
| Host | `195.24.71.143` |
| SSH alias | `mototwin-vps` (configure in `~/.ssh/config`) |
| App user | `deploy` (runs app + git) |
| Root | initial admin / `systemctl restart` |
| **App root** | `/opt/mototwin/app/mototwin` |
| Branch | `main` |
| Remote | `origin` |
| Public site | `https://mototwin.online` |
| systemd unit | `mototwin` |
| Env file | `/opt/mototwin/app/mototwin/.env` |

Repo docs: [docs/deploy/vps.md](../../docs/deploy/vps.md)

## SSH config (user machine)

```sshconfig
Host mototwin-vps
    HostName 195.24.71.143
    User root
    IdentityFile ~/.ssh/mototwin_vps
    IdentitiesOnly yes
```

Prefer key auth. For app commands, run as `deploy` via `sudo -u deploy`.

First-time git on server:

```bash
sudo -u deploy git config --global --add safe.directory /opt/mototwin/app/mototwin
```

## Agent workflow

1. **Local**: ensure changes are on `main` (`git push origin main`). Do not commit unless the user asked.
2. **SSH**: use `required_permissions: ["all"]` for deploy commands.
3. **Deploy** (remote):

```bash
ssh -o BatchMode=yes -o ServerAliveInterval=30 mototwin-vps 'bash -s' <<'REMOTE'
set -euo pipefail
APP=/opt/mototwin/app/mototwin
cd "$APP"
sudo -u deploy git config --global --add safe.directory "$APP" 2>/dev/null || true
sudo -u deploy git pull origin main
sudo -u deploy bash -c "cd $APP && export NODE_OPTIONS=--max-old-space-size=4096 && npm ci && npx prisma migrate deploy && npx prisma generate && npm run db:seed:motorcycle && npm run build"
systemctl restart mototwin
sleep 2
systemctl is-active mototwin
REMOTE
```

4. **Smoke test** (logged-in API):

```bash
ssh mototwin-vps 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/auth/me'
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
| Build | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` | needs ~4 GB RAM |
| Run | `systemctl restart mototwin` | **root**; `npm run start` |

Do **not** run full `npm run db:seed` on production unless the user explicitly wants a fresh empty DB.

## In-repo script

From server app root (as `deploy`):

```bash
cd /opt/mototwin/app/mototwin
git pull origin main
bash deploy/scripts/deploy-app.sh   # needs passwordless sudo for deploy → restart
```

If `sudo` inside script fails, run `systemctl restart mototwin` as root after build.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `Permission denied (publickey)` | User must fix `~/.ssh/config` / key on Mac |
| `dubious ownership` | `git config --global --add safe.directory` for deploy |
| Build OOM | confirm `free -h`; keep `NODE_OPTIONS=4096`; add swap |
| Build OK, old UI | `systemctl restart mototwin`; hard refresh browser |
| Prisma field errors | `npx prisma migrate deploy` + `prisma generate` + restart |
| 401 on site after login | login via `/api/auth/login` (not NextAuth credentials only) |

Logs: `journalctl -u mototwin -n 80 --no-pager`

## Security

- Never print `.env`, `AUTH_SECRET`, or passwords in chat.
- Do not commit secrets or paste test-account tables into the repo README.
