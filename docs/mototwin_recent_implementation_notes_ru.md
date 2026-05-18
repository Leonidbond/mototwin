# Зафиксированные шаги реализации (сводка)

Документ описывает **уже внесённые в репозиторий** изменения по ветке работ: community fitment, подбор деталей, отчёты, иконки дерева узлов, сопутствующие правки API и мобильного клиента. Страница «Итоговый отчёт по совместимости» опирается на [mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) и **`GET .../part-compatibility-report`**; детальное соответствие всем пунктам спеки v1.1 при необходимости доводится отдельно.

**Шаблоны журнала (ADVANCED) и комплекты в подборе** (`includeInPartPicker`, коды `user_template:`, UI web/Expo) вынесены в отдельный документ: [mototwin_user_template_service_kits_implementation_ru.md](mototwin_user_template_service_kits_implementation_ru.md).

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

## 9. Следующие шаги (по продуктовому плану)

- Довести UI страницы отчёта до полного соответствия [mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) v1.1 (если остались секции спеки).
- Регрессия web/Expo: пикер → отчёт, панель деталей корзины → сводка совместимости, community → wishlist + fitment-report.
- Опционально: кэш сводки совместимости в панели деталей, презентация community/fitment-report как modal на Expo.
