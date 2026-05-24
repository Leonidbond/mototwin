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

For unstable local network/tunnel, clear cache:

```bash
npx expo start --tunnel -c
```

Important: do not run `npx expo` from monorepo root without workspace context, otherwise Expo may fail with `Unable to resolve module ../../App`.

## Mobile navigation (current)

- `apps/app/app/index.tsx` — mobile start page (landing) with CTA.
- `apps/app/app/garage.tsx` — garage dashboard (vehicles list, KPI, bottom nav).
- Main CTA on start page: `Перейти в гараж` -> `/garage`.

## Docs

- `docs/frontend-expo.md` — Expo routes, architecture, platform notes.
- `docs/frontend-web.md` — web client structure and behavior.
- `docs/garage-dashboard-mvp.md` — garage semantics and parity notes.

ssh root@195.24.71.143  

для обновления кода на сервере
sudo -iu deploy
cd /opt/mototwin/app/mototwin
git status
git pull origin main

для запуска мобилного в режиме туннеля

cd /Users/lbondarenko/Mototwin/mototwin/apps/app
npx expo start --tunnel -c