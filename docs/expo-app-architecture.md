# MotoTwin Expo App Architecture (Target)

## Цель документа

Зафиксировать практическую целевую архитектуру Expo-приложения MotoTwin до начала активной реализации экранов.  
Документ описывает **target state**, а не уже завершенную работу.

Базовые вводные текущего состояния:
- web MVP уже работает на Next.js + Prisma + PostgreSQL;
- ключевые продуктовые потоки уже есть: garage, vehicle detail, node status, service log, update state, edit profile;
- backend API контракты уже используются фронтендом и на первом этапе миграции остаются без изменений.

## Архитектурные принципы

1. **Expo-first UI**: основной клиентский опыт строится в `apps/app` (Expo Router).
2. **Shared domain-first**: типы, API-контракты и бизнес-логика выносятся в `packages/*`.
3. **Platform-specific presentation**: UI-композиция и навигация остаются в приложении.
4. **Поэтапный перенос**: сначала core flow, затем расширение parity.
5. **Без изменения backend-контрактов на старте**: минимизация рисков регрессий.

## Рекомендуемая структура Expo приложения

```text
apps/
  app/
    app/                        # Expo Router routes
      _layout.tsx
      (auth)/
        sign-in.tsx
      (main)/
        garage/
          index.tsx
        vehicle/
          [id]/
            index.tsx
            nodes.tsx
            service-log.tsx
            add-service-event.tsx
            update-state.tsx
            edit-profile.tsx
    src/
      screens/                  # Локальные screen containers (по route-модулям)
      features/                 # Локальные UI-фичи (forms, sections, cards)
      components/               # Базовые app-specific UI blocks
      hooks/                    # App-level hooks (navigation helpers, screen wiring)
      providers/                # Session/app providers
      utils/                    # Локальные утилиты презентации (не domain)

packages/
  types/                        # DTO, API response types, shared enums
  api-client/                   # typed API calls to existing backend endpoints
  domain/                       # pure business logic / formatters / calculators
  design-tokens/                # optional shared tokens
```

### Почему так
- Expo Router структура в `app/` дает предсказуемую навигацию и deeplink-friendly path model.
- `src/screens` и `src/features` позволяют не перегружать route-файлы.
- `packages/*` фиксируют shared границы и снижают дублирование между mobile/web.

## Routes / screens (первый мобильный контур)

Ниже минимальный набор экранов для первого mobile ownership workflow:

1. **Garage**  
   Route: `/(main)/garage/index`  
   Назначение: список мотоциклов пользователя, вход в карточку мотоцикла.

2. **Vehicle detail**  
   Route: `/(main)/vehicle/[id]/index`  
   Назначение: профиль мотоцикла, текущие статусы top nodes, вход в дочерние сценарии.

3. **Node tree**  
   Route: `/(main)/vehicle/[id]/nodes`  
   Назначение: дерево узлов, статусы и переход к деталям обслуживания по узлам.

4. **Service log**  
   Route: `/(main)/vehicle/[id]/service-log`  
   Назначение: timeline истории, фильтры/sort, чтение maintenance истории.

5. **Add service event**  
   Route: `/(main)/vehicle/[id]/add-service-event`  
   Назначение: добавление сервисного события (service type, node, odometer, cost, comment).

6. **Update state**  
   Route: `/(main)/vehicle/[id]/update-state`  
   Назначение: обновление operational состояния (пробег/моточасы).

7. **Edit profile**  
   Route: `/(main)/vehicle/[id]/edit-profile`  
   Назначение: редактирование профиля мотоцикла (nickname, VIN, ride profile).

## Модель навигации

## Navigation model

Рекомендуемая модель:
- root layout с разделением на `(auth)` и `(main)` группы;
- внутри `(main)` стек/сегменты вокруг контекста `vehicle/[id]`;
- service-flow экраны (`service-log`, `add-service-event`, `update-state`, `edit-profile`) как явные route-entrypoints, а не глубоко вложенные модалки.

Практические правила:
- переходы между экранами через параметры route (`vehicleId`) как источник контекста;
- после успешных мутаций использовать predictable return path (например обратно в `service-log` или `vehicle detail`);
- не смешивать навигационную ответственность с API-логикой (навигация в screen layer, API в packages/api-client).

## Модель загрузки данных

## Data loading model

Подход для MVP:
- загрузка данных на уровне screen container;
- вызовы API только через `packages/api-client`;
- типизация payload/response через `packages/types`;
- форматирование/derived-данные через `packages/domain`;
- явные состояния `loading / error / empty / success` на каждом экране.

Рекомендации по потокам:
- `garage` грузит список мотоциклов;
- `vehicle detail` грузит карточку + top-level status snapshot;
- `service-log` грузит события и применяет фильтры/sort локально по текущим требованиям продукта;
- мутации (`add-service-event`, `update-state`, `edit-profile`) после успеха инициируют refresh релевантных экранов.

Важно:
- не дублировать fetch-логику в UI-компонентах;
- не выносить network side effects в `domain` пакет;
- сохранять parity с текущими backend endpoint-ами.

## Границы state management

## State management boundaries

Разделение ответственности:

1. **Route/screen state (local)**  
   Локальный UI-state: поля форм, локальные toggles, modal visibility, временные фильтры.

2. **Server data state (screen-bound)**  
   Загруженные сущности экрана (garage list, vehicle detail, service log entries).  
   Источник истины: backend API.

3. **Session/app-wide state (provider level)**  
   Аутентификация, базовые app flags, user context.

4. **Shared domain state (pure functions only)**  
   В `packages/domain` не храним mutable app state; только чистые функции и вычисления.

Ограничения:
- не строить "глобальный store для всего" на раннем этапе;
- сначала стабилизировать screen-driven модель с четкими границами.

## Использование shared packages

### packages/types
- типы сущностей MotoTwin: `Vehicle`, `ServiceEvent`, `NodeStatus`, `RideProfile` и т.д.;
- типы API ответов/ошибок;
- enums/union-типы eventKind/status.

### packages/api-client
- функции вызова существующих endpoint-ов (garage, vehicles, service events, profile/state updates);
- единая обработка HTTP/ошибок/базовых headers;
- без UI-зависимостей.

### packages/domain
- форматтеры дат/чисел/лейблов статусов;
- вспомогательные вычисления для service log timeline/grouping/summaries;
- правила отображения доменных состояний без привязки к React Native компонентам.

### Локальная UI-композиция в Expo app
- route-файл подключает screen container;
- screen container orchestrates data + actions;
- feature/components слой отвечает за presentation и интеракции;
- domain/api/types не импортируют UI-слой.

## Что не нужно шарить слишком рано

## What should not be shared too early

Не выносить в shared-пакеты на старте:
- platform-specific navigation helpers;
- platform-specific UI-компоненты (RN touch patterns, bottom sheets, modal presentation);
- стили и layout-решения, завязанные на конкретную платформу;
- временные эксперименты UX до стабилизации поведения.

Почему:
- преждевременное shared-абстрагирование усложняет скорость итераций;
- сначала фиксируем стабильный domain/API фундамент, затем постепенно шарим presentation-слой там, где это реально окупается.

## Привязка к текущим MotoTwin flow

Архитектура ориентирована на уже существующие рабочие сценарии MVP:
- garage как входная точка;
- vehicle detail как центр контекста мотоцикла;
- node tree и service log как основной maintenance контур;
- add service event и update state как ключевые "операционные" действия;
- edit profile как управление идентичностью и параметрами использования мотоцикла.

Таким образом, мобильный клиент повторяет текущую продуктовую логику, но оптимизируется под mobile-first UX без изменения backend поведения.
