# Деплой MotoTwin на VPS (закрытая бета)

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
MOTOTWIN_BETA_ALLOWED_EMAILS="you@example.com,tester@example.com"
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

Замените `beta.mototwin.ru` в `deploy/nginx/mototwin.conf`, затем:

```bash
sudo cp deploy/nginx/mototwin.conf /etc/nginx/sites-available/mototwin
sudo ln -sf /etc/nginx/sites-available/mototwin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d beta.mototwin.ru
```

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
*/15 * * * * cd /opt/mototwin/app && npx tsx scripts/cron-recalculate-all-users.ts >> /var/log/mototwin-cron.log 2>&1
```

## 9. Expo

См. [expo-beta.md](./expo-beta.md) — сборки через EAS с `EXPO_PUBLIC_API_BASE_URL=https://ваш-домен`.

## 10. Чеклист беты

См. [beta-checklist.md](./beta-checklist.md).
