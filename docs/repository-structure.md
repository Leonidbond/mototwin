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
    use-is-narrow.ts        # client hook: matchMedia(max-width)
    use-sidebar-collapsed.ts# client hook: единое поведение GarageSidebar
    …                       # прочие web-only утилиты и доменные хелперы
```

Общие клиентские хуки `useIsNarrow` / `useSidebarCollapsed` используются страницами с «гаражным» хромом для адаптации к мобильным браузерам — см. `docs/frontend-web.md` §6 «Responsive layout».

## 4. Expo mobile application

```text
apps/app/
  app/                      # Expo Router routes only (thin screens)
    _layout.tsx
    index.tsx
    vehicles/new.tsx
    vehicles/[id]/index.tsx
    vehicles/[id]/service-log.tsx
    vehicles/[id]/service-events/new.tsx
    vehicles/[id]/state.tsx
    vehicles/[id]/profile.tsx
    vehicles/[id]/parts.tsx
    vehicles/[id]/wishlist/**
  components/               # shared RN UI used by routes (not router entries)
    expo-shell/
    vehicle-detail/
    vehicle-wishlist/
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
- canonical technical docs (architecture/model/api/frontend/shared); cross-platform notes in **`docs/parity/`**
- governance docs
- historical migration notes

Canonical index: `docs/README.md`.

Сводка последних крупных изменений (fitment, подборщик, миграции, иконки): [`docs/mototwin_recent_implementation_notes_ru.md`](./mototwin_recent_implementation_notes_ru.md).

## 8. Node tree design icons (catalog row PNGs)

```text
images/node-tree-icons-new/           # архив исходников из дизайна (не участвует в сборке)
images/node-tree-icons/from-design/   # by-label/<SECTION>/<CODE>.png — канонические PNG
images/node-tree-icons/nodes/         # копии для require() в приложении
scripts/data/node-code-icon-source.json
scripts/sync-node-icons-from-slices.mjs
scripts/generate-node-tree-icons-ts.mjs
src/node-tree-icons.ts                # сгенерировано
images/node-tree-icons/manifest.json  # сгенерировано
```

Подробнее: [`docs/node-tree-design-icons.md`](./node-tree-design-icons.md).
