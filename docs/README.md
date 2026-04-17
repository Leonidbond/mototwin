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

При расхождении между historical docs и canonical docs, ориентироваться на canonical set.
