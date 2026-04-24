# Documentation Gap Analysis

## Scope and method

Анализ выполнен по фактическому состоянию кода:
- `prisma/schema.prisma`
- `src/app/api/**`
- `src/app/**`
- `apps/app/app/**`
- `packages/types`, `packages/domain`, `packages/api-client`
- текущий `docs/**`

Цель: зафиксировать, какие документы актуальны, где есть устаревание, и что нужно обновить в первую очередь.

## Current docs assessment

### Accurate (usable with minor edits)

- `docs/data-model.md`
  - Почему: корректно отражает текущие модели Prisma, enum, связи, Node/ServiceEvent/NodeState/NodeMaintenanceRule/TopNodeState.
  - Что сделать: обновить формулировки под двухклиентную архитектуру и убрать дубли/ограничения, которые уже закрыты.

- `docs/api-backend.md`
  - Почему: в целом соответствует реализованным route handlers и validation/business rules.
  - Что сделать: синхронизировать с текущим scope (web + Expo), зафиксировать `PATCH /api/vehicles/[id]/profile`, роль legacy `top-nodes`.

- `docs/functional-logic.md`
  - Почему: верно описывает leaf-правила, агрегирование `effectiveStatus`, связь service events и state updates.
  - Что сделать: добавить cross-platform usage и привязку к shared packages.

- `docs/node-tree.md`
  - Почему: полезен как таксономический reference.
  - Что сделать: явно пометить как справочник по дереву узлов, а не основной архитектурный документ.

### Partially outdated

- `docs/technical-overview.md`
  - Проблема: документ центрирован вокруг web/Next monolith и не описывает Expo + shared packages как текущую реальность.
  - Почему важно: вводит в заблуждение при планировании новых задач.
  - Действие: обновить как единый технический overview web + Expo + shared.

- `docs/README.md`
  - Проблема: индекс не отражает полный и актуальный набор документов, не разделяет «основные» и «исторические» артефакты.
  - Почему важно: высокая стоимость навигации и риск выбора устаревшего doc.
  - Действие: переписать индекс и выделить canonical docs.

- legacy bootstrap / migration docs раннего этапа
  - Проблема: часть ранних planning/bootstrap артефактов быстро устаревает и начинает конфликтовать с фактической route-структурой и текущим shared reuse.
  - Почему важно: такие документы нужно либо архивировать, либо удалять после переноса итогового знания в canonical docs.
  - Действие: не использовать как source of truth; переносить итог в `frontend-expo.md`, `shared-packages.md`, `technical-overview.md`.

### Fully outdated / misleading as primary docs

- legacy frontend snapshots
  - Проблема: старые frontend snapshots быстро расходятся с current-state docs по web/Expo.
  - Почему важно: сейчас есть отдельные canonical docs `frontend-web.md` и `frontend-expo.md`.
  - Действие: хранить только как архивный контекст либо удалять после переноса значимого содержимого.

- `docs/project.md`
  - Проблема: содержит большой объем product-scope и API/modules, которые не реализованы (auth, fitment engine, expenses module, subscription flows и др.).
  - Почему важно: сильный риск считать несуществующее реализованным.
  - Действие: репозиционировать как historical product brief (не source of truth для реализации).

- `docs/node-status.md`
  - Проблема: смешивает планируемое и реализованное; формат не соответствует текущему набору canonical docs.
  - Почему важно: дублирует и размывает source-of-truth по статусной логике.
  - Действие: пометить как historical working notes, основной источник — `functional-logic.md`.

### Missing key documentation areas

1. **Repository structure (current)**
- Что отсутствует: отдельный актуальный обзор структуры монорепо.
- Почему важно: ускоряет onboarding и локализацию изменений.
- Нужный doc: `docs/repository-structure.md`.

2. **Separate frontend docs by client surface**
- Что отсутствует: явное разделение web vs Expo с route/screen inventory и flow-мэппингом.
- Почему важно: снижает путаницу и упрощает parity planning.
- Нужные docs: `docs/frontend-web.md`, `docs/frontend-expo.md`.

3. **Shared packages overview**
- Что отсутствует: актуальная спецификация `packages/types|domain|api-client` и границ шаринга.
- Почему важно: предотвращает дублирование и silent logic fork.
- Нужный doc: `docs/shared-packages.md`.

4. **Cross-platform parity status**
- Что отсутствует: единая фиксация «что уже выровнено», «что частично», «что различается».
- Почему важно: при двух клиентах parity must be explicit.
- Нужный doc: `docs/cross-platform-parity.md`.

## Gap matrix by required area

### Architecture
- Статус: **partial**.
- Gap: нет единого актуального документа web + Expo + shared + backend + Prisma.
- Fix: обновить `technical-overview.md`, добавить `repository-structure.md`.

### Repository structure
- Статус: **missing**.
- Gap: нет canonical структуры репозитория.
- Fix: `repository-structure.md`.

### Prisma data model
- Статус: **mostly accurate**.
- Gap: требуется синхронизация формулировок с текущей cross-platform подачей.
- Fix: обновить `data-model.md`.

### Backend/API
- Статус: **mostly accurate**.
- Gap: требуются точечные уточнения и выравнивание терминологии.
- Fix: обновить `api-backend.md`.

### Web frontend
- Статус: **partial/outdated as standalone truth**.
- Gap: нет отдельного canonical документа под web как один из двух клиентов.
- Fix: поддерживать `frontend-web.md` как canonical doc по web-клиенту.

### Expo frontend
- Статус: **fragmented across task docs**.
- Gap: нет одного актуального canonical docs по экранам/flow.
- Fix: `frontend-expo.md`.

### Shared packages
- Статус: **bootstrap-only docs**.
- Gap: нет текущего shared contracts обзора.
- Fix: `shared-packages.md` использовать как canonical обзор shared слоя; bootstrap-артефакты не использовать как source of truth.

### Business logic
- Статус: **good but needs consolidation**.
- Gap: часть логики размазана между `functional-logic.md` и legacy notes.
- Fix: обновить `functional-logic.md`, перевести `node-status.md` в historical.

### Cross-platform parity
- Статус: **missing**.
- Gap: нет централизованной матрицы parity web vs Expo.
- Fix: `cross-platform-parity.md`.

## Recommended documentation update plan

### Highest priority
1. `docs/README.md` — canonical index and ownership.
2. `docs/technical-overview.md` — single source of architecture truth.
3. `docs/frontend-web.md` + `docs/frontend-expo.md` — clear client separation.
4. `docs/cross-platform-parity.md` — explicit parity state.
5. `docs/repository-structure.md` — navigation baseline.

### Secondary priority
1. `docs/api-backend.md` — contract and business rules sync.
2. `docs/data-model.md` — model consistency refresh.
3. `docs/shared-packages.md` — shared boundaries and reuse map.
4. `docs/functional-logic.md` — consolidated business behavior.

### Nice-to-have
1. Historical docs cleanup and explicit status annotations.
2. Регулярный parity-check checklist для новых feature docs.
3. Миграция старых step-by-step Expo заметок в «archive/notes» формат (без претензии на canonical status).
