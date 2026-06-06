# Деплой MotoTwin на VPS (закрытая бета)

Для агента Cursor: skill **mototwin-deploy** в `.cursor/skills/mototwin-deploy/` (SSH, пути, команды, чеклист).

## Требования

- Ubuntu 22.04/24.04, 2+ vCPU, **4 GB RAM минимум** (сборка Next.js с TypeScript нужна ~3–4 GB heap; `npm run build` задаёт `NODE_OPTIONS=--max-old-space-size=4096`)
- Домен с A-записью на IP сервера
- Node.js 22+, Docker, Nginx

## 1. Bootstrap сервера

```bash
# на VPS от root
sudo bash deploy/scripts/setup-vps.sh
```

Скопируйте SSH-ключ в `/home/deploy/.ssh/authorized_keys`, войдите как `deploy`.

## 2. PostgreSQL

```bash
sudo mkdir -p /opt/mototwin
echo 'POSTGRES_PASSWORD=your_strong_password' | sudo tee /opt/mototwin/.env
sudo chown deploy:deploy /opt/mototwin/.env
chmod 600 /opt/mototwin/.env

cd /opt/mototwin/app   # после git clone
docker compose -f deploy/docker-compose.prod.yml --env-file /opt/mototwin/.env up -d
```

## 3. Приложение

```bash
cd /opt/mototwin/app
cp .env.example .env
nano .env
```

Минимум в `/opt/mototwin/app/.env`:

```env
NODE_ENV=production
DATABASE_URL="postgresql://mototwin_app:YOUR_PASSWORD@127.0.0.1:5432/mototwin?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_BASE_URL="https://mototwin.online"
NEXTAUTH_URL="https://mototwin.online"
MOTOTWIN_BETA_ALLOWED_EMAILS="you@example.com,tester@example.com"
```

OAuth (web Google — см. [auth-oauth-production.md](../auth-oauth-production.md)):

```env
AUTH_GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"
```

Первый деплой:

```bash
npm ci
npx prisma migrate deploy
npm run db:seed   # только на пустой БД
npm run build
```

## 4. systemd

```bash
sudo cp deploy/systemd/mototwin.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mototwin
sudo systemctl start mototwin
```

## 5. Nginx + HTTPS

Конфиг `deploy/nginx/mototwin.conf` — production-ready: TLS Mozilla intermediate, HSTS, security headers, HTTP→HTTPS redirect, разумные таймауты и `client_max_body_size 16m` под admin-импорты (см. `MT-SEC-029`).

Замените `beta.mototwin.ru` в конфиге (3 места: оба `server_name` + закомментированные пути к сертификату), затем:

```bash
# 1. Первичная установка БЕЗ TLS — закомментируйте HTTPS server-блок
#    (`listen 443 ssl;` и всё ниже) на время первого запуска, чтобы nginx
#    не падал на отсутствующих сертификатах.
sudo cp deploy/nginx/mototwin.conf /etc/nginx/sites-available/mototwin
sudo ln -sf /etc/nginx/sites-available/mototwin /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot   # acme-challenge root
sudo nginx -t && sudo systemctl reload nginx

# 2. Выпустите сертификат. certbot --nginx сам отредактирует конфиг,
#    добавив `ssl_certificate` / `ssl_certificate_key` пути.
sudo certbot --nginx -d beta.mototwin.ru

# 3. Раскомментируйте HTTPS server-блок (если делали шаг 1) и перезагрузите:
sudo nginx -t && sudo systemctl reload nginx

# 4. Проверьте, что HSTS + headers доходят до клиента:
curl -sI https://beta.mototwin.ru/ | grep -iE 'strict-transport|x-frame|x-content-type|referrer|permissions-policy|cross-origin-opener'

# 5. Авто-обновление сертификата (certbot ставит systemd timer):
sudo systemctl status certbot.timer
```

Что важно проверить руками после установки:

- `curl -I http://beta.mototwin.ru/` отвечает `301 → https://...`.
- `curl -I https://beta.mototwin.ru/` возвращает заголовки `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- [Mozilla Observatory](https://observatory.mozilla.org/) для `beta.mototwin.ru` — минимум **B**, цель **A** (см. `MT-SEC-006`/`MT-SEC-047` — CSP появится отдельной итерацией).
- [SSL Labs](https://www.ssllabs.com/ssltest/) — минимум **A** (intermediate profile + TLS 1.2/1.3 give A out of the box).

## 6. Обновления

```bash
cd /opt/mototwin/app/mototwin
git pull origin main
bash deploy/scripts/deploy-app.sh
```

Скрипт `deploy-app.sh` после миграций запускает **`npm run db:seed:motorcycle`** — безопасный upsert каталога моделей из `prisma/seed-data/*-model-technical-master.csv` (все бренды). Полный `npm run db:seed` на проде не нужен, если БД уже с данными пользователей.

Только каталог моделей вручную:

```bash
npm run db:seed:motorcycle
```

## 7. Бэкапы

```bash
chmod +x deploy/scripts/backup.sh
# crontab -e (deploy):
# 0 3 * * * /opt/mototwin/app/deploy/scripts/backup.sh
```

## 8. Cron уведомлений

```bash
# crontab -e (deploy):
*/15 * * * * cd /opt/mototwin/app/mototwin && npx tsx scripts/cron-recalculate-all-users.ts >> /var/log/mototwin-cron.log 2>&1
```

## 8.1. Cron auth audit (`MT-SEC-055`)

Ежедневная очистка `auth_audit_logs` старше 90 дней и периодическая проверка всплесков `login.failure` (credential stuffing).

```bash
# crontab -e (deploy):
# Purge rows older than AUTH_AUDIT_RETENTION_DAYS (default 90) — once per day at 04:00
0 4 * * * cd /opt/mototwin/app/mototwin && npx tsx scripts/cron-auth-audit-retention.ts --purge-only >> /var/log/mototwin-cron.log 2>&1

# Alert on ≥10 failed logins per IP/user in the last minute — every 5 minutes
*/5 * * * * cd /opt/mototwin/app/mototwin && npx tsx scripts/cron-auth-audit-retention.ts --alerts-only >> /var/log/mototwin-cron.log 2>&1
```

Строки с префиксом `[auth-audit:alert]` в `/var/log/mototwin-cron.log` можно подхватить logwatch / Grafana Loki / email-on-grep.

Опциональные env: `AUTH_AUDIT_RETENTION_DAYS`, `AUTH_AUDIT_ALERT_FAILED_LOGIN_THRESHOLD`, `AUTH_AUDIT_ALERT_WINDOW_MS` (см. `.env.example`).

## 9. Expo

См. [expo-beta.md](./expo-beta.md) — сборки через EAS с `EXPO_PUBLIC_API_BASE_URL=https://ваш-домен`.

## 10. Чеклист беты

См. [beta-checklist.md](./beta-checklist.md).

## 11. Инцидент: `mototwin.dump` в git history (`MT-SEC-027`)

В коммите `85860f1` исторически попал файл `mototwin.dump` (≈119 KB) — Postgres-дамп локальной БД. В рабочем дереве файл **удалён из git index** (`git rm --cached mototwin.dump`) и добавлен в `.gitignore`, но **физически остаётся в истории** до тех пор, пока историю не перепишут.

### Шаги, которые НУЖНО сделать вручную (destructive, требуют согласования с командой)

1. **Оцените содержимое дампа.** Если в нём были любые продакшен-данные — PII, пароли, токены — считайте их скомпрометированными.

   ```bash
   git show 85860f1:mototwin.dump > /tmp/mototwin-history-dump
   file /tmp/mototwin-history-dump          # формат?
   strings /tmp/mototwin-history-dump | grep -iE 'password|secret|token|key|@'  | head -50
   ```

2. **Ротируйте все секреты**, которые могли попасть в дамп или были созданы до даты коммита `85860f1`:

   - `AUTH_SECRET` (`/opt/mototwin/app/.env`) — перегенерировать `openssl rand -base64 32`. **Последствие:** все active web-сессии и mobile refresh-токены инвалидируются → пользователи будут перелогиниваться.
   - `DATABASE_URL` / `POSTGRES_PASSWORD` (`/opt/mototwin/.env`) — поменять пароль роли `mototwin_app` в Postgres + обновить `.env` + перезапустить docker-compose и `mototwin.service`.
   - `RESEND_API_KEY` — revoke в Resend dashboard, выпустить новый.
   - `YANDEX_GEOCODER_API_KEY` — revoke в Yandex Console, выпустить новый.
   - `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`, `APPLE_CLIENT_ID`, `YANDEX_OAUTH_CLIENT_ID` — ревью, поменять при подозрении.
   - Пароли всех пользователей в дампе — форсированный `password_reset` (массовый `revokeAllSessionsForUser` + email).

3. **Перепишите git history** одним из инструментов:

   ```bash
   # Вариант A: git-filter-repo (рекомендуется, быстрее)
   pip install git-filter-repo
   git filter-repo --invert-paths --path mototwin.dump

   # Вариант B: BFG Repo-Cleaner
   bfg --delete-files mototwin.dump
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

4. **Force-push** на origin (требует координации со всеми, кто работает на ветке):

   ```bash
   git push --force-with-lease origin main
   # + любые активные ветки/PR
   ```

   После этого: все клоны репозитория **должны быть пересозданы** (`git clone` с нуля), иначе старая история «вернётся» при следующем pull.

5. **Зафиксируйте инцидент** в `docs/security/findings.md` под `MT-SEC-027` (поменяйте статус с `open` на `resolved` после ротации секретов + force-push).

> ⚠️ Шаги 3–4 я НЕ выполняю автоматически — это деструктивная операция, которую должен явно одобрить ответственный за репозиторий. Шаги 1–2 (ротация секретов) можно начинать прямо сейчас — они не зависят от rewrite history.
