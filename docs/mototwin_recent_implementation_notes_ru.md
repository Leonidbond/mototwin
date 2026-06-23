# Зафиксированные шаги реализации (сводка)

Документ описывает **уже внесённые в репозиторий** изменения по ветке работ: community fitment, подбор деталей, отчёты, иконки дерева узлов, сопутствующие правки API и мобильного клиента. Страница «Итоговый отчёт по совместимости» опирается на [mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) и **`GET .../part-compatibility-report`**; детальное соответствие всем пунктам спеки v1.1 при необходимости доводится отдельно.

**Шаблоны журнала (ADVANCED) и комплекты в подборе** (`includeInPartPicker`, коды `user_template:`, UI web/Expo) вынесены в отдельный документ: [mototwin_user_template_service_kits_implementation_ru.md](mototwin_user_template_service_kits_implementation_ru.md).

## 0. Расходы — категория «Топливо» (2026-06-23)

- Enum **`FUEL`** в `ExpenseCategory` (Prisma + `EXPENSE_CATEGORIES` в `packages/types/src/expense-item.ts`).
- Подпись **«Топливо»**, хелперы `getDefaultExpenseInstallStatusForCategory` / `expenseCategoryRequiresNode` — `packages/domain/src/expense-summary.ts`.
- API: `POST/PATCH /api/expenses` нормализует `FUEL` → `nodeId: null`, `installStatus: NOT_APPLICABLE`.
- UI: web `ExpensesPageClient`, Expo `vehicles/[id]/expenses` — chip/select «Топливо», авто-статус «Не требует установки».
- Документация: [expense-tracking-mvp.md](expense-tracking-mvp.md), [data-model.md](data-model.md).
- Миграция: `prisma/migrations/20260623120000_add_expense_category_fuel`.

## 1. Данные и Prisma

- Модели и перечисления для **PartMaster**, **FitmentReport**, **FitmentVote**, **FitmentEvidence**, **FitmentConfidence**, статусы wishlist (в т.ч. `REJECTED`) — в [prisma/schema.prisma](../prisma/schema.prisma).
- Миграции в [prisma/migrations/](../prisma/migrations/) (включая `part_master_community_fitment`, `fitment`, `part_wishlist_status_rejected` и др. по состоянию репозитория).
- Сиды и вспомогательные скрипты: [prisma/seed.ts](../prisma/seed.ts), [prisma/backfill-part-masters.ts](../prisma/backfill-part-masters.ts).

## 2. Домен и типы

- Общие типы совместимости: [packages/types/src/fitment-community.ts](../packages/types/src/fitment-community.ts).
- У **PartSku** / **PartRecommendationViewModel** добавлено поле **`partMasterId`** для связки с отчётами и агрегатами: [packages/types/src/part-catalog.ts](../packages/types/src/part-catalog.ts), [packages/types/src/part-recommendation.ts](../packages/types/src/part-recommendation.ts).
- В компактном блоке **`WishlistItemSkuInfo`** (ответ wishlist API) тоже отдаётся **`partMasterId`** — для панели деталей корзины и ссылки на отчёт без отдельного запроса SKU.
- Слияние community-слоя в рекомендации: [packages/domain/src/part-recommendation-merge.ts](../packages/domain/src/part-recommendation-merge.ts).
- Подписи для подборщика и статусов: [packages/domain/src/picker-fitment-labels.ts](../packages/domain/src/picker-fitment-labels.ts).
- Сводка для панели деталей корзины из ответа отчёта: [packages/domain/src/wishlist-detail-compatibility.ts](../packages/domain/src/wishlist-detail-compatibility.ts) (`buildWishlistDetailCompatibilitySummary`).
- Подписи страницы отчёта (вердикт, breakdown, источник): [packages/domain/src/part-compatibility-report-labels.ts](../packages/domain/src/part-compatibility-report-labels.ts).
- Пересчёт confidence: [packages/domain/src/fitment-confidence-recalc.ts](../packages/domain/src/fitment-confidence-recalc.ts), интеграция с Prisma: [src/lib/fitment-confidence-prisma.ts](../src/lib/fitment-confidence-prisma.ts).
- Рекомендации по узлу с учётом community: [src/lib/build-recommendations-for-node-with-community.ts](../src/lib/build-recommendations-for-node-with-community.ts).

## 3. HTTP API (web)

- Отчёты по мотоциклу: [src/app/api/vehicles/[id]/fitment-reports/route.ts](../src/app/api/vehicles/[id]/fitment-reports/route.ts) (GET/POST; GET с опциональным `partMasterId`).
- Сводка для страницы отчёта (агрегат по модификации + список отчётов, breakdown, источник): [src/app/api/vehicles/[id]/part-compatibility-report/route.ts](../src/app/api/vehicles/[id]/part-compatibility-report/route.ts) (устаревший `fitment-report-sheet` удалён).
- Fitment evidence, moderation, part-masters: каталоги [src/app/api/fitment/](../src/app/api/fitment/), [src/app/api/moderation/](../src/app/api/moderation/), [src/app/api/part-masters/](../src/app/api/part-masters/).
- Подбор рекомендаций: [src/app/api/parts/recommended-skus/route.ts](../src/app/api/parts/recommended-skus/route.ts) (использует сборку с community).

## 4. UI (Next.js)

- Страница отчёта (URL с `partMasterId` и `nodeId`): [src/app/vehicles/[id]/parts/fitment-report/](../src/app/vehicles/[id]/parts/fitment-report/) — клиент `PartCompatibilityReportPageClient.tsx`, данные с `GET .../part-compatibility-report`.
- Сообщество / «своя деталь»: [src/app/vehicles/[id]/parts/community/](../src/app/vehicles/[id]/parts/community/) — `CommunityPartPageClient.tsx` (форма, дубликаты, fitment при «Установил» / «Не подошла»).
- Подборщик:
  - явная ссылка **«Отчёт о совместимости →»** + подпись уровня каталога — [PickerFitmentReportLink.tsx](../src/app/vehicles/[id]/parts/picker/_components/PickerFitmentReportLink.tsx);
  - карточки рекомендаций, поиск SKU, альтернативы — [RecommendationCard.tsx](../src/app/vehicles/[id]/parts/picker/_components/RecommendationCard.tsx), [RecommendationsSection.tsx](../src/app/vehicles/[id]/parts/picker/_components/RecommendationsSection.tsx), [SearchResultsSection.tsx](../src/app/vehicles/[id]/parts/picker/_components/SearchResultsSection.tsx);
  - кнопки **«Сбросить выбор»** и **«Добавить свою деталь»** — [PartPickerPage.tsx](../src/app/vehicles/[id]/parts/picker/_components/PartPickerPage.tsx).
- Корзина замен: в правой панели деталей позиции блок **«Совместимость»** (агрегат с `part-compatibility-report` + ссылка на полный отчёт) — [WishlistItemCompatibilityBlock.tsx](../src/app/vehicles/[id]/parts/_components/WishlistItemCompatibilityBlock.tsx), встроен в [PartsCartPage.tsx](../src/app/vehicles/[id]/parts/_components/PartsCartPage.tsx).
- Модерация (web): [src/app/moderation/](../src/app/moderation/).

## 5. Мобильный клиент (Expo)

- Маршруты (паритет с web): `/vehicles/[id]/wishlist/picker`, `/vehicles/[id]/wishlist/community`, `/vehicles/[id]/wishlist/fitment-report` (query: `nodeId`, `partMasterId`; опционально `partMasterId` для prefill community).
- Подбор: [picker.tsx](../apps/app/app/vehicles/[id]/wishlist/picker.tsx) — те же ссылки на отчёт ([picker-fitment-report-link.tsx](../apps/app/components/vehicle-wishlist/picker-fitment-report-link.tsx)), «Добавить свою деталь», сброс узла/черновика.
- Отчёт совместимости: [fitment-report-screen.tsx](../apps/app/components/vehicle-wishlist/fitment-report-screen.tsx).
- Своя деталь: [community-part-screen.tsx](../apps/app/components/vehicle-wishlist/community-part-screen.tsx).
- Корзина: нижний лист деталей — блок **«Совместимость»** ([wishlist-item-compatibility-block.tsx](../apps/app/components/vehicle-wishlist/wishlist-item-compatibility-block.tsx)) в [wishlist/index.tsx](../apps/app/app/vehicles/[id]/wishlist/index.tsx).
- API-клиент: `getPartCompatibilityReport`, `getPartMaster`, fitment-reports, part-masters — [packages/api-client/src/mototwin-endpoints.ts](../packages/api-client/src/mototwin-endpoints.ts); hrefs — [apps/app/components/vehicle-wishlist/hrefs.ts](../apps/app/components/vehicle-wishlist/hrefs.ts).

## 6. Иконки дерева узлов

- Обновлённые ассеты и манифест: [images/node-tree-icons/](../images/node-tree-icons/).
- Документация по дизайн-иконкам: [docs/node-tree-design-icons.md](node-tree-design-icons.md).
- Синхронизация из слайсов: [scripts/sync-node-icons-from-slices.mjs](../scripts/sync-node-icons-from-slices.mjs); часть старых скриптов извлечения слайсов **удалена** в пользу упрощённого пайплайна (см. `git diff` / историю коммита).
- Исходники/архивы для дизайна (крупный объём): каталог **`images/node-tree-icons-new/`** — локальные референсы и zip; при необходимости можно не включать в удалённый репозиторий и описать это в `.gitignore` отдельным коммитом.

## 7. Спеки и референсы (документация продукт)

- [docs/mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) — целевая UI-спека страницы отчёта.
- [docs/mototwin_add_your_part_ui_spec_ru.md](mototwin_add_your_part_ui_spec_ru.md) — UI «добавить свою деталь».
- Референсы: `images/examples/part-compatibility-report.png`, `images/examples/add-part.png`.

## 8. Responsive layout web-клиента (мобильный браузер)

- Общие client-side хуки в `src/lib/`:
  - **`use-is-narrow.ts`** — `useIsNarrow(maxWidthPx = 1023)` поверх `matchMedia`; базовый брейкпоинт — Tailwind `lg` (1023 px).
  - **`use-sidebar-collapsed.ts`** — `useSidebarCollapsed(storageKey?)`: единая обёртка над **`GarageSidebar`**, на узком viewport принудительно `collapsed=true` и `toggle()` — no-op; на широком пользовательский выбор сохраняется в `localStorage` по переданному ключу.
- Хук `useSidebarCollapsed` подключён на всех страницах с «гаражным» хромом: `src/app/page.tsx`, `garage/page.tsx`, `trash/page.tsx`, `onboarding/page.tsx`, `profile/page.tsx`, `moderation/fitment/page.tsx`, `expenses/ExpensesPageClient.tsx`, `vehicles/[id]/vehicle-detail-client.tsx`, `vehicles/[id]/service-events/new/ServiceEventCreateClient.tsx`, `vehicles/[id]/service-events/[eventId]/edit/ServiceEventEditClient.tsx`, `vehicles/[id]/service-log/page.tsx`, `vehicles/[id]/parts/picker/_components/PartPickerPage.tsx`, `vehicles/[id]/parts/community/CommunityPartPageClient.tsx`, `vehicles/[id]/parts/fitment-report/PartCompatibilityReportPageClient.tsx`. Ранее в каждом из этих файлов был свой `useState + useEffect(localStorage) + useCallback(toggle)` — теперь источник один.
- Адаптация конкретных страниц:
  - **«Дерево узлов»** (`/vehicles/[id]/nodes`, `src/app/vehicles/[id]/vehicle-detail-client.tsx`) — на узком одна колонка (дерево), а правая панель «Контекст узла» открывается полноэкранным sheet (`position: fixed; inset: 0; zIndex: 40`) с кнопкой «← Назад к дереву», которая снимает `?nodeId=` из URL через `history.replaceState`.
  - **«Расходы»** (`src/app/expenses/ExpensesPageClient.tsx`) — на узком `dashboardGridStyle` → `minmax(0, 1fr)`, KPI-строка → `repeat(auto-fit, minmax(140px, 1fr))`.  
    Также выровнен фильтр по узлам с мобильной версией: вместо одиночного select используется `NodePickerModal` с мультивыбором, поиском и переключателем «Топ-узлы»; фильтрация применяется по выбранным узлам и их дочерним узлам.
- Документация: каноническая запись — `docs/frontend-web.md` §6; референсы в `docs/garage-dashboard-mvp.md` («Свёрнутость»), `docs/node-tree-page-functional-overview.md` §5.3, `docs/expense-tracking-mvp.md` («Web responsive»), `docs/repository-structure.md` §3.

## 9. Обновления за 2026-05-18 (web + Expo)

- **Компактный мобильный хедер (declutter pattern)**:
  - В `apps/app/components/expo-shell/internal-screen-chrome.tsx` добавлены `declutterMobile`, `scrollOffsetY`, `collapseThreshold`; реализованы compact crumbs и модальное окно полного пути.
  - Добавлено sticky-collapsed состояние: после прокрутки скрываются подзаголовки и `belowNavRow`, остаются back + title + action.
  - Паттерн применён на страницах: `service-log`, `expenses`, `wishlist`, `wishlist/picker`, `service-events/new`, `vehicles/[id]/nodes`.

- **Плашка мотоцикла compact-by-default**:
  - В `apps/app/components/garage/GarageVehicleContextPlaque.tsx` добавлен режим `compactByDefault` (одна строка с именем/силуэтом + раскрытие деталей по тапу).
  - В compact-режиме переключение мотоцикла доступно инлайн-кнопкой в плашке.

- **Нижняя мобильная навигация (GarageBottomNav)**:
  - В `apps/app/components/garage/GarageBottomNav.tsx` добавлен пункт `Подбор` (`picker`) с переходом в корзину/подбор.
  - Панель сделана компактнее по высоте (иконки/отступы/радиусы), обновлены все экраны-источники навигации.
  - Bottom nav подключён на странице `apps/app/app/vehicles/[id]/wishlist/index.tsx`.

- **Расходы (Expo) — фильтры и компактность**:
  - `apps/app/app/vehicles/[id]/expenses.tsx`: KPI-карточки сделаны компактнее (2 в ряд на мобиле), добавлены иконки.
  - Переработан блок «Все расходы»: более плотная карточка, компактные действия (`Журнал`, `Установить`) в правой колонке.
  - Блок «Фильтры» уплотнён: show/hide + reset в заголовке, год и месяц объединены с остальными фильтрами.
  - Добавлен фильтр по узлам через `MobileNodePickerModal` (multi + топ-узлы), фильтрация по выбранным узлам и дочерним.
  - В «Куплено, не установлено» оставлены только позиции, реально присутствующие в wishlist со статусом `BOUGHT`.

- **Расходы (web) — parity node filter с мобилой**:
  - `src/app/expenses/ExpensesPageClient.tsx`: вместо single-select внедрён `NodePickerModal` (мультивыбор, поиск, переключатель «Топ-узлы»).
  - Фильтрация выполняется по выбранным узлам и всему их поддереву; добавлен `Сброс узлов`.
  - Загружаются `getNodeTree(vehicleId)` и `getTopServiceNodes()` для корректного top-node scope.

- **Корзина/статусы и узлы (Expo)**:
  - `apps/app/app/vehicles/[id]/wishlist/index.tsx`: статусные подписи выровнены с web (`Нужно купить / Заказано / Куплено / Установлено / Не подошла`).
  - Для экрана `vehicles/[id]/nodes` поправлено выравнивание контента с шапкой (убран лишний визуальный сдвиг слева).

- **Admin web: responsive-полировка dashboard/таблиц**:
  - Обновлены `src/app/admin/page.tsx` и компоненты `AdminTopBar`, `AdminFilterBar`, `AdminDataTable`, `DashboardSection`, `FitmentQualityDonut`, `WorkQueueCard`.
  - Улучшено поведение на узких ширинах: auto-fit grid, корректные переносы, min-width для таблиц, wrap для action-кнопок и контролов.

## 10. Навигация и chrome (2026-06, web + Expo)

Аудит «подпись vs экран» и последующие правки UI.

### Гараж

- **Web `VehicleCard`:** `Добавить ТО` → `/vehicles/{id}/service-events/new`; `Расход` → `/expenses` (убраны мёртвые query `open=service-event`, `open=expense`).
- **Expo `VehicleCard`:** `Расход` → `/expenses` (ранее вёл в `service-log`).
- **Expo bottom nav:** «Узлы» с `garage`, `/expenses`, `wishlist/picker` → `/vehicles/{id}/nodes`.
- **Web CTA «Добавить мотоцикл»:** `GarageHeader` и `AddMotorcycleCard` — одна `<Link>`, без вложенного `<Button>`; вся пунктирная карточка с «+» кликабельна.

### Дашборд мотоцикла (web)

- `VehicleDashboardTopBar`: стрелка «←» и «Мой гараж» → `/garage`.

### Уведомления

- **Web `/notifications`:** кнопка `actionLabel` / `actionUrl` (как в Expo); legacy `/state?focus=mileage` нормализуется в `?openVehicleState=1`.
- **`src/lib/notifications.ts`:** «Открыть узел» → `/nodes?nodeId=…`; пробег → `?openVehicleState=1&focus=mileage`.
- **Web:** `vehicle-detail-client` обрабатывает `openVehicleState=1`; `src/app/vehicles/[id]/state/page.tsx` — redirect для старых ссылок.
- **Expo:** `vehicles/[id]/index` редиректит `openVehicleState=1` на экран `state`.

### Admin (web)

- CTA конфликтов fitment и legacy `/admin/fitment/conflicts*` → `/admin/moderation?queue=mixedFitments`.
- `/admin/service-rules/new` + `POST /api/admin/service-rules`; список регламентов с ссылкой «Создать регламент».

Документация: `docs/garage-dashboard-mvp.md`, `docs/frontend-web.md`, `docs/frontend-expo.md`, `docs/parity/cross-platform-parity.md`, `docs/mototwin_notifications_spec.md` §11.5, `docs/ui-action-icons-mvp.md`.

## 11. Следующие шаги (по продуктовому плану)

- Довести UI страницы отчёта до полного соответствия [mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) v1.1 (если остались секции спеки).
- Регрессия web/Expo: пикер → отчёт, панель деталей корзины → сводка совместимости, community → wishlist + fitment-report.
- Опционально: кэш сводки совместимости в панели деталей, презентация community/fitment-report как modal на Expo.
