# MotoTwin Documentation Index

Этот индекс описывает **актуальный набор технической документации** по текущей реализации MotoTwin (web + Expo + shared packages + backend + Prisma).

## Canonical documentation

- `technical-overview.md` — общий технический обзор текущей архитектуры и направлений миграции.
- `repository-structure.md` — структура репозитория и назначение ключевых директорий.
- `data-model.md` — Prisma/PostgreSQL модель: сущности, enum, связи, ограничения.
- `api-backend.md` — реализованные backend routes, payloads, response shape, правила.
- `frontend-web.md` — web-клиент: страницы и рабочие сценарии.
- `frontend-expo.md` — Expo-клиент: экраны и рабочие сценарии.
- `shared-packages.md` — shared packages (`types`, `domain`, `api-client`) и границы reuse.
- `functional-logic.md` — бизнес-логика обслуживания: события, статусы, агрегация, пересчет.
- `cross-platform-parity.md` — статус выравнивания web/expo и зафиксированные gaps.
- `documentation-gap-analysis.md` — последний gap analysis по документации и план обновления.

## Web + Expo parity (текущий срез)

- `web-expo-parity-audit.md` — **индекс**: краткий статус, ссылки, карта файлов (без длинных таблиц находок).
- `web-expo-parity-audit-repeat.md` — **детали**: матрица областей, остаточные зазоры, батчи, QA после батчей.
- `web-mobile-parity-workflow.md` — процесс планирования фич на двух клиентах, Definition of Done.
- `parity-task-template.md` — копируемый шаблон промпта (impact / parity / QA / docs).
- Документы `web-expo-*-fixes.md` — пошаговые записи выравниваний по темам (журнал, дерево, данные, визуал и т.д.).

## Governance and process docs

- `coding-rules.md` — правила разработки и quality constraints.
- `cursor-workflow.md` — правила рабочего процесса в Cursor.

## Historical task docs (non-canonical)

Ниже документы-артефакты по шагам миграции/реализации.
Они полезны как история решений, но **не являются source of truth** для текущего состояния:

- `project.md`
- `frontend.md`
- `expo-app-architecture.md`
- `shared-packages-bootstrap.md`
- `node-status.md`
- `expo-*` step docs
- `shared-extraction-step-*.md`
- `web-screen-garage-visual-refresh.md`

При расхождении между historical docs и canonical docs, ориентироваться на canonical set.
