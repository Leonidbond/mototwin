# MotoTwin Documentation Index

Этот индекс описывает актуальную структуру документации по MotoTwin и разделяет:

- **canonical docs** — текущий source of truth;
- **feature specs** — живые продуктовые/MVP-спецификации по областям;
- **parity history** — аудит и журналы выравнивания web/Expo;
- **archive candidates** — исторические артефакты, которые не должны использоваться как основной источник.

## Canonical documentation

- `technical-overview.md` — общий технический обзор текущей архитектуры и направлений миграции.
- `repository-structure.md` — структура репозитория и назначение ключевых директорий.
- `data-model.md` — Prisma/PostgreSQL модель: сущности, enum, связи, ограничения.
- `api-backend.md` — backend routes, payloads, response shape, правила.
- `frontend-web.md` — актуальное описание web-клиента.
- `frontend-expo.md` — актуальное описание Expo-клиента.
- `shared-packages.md` — shared packages (`types`, `domain`, `api-client`) и границы reuse.
- `functional-logic.md` — бизнес-логика обслуживания: события, статусы, агрегация, пересчет.
- `cross-platform-parity.md` — текущая продуктовая матрица parity и намеренные отличия.
- `mototwin_unified_design_concept.md` — единый дизайн-концепт.
- `mototwin_ui_refactor_playbook.md` — инженерный playbook UI-рефакторинга.

## Feature specs (durable product docs)

Эти документы остаются актуальными, пока соответствующая продуктовая область жива:

- `garage-dashboard-mvp.md`
- `service-log-mvp.md`
- `expense-tracking-mvp.md`
- `attention-flow-mvp.md`
- `vehicle-profile-mvp.md`
- `vehicle-trash-mvp.md`
- `upcoming-maintenance-mvp.md`
- `parts-wishlist-mvp.md`
- `parts-catalog-mvp.md`
- `service-kits-mvp.md`
- `user-settings-mvp.md`

Если feature spec расходится с canonical docs, truth должен быть синхронизирован, а не дублирован.

## Web + Expo parity history

- `web-expo-parity-audit.md` — индекс статуса и карта parity-документов.
- `web-expo-parity-audit-repeat-2.md` — актуальная детальная повторная сверка.
- `web-mobile-parity-workflow.md` — процесс планирования фич на двух клиентах.
- `parity-task-template.md` — шаблон parity-задачи.
- `web-expo-*-fixes.md` — тематические журналы выполненных parity/fix батчей.

Эти документы полезны как история решений и подтверждение regressions/fixes, но не заменяют canonical docs.

## Governance and process docs

- `coding-rules.md` — правила разработки и quality constraints.
- `cursor-workflow.md` — правила рабочего процесса в Cursor.

## Archive / legacy notes

Следующие документы либо уже historical по смыслу, либо должны использоваться только как контекст миграции:

- `project.md`
- `node-status.md`
- `documentation-gap-analysis.md`
- `expo-screen-*` step docs (если их содержание уже отражено в `frontend-expo.md` или feature specs)
- точечные parity/journal changelog docs, если итог уже перенесен в canonical/feature specs

## Cleanup rules

1. Не использовать historical/step docs как source of truth для текущего поведения.
2. Перед удалением любого документа:
   - обновить входящие ссылки из `docs/` и `src/`;
   - убедиться, что финальное знание перенесено в canonical/feature spec.
3. При расхождении между canonical docs и parity history ориентироваться на canonical set, а parity history использовать как changelog.
