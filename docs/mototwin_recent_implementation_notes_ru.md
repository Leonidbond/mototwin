# Зафиксированные шаги реализации (сводка)

Документ описывает **уже внесённые в репозиторий** изменения по ветке работ: community fitment, подбор деталей, отчёты, иконки дерева узлов, сопутствующие правки API и мобильного клиента. Полноценная страница «Итоговый отчёт по совместимости» по [mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) в объёме **плана v1.1 (hero, breakdown, единый API `part-compatibility-report`)** на момент коммита может быть **ещё не реализована** — ориентир по коду: наличие маршрута `src/app/api/vehicles/[id]/part-compatibility-report/`.

## 1. Данные и Prisma

- Модели и перечисления для **PartMaster**, **FitmentReport**, **FitmentVote**, **FitmentEvidence**, **FitmentConfidence**, статусы wishlist (в т.ч. `REJECTED`) — в [prisma/schema.prisma](../prisma/schema.prisma).
- Миграции в [prisma/migrations/](../prisma/migrations/) (включая `part_master_community_fitment`, `fitment`, `part_wishlist_status_rejected` и др. по состоянию репозитория).
- Сиды и вспомогательные скрипты: [prisma/seed.ts](../prisma/seed.ts), [prisma/backfill-part-masters.ts](../prisma/backfill-part-masters.ts).

## 2. Домен и типы

- Общие типы совместимости: [packages/types/src/fitment-community.ts](../packages/types/src/fitment-community.ts).
- У **PartSku** / **PartRecommendationViewModel** добавлено поле **`partMasterId`** для связки с отчётами и агрегатами: [packages/types/src/part-catalog.ts](../packages/types/src/part-catalog.ts), [packages/types/src/part-recommendation.ts](../packages/types/src/part-recommendation.ts).
- Слияние community-слоя в рекомендации: [packages/domain/src/part-recommendation-merge.ts](../packages/domain/src/part-recommendation-merge.ts).
- Подписи для подборщика и статусов: [packages/domain/src/picker-fitment-labels.ts](../packages/domain/src/picker-fitment-labels.ts).
- Пересчёт confidence: [packages/domain/src/fitment-confidence-recalc.ts](../packages/domain/src/fitment-confidence-recalc.ts), интеграция с Prisma: [src/lib/fitment-confidence-prisma.ts](../src/lib/fitment-confidence-prisma.ts).
- Рекомендации по узлу с учётом community: [src/lib/build-recommendations-for-node-with-community.ts](../src/lib/build-recommendations-for-node-with-community.ts).

## 3. HTTP API (web)

- Отчёты по мотоциклу: [src/app/api/vehicles/[id]/fitment-reports/route.ts](../src/app/api/vehicles/[id]/fitment-reports/route.ts) (GET/POST; GET с опциональным `partMasterId`).
- Сводка для страницы отчёта (агрегат по модификации + список отчётов): [src/app/api/vehicles/[id]/fitment-report-sheet/route.ts](../src/app/api/vehicles/[id]/fitment-report-sheet/route.ts).
- Fitment evidence, moderation, part-masters: каталоги [src/app/api/fitment/](../src/app/api/fitment/), [src/app/api/moderation/](../src/app/api/moderation/), [src/app/api/part-masters/](../src/app/api/part-masters/).
- Подбор рекомендаций: [src/app/api/parts/recommended-skus/route.ts](../src/app/api/parts/recommended-skus/route.ts) (использует сборку с community).

## 4. UI (Next.js)

- Страница отчёта (URL с `partMasterId` и `nodeId`): [src/app/vehicles/[id]/parts/fitment-report/](../src/app/vehicles/[id]/parts/fitment-report/).
- Сообщество / «своя деталь»: [src/app/vehicles/[id]/parts/community/](../src/app/vehicles/[id]/parts/community/).
- Подборщик: ссылка на отчёт с уровнем совместимости — [src/app/vehicles/[id]/parts/picker/_components/PickerFitmentReportLink.tsx](../src/app/vehicles/[id]/parts/picker/_components/PickerFitmentReportLink.tsx), карточки [RecommendationCard.tsx](../src/app/vehicles/[id]/parts/picker/_components/RecommendationCard.tsx), [RecommendationsSection.tsx](../src/app/vehicles/[id]/parts/picker/_components/RecommendationsSection.tsx), [SearchResultsSection.tsx](../src/app/vehicles/[id]/parts/picker/_components/SearchResultsSection.tsx).
- Модерация (web): [src/app/moderation/](../src/app/moderation/).

## 5. Мобильный клиент (Expo)

- Обновления под `partMasterId` в SKU из рекомендации и связанные экраны: [apps/app/app/vehicles/[id]/wishlist/picker.tsx](../apps/app/app/vehicles/[id]/wishlist/picker.tsx), [apps/app/components/vehicle-wishlist/wishlist-item-editor.tsx](../apps/app/components/vehicle-wishlist/wishlist-item-editor.tsx), прочие изменения в `apps/app/` по `git status`.

## 6. Иконки дерева узлов

- Обновлённые ассеты и манифест: [images/node-tree-icons/](../images/node-tree-icons/).
- Документация по дизайн-иконкам: [docs/node-tree-design-icons.md](node-tree-design-icons.md).
- Синхронизация из слайсов: [scripts/sync-node-icons-from-slices.mjs](../scripts/sync-node-icons-from-slices.mjs); часть старых скриптов извлечения слайсов **удалена** в пользу упрощённого пайплайна (см. `git diff` / историю коммита).
- Исходники/архивы для дизайна (крупный объём): каталог **`images/node-tree-icons-new/`** — локальные референсы и zip; при необходимости можно не включать в удалённый репозиторий и описать это в `.gitignore` отдельным коммитом.

## 7. Спеки и референсы (документация продукт)

- [docs/mototwin_part_compatibility_report_ui_spec_ru.md](mototwin_part_compatibility_report_ui_spec_ru.md) — целевая UI-спека страницы отчёта.
- [docs/mototwin_add_your_part_ui_spec_ru.md](mototwin_add_your_part_ui_spec_ru.md) — UI «добавить свою деталь».
- Референсы: `images/examples/part-compatibility-report.png`, `images/examples/add-part.png`.

## 8. Следующие шаги (по продуктовому плану)

- Заменить `fitment-report-sheet` и текущую страницу отчёта на единый **`GET .../part-compatibility-report`** и новый layout (hero, breakdown, источники, sticky CTA) по спеке v1.1 — см. план в Cursor (Part compatibility report page), без правки самого файла плана в репозитории, если он хранится только локально в `.cursor/plans/`.
