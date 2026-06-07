# Email через SMTP (Reg.ru)

MotoTwin отправляет транзакционные письма через **SMTP хостинга Reg.ru**:

- сброс пароля (`POST /api/auth/forgot-password`);
- email-канал оповещений (cron → `dispatchPendingNotificationDeliveriesForUser`).

Реализация: [`src/lib/email/send-email.ts`](../src/lib/email/send-email.ts) (nodemailer).

## 1. Почтовый ящик

1. Домен **mototwin.space** — почта на [Reg.ru](https://www.reg.ru/) (хостинг / почта для домена).
2. Служебный ящик: **`reminder@mototwin.space`** (или другой).
3. Пароль ящика — значение **`SMTP_PASS`**.

Параметры SMTP Reg.ru (из кабинета):

| Переменная | Значение |
|------------|----------|
| `SMTP_HOST` | `mail.hosting.reg.ru` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |

## 2. Переменные окружения

```env
SMTP_HOST=mail.hosting.reg.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=reminder@mototwin.space
SMTP_PASS=<пароль ящика>
AUTH_EMAIL_FROM="MotoTwin <reminder@mototwin.space>"
```

Локальная копия (gitignore): `auth/mail_regru.txt`.

### Поведение без SMTP

| Среда | Поведение |
|-------|-----------|
| `NODE_ENV=development` без SMTP | Письма **не отправляются**, в лог `[email] dev skip send` |
| `NODE_ENV=production` без SMTP | **500** при forgot-password и FAILED для email-доставок |

## 3. Проверка

```bash
# Локально (SMTP в .env)
npx tsx scripts/qa-email-smtp-smoke.ts

# Другой получатель
TEST_EMAIL=you@example.com npx tsx scripts/qa-email-smtp-smoke.ts
```

После смены `.env` на VPS:

```bash
sudo systemctl restart mototwin
```

## 4. DNS

Настройте SPF/DKIM/DMARC для `mototwin.space` в панели Reg.ru — иначе письма могут попадать в спам.

## 5. Безопасность

- `SMTP_PASS` только в `.env`, не в git.
- При утечке — сменить пароль ящика в Reg.ru.
- В логах адреса маскируются (`r***r@domain`).

См. также: [deploy/vps.md](./deploy/vps.md), [security/threat-model.md](./security/threat-model.md) §4.3.
