# Shared Design Tokens (MVP)

## Why this exists

MotoTwin теперь поддерживает два клиента (Web + Expo).  
Чтобы улучшить parity без попытки сделать пиксель-идентичный UI, общая семантика статусов вынесена в отдельный пакет `@mototwin/design-tokens`.

Цель:
- единый источник truth для статусов (`OK`, `SOON`, `OVERDUE`, `RECENTLY_REPLACED`, `UNKNOWN`);
- минимизировать дублирование color/label mapping;
- сохранить платформенные различия рендеринга.

## What is shared

Пакет `packages/design-tokens` экспортирует:
- `statusSemanticTokens`:
  - `OK`
  - `SOON`
  - `OVERDUE`
  - `RECENTLY_REPLACED`
  - `UNKNOWN` (для `null`/unknown статуса)
- `productSemanticColors` — нейтральные поверхности, текст, границы, ошибки/primary CTA, **мягкий success** (`successSurface` / `successBorder` / `successText`, рядом с `successStrong`), **семантика журнала** (точка таймлайна SERVICE vs STATE_UPDATE, фон/бордер карточки, бейдж типа записи, оверлей модалки и др.)
- `statusTextLabelsRu`
- `statusBadgeLabelsEn`
- `spacingScale` (минимальный scale)
- `radiusScale` (минимальный scale)

## What remains platform-specific

- Web (Next.js):
  - Tailwind utility-классы, layout, typography, card structure;
  - локальный mapping токенов в inline style/class composition.
- Expo (React Native):
  - `StyleSheet`, Pressable states, platform-specific spacing and composition.

Токены задают **семантику**, а не полный UI-kit.

## Label ownership and business logic boundaries

- Текстовые label для статусов централизованы в `@mototwin/design-tokens`.
- `@mototwin/domain` использует эти label и сохраняет business-level helpers.
- Приоритет/агрегация/расчет статусов остаются в domain/backend логике, не в design tokens.

## Mapping guidance

### Web mapping (Tailwind + semantic tokens)

- Использовать токены для `backgroundColor`, `color`, `borderColor`.
- Tailwind-классы оставлять для размеров, layout, typographic style, интеракций.
- Не форсировать React Native-style API в web.

**Пример (журнал обслуживания на web, `src/app/vehicles/[id]/page.tsx`):**

- Импорт: `import { productSemanticColors, statusSemanticTokens } from "@mototwin/design-tokens"`.
- Оверлей модалки журнала: `style={{ backgroundColor: productSemanticColors.overlayModal }}` вместо произвольного `bg-black/45`.
- Вертикальная линия таймлайна: `backgroundColor: productSemanticColors.border`.
- Точка таймлайна: `timelineServiceBorder` / `timelineServiceFill` для сервиса, `timelineStateBorder` / `timelineStateFill` для обновления состояния (как на Expo).
- Карточка записи: `border` + `card` (сервис) или `cardMuted` (обновление состояния).
- Бейдж типа записи: `serviceBadgeBg` / `serviceBadgeText` / `indigoSoftBorder` (сервис); `divider` / `textMuted` / `borderStrong` (обновление состояния).
- Бейджи статуса узла в дереве по-прежнему из `statusSemanticTokens` через `background` / `color` / `borderColor` в inline style.

**Гараж (`src/app/garage/page.tsx`):** карточки списка, загрузка/пустое состояние, блок «Профиль эксплуатации», `InfoCard` / `SpecCard` — `border`, `card`, `cardMuted`, `chipBackground` / `borderStrong` / `textSecondary` для чипа «MotoTwin | Гараж» (layout-классы Tailwind сохранены).

**Карточка ТС — сообщения:** тексты ошибок форм/журнала/дерева/состояния — `color: productSemanticColors.error` вместо `text-red-600`; баннер успеха после добавления сервиса — `successSurface` / `successBorder` / `successText`.

Так web сохраняет Tailwind для отступов и скруглений, а **смысл цвета** совпадает с Expo.

### Expo mapping (React Native styles + semantic tokens)

- Использовать `statusSemanticTokens` в style objects (`backgroundColor`, `color`, accent).
- Локальные RN паттерны (`StyleSheet`, Pressable feedback, shadow) остаются в app.

## Why this improves parity

- Оба клиента читают одинаковые semantic status tokens.
- Снижается риск drift по цветовой семантике статусов.
- Изменения status-темы делаются в одном месте без backend изменений.
- UI при этом остается нативным для каждой платформы.

## Out of scope (intentional)

- Полноценная дизайн-система;
- shared component library;
- миграция всех UI цветов на токены в одном PR.
