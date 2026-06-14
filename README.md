# MotoTwin

MotoTwin is a monorepo with:
- web app on Next.js (`src/app/**`);
- mobile app on Expo + Expo Router (`apps/app/app/**`);
- shared packages for domain logic, API contracts and UI tokens (`packages/**`).

## Local run

From repo root:

```bash
npm ci
npm run dev
```

Web will be available at [http://localhost:3000](http://localhost:3000).

## Mobile (Expo)

Project path: `apps/app`.

Run from root:

```bash
npm run mobile:dev
```

Or from `apps/app`:

```bash
npx expo start
```

Important: do not run `npx expo` from monorepo root without workspace context, otherwise Expo may fail with `Unable to resolve module ../../App`.

In a second terminal, start the web API for local data: `npm run dev` (port 3000).

**Build release APK, EAS, env vars, adb:** [`docs/mobile-build.md`](docs/mobile-build.md).

## Mobile navigation (current)

- `apps/app/app/index.tsx` — mobile start page (landing) with CTA.
- `apps/app/app/garage.tsx` — garage dashboard (vehicles list, KPI, bottom nav).
- Main CTA on start page: `Перейти в гараж` -> `/garage`.

## Docs

- [`docs/README.md`](docs/README.md) — индекс документации
- [`docs/subscription-access-mvp.md`](docs/subscription-access-mvp.md) — тарифы FREE / RIDER / PRO (реализовано)
- [`docs/frontend-expo.md`](docs/frontend-expo.md) — Expo routes, architecture, platform notes
- [`docs/mobile-build.md`](docs/mobile-build.md) — сборка и запуск мобильного приложения (Metro, APK, EAS)
- [`docs/frontend-web.md`](docs/frontend-web.md) — web client structure and behavior
- [`docs/user-settings-mvp.md`](docs/user-settings-mvp.md) — настройки профиля
- [`docs/custom-top-nodes-mvp.md`](docs/custom-top-nodes-mvp.md) — персональный ТОП узлов и вид дерева
- [`docs/garage-dashboard-mvp.md`](docs/garage-dashboard-mvp.md) — garage semantics and parity notes
- [`docs/parity/cross-platform-parity.md`](docs/parity/cross-platform-parity.md) — web ↔ Expo parity matrix
- [`docs/mototwin_recent_implementation_notes_ru.md`](docs/mototwin_recent_implementation_notes_ru.md) — сводка недавних изменений UI/API (§10 — навигация 2026-06)

## Production deploy (VPS2)

Канонический прод: **`https://mototwin.space`**, SSH-алиас **`mototwin-vps2`** (`158.160.161.173`, пользователь `lbondarenko`, приложение от `deploy`).

```bash
# ~/.ssh/config — см. .cursor/skills/mototwin-deploy/SKILL.md
ssh mototwin-vps2

# ручное обновление кода (полный деплой — через skill / deploy-app.sh)
sudo -u deploy bash -c 'cd /opt/mototwin/app/mototwin && git pull origin main'
sudo systemctl restart mototwin
```

В чате: «деплой», «обнови прод» — агент подхватит skill **mototwin-deploy** (target `mototwin-vps2`).

Legacy (не деплоить): `mototwin-vps` / `195.24.71.143` / `mototwin.online`.

Подробнее: [`.cursor/skills/mototwin-deploy/SKILL.md`](.cursor/skills/mototwin-deploy/SKILL.md), [`docs/deploy/vps.md`](docs/deploy/vps.md).

для запуска мобилного в режиме туннеля

cd /Users/lbondarenko/Mototwin/mototwin/apps/app
npx expo start --tunnel -c

пользователь локально
URL:      /login
Email:    demo@mototwin.local
Пароль:   demo12345
