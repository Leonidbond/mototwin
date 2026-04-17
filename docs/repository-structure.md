# MotoTwin Repository Structure

## 1. Scope

Документ фиксирует текущую структуру репозитория и назначение ключевых директорий.

## 2. Top-level structure

```text
mototwin/
  apps/
    app/                    # Expo mobile client
  docs/                     # project documentation
  packages/                 # shared packages (types/domain/api-client)
  prisma/                   # schema, migrations, seed
  public/                   # static web assets
  src/                      # Next.js web app + backend routes
```

## 3. Web application

```text
src/
  app/
    page.tsx                # landing
    onboarding/page.tsx     # web add motorcycle flow
    garage/page.tsx         # garage list
    vehicles/[id]/page.tsx  # vehicle operational page
    api/**/route.ts         # backend API handlers
  lib/
    prisma.ts               # shared Prisma client setup
```

## 4. Expo mobile application

```text
apps/app/
  app/
    _layout.tsx
    index.tsx
    vehicles/new.tsx
    vehicles/[id]/index.tsx
    vehicles/[id]/service-log.tsx
    vehicles/[id]/service-events/new.tsx
    vehicles/[id]/state.tsx
    vehicles/[id]/profile.tsx
  src/
    api-base-url.ts         # backend base URL resolution for Expo
```

## 5. Shared packages

```text
packages/
  types/
    src/                    # shared DTO/types contracts
  domain/
    src/                    # shared pure business helpers
  api-client/
    src/                    # shared typed API client
```

## 6. Data layer

```text
prisma/
  schema.prisma
  migrations/**
  seed.ts
```

- `schema.prisma` defines current source-of-truth data model.
- Migrations capture schema history.
- `seed.ts` initializes demo/reference data.

## 7. Documentation

`docs/` contains:
- canonical technical docs (architecture/model/api/frontend/shared/parity)
- governance docs
- historical migration notes

Canonical index: `docs/README.md`.
