# MotoTwin — индекс документации

Структура:

1. **Canonical** — source of truth по архитектуре и клиентам.
2. **Feature specs (MVP)** — продуктовые спеки живых областей.
3. **UI / крупные спеки** — детальные макеты и сценарии.
4. **Shared contracts** — типы и контракты UI между web и Expo.
5. **Parity history** — журналы выравнивания web/Expo (не заменяют canonical).
6. **Архив** — [`archive/`](./archive/) (миграции, старые аудиты, пошаговые `expo-screen-*`, черновики).

---

## 1. Canonical

| Документ | Назначение |
|----------|------------|
| [`technical-overview.md`](./technical-overview.md) | Общий технический обзор |
| [`repository-structure.md`](./repository-structure.md) | Монорепо: директории и роли |
| [`data-model.md`](./data-model.md) | Prisma: сущности, enum, связи |
| [`api-backend.md`](./api-backend.md) | HTTP API, правила, формы ответов |
| [`frontend-web.md`](./frontend-web.md) | Next.js клиент |
| [`frontend-expo.md`](./frontend-expo.md) | Expo Router, экраны, потоки |
| [`shared-packages.md`](./shared-packages.md) | `types`, `domain`, `api-client`, границы reuse |
| [`functional-logic.md`](./functional-logic.md) | События, статусы узлов, агрегация |
| [`cross-platform-parity.md`](./cross-platform-parity.md) | Матрица parity и намеренные отличия |
| [`mototwin_unified_design_concept.md`](./mototwin_unified_design_concept.md) | Единый дизайн-концепт |
| [`mototwin_ui_refactor_playbook.md`](./mototwin_ui_refactor_playbook.md) | Playbook UI-рефакторинга |
| [`top-node-icons.md`](./top-node-icons.md) | TOP-node иконки: хранение и именование |

---

## 2. Feature specs (MVP)

[`garage-dashboard-mvp.md`](./garage-dashboard-mvp.md) · [`service-log-mvp.md`](./service-log-mvp.md) · [`expense-tracking-mvp.md`](./expense-tracking-mvp.md) · [`attention-flow-mvp.md`](./attention-flow-mvp.md) · [`vehicle-profile-mvp.md`](./vehicle-profile-mvp.md) · [`vehicle-trash-mvp.md`](./vehicle-trash-mvp.md) · [`upcoming-maintenance-mvp.md`](./upcoming-maintenance-mvp.md) · [`parts-wishlist-mvp.md`](./parts-wishlist-mvp.md) · [`parts-catalog-mvp.md`](./parts-catalog-mvp.md) · [`service-kits-mvp.md`](./service-kits-mvp.md) · [`user-settings-mvp.md`](./user-settings-mvp.md)

При расхождении с canonical — править спеки или canonical так, чтобы остался один согласованный источник.

---

## 3. UI и крупные спеки

| Документ | Назначение |
|----------|------------|
| [`mototwin-parts-cart-and-picker-ui-spec.md`](./mototwin-parts-cart-and-picker-ui-spec.md) | Корзина замен + single-page подбор детали (web + mobile) |
| [`node-tree.md`](./node-tree.md) | Справочник иерархии узлов (коды дерева) |
| [`node-tree-page-functional-overview.md`](./node-tree-page-functional-overview.md) | Поведение страницы «Узлы» (web + Expo) |
| [`node-context-mvp.md`](./node-context-mvp.md) | Контекст узла, быстрые действия |
| [`parts-catalog-architecture.md`](./parts-catalog-architecture.md) | Архитектура каталога запчастей |
| [`ui-action-icons-mvp.md`](./ui-action-icons-mvp.md) | Иконки действий в UI |

Папка **[`Service-Bundle/`](./Service-Bundle/)** — концепт и модели «сервисного бандла» (черновик под будущую реализацию).

---

## 4. Shared contracts и дизайн-токены

[`shared-component-contracts.md`](./shared-component-contracts.md) · [`shared-service-log-view-models.md`](./shared-service-log-view-models.md) · [`shared-node-tree-view-models.md`](./shared-node-tree-view-models.md) · [`shared-form-contracts.md`](./shared-form-contracts.md) · [`shared-api-client.md`](./shared-api-client.md) · [`shared-vehicle-view-models.md`](./shared-vehicle-view-models.md) · [`shared-design-tokens.md`](./shared-design-tokens.md)

---

## 5. Parity history (web ↔ Expo)

**Индекс:** [`web-expo-parity-audit.md`](./web-expo-parity-audit.md) → детальная сверка [`web-expo-parity-audit-repeat-2.md`](./web-expo-parity-audit-repeat-2.md).

**Процесс:** [`web-mobile-parity-workflow.md`](./web-mobile-parity-workflow.md) · [`parity-task-template.md`](./parity-task-template.md)

**Журналы фиксов:** [`web-expo-parity-fixes.md`](./web-expo-parity-fixes.md) · [`web-expo-data-parity-fixes.md`](./web-expo-data-parity-fixes.md) · [`web-expo-node-tree-parity-fixes.md`](./web-expo-node-tree-parity-fixes.md) · [`web-expo-visual-parity-fixes.md`](./web-expo-visual-parity-fixes.md) · [`web-expo-service-log-parity-fixes.md`](./web-expo-service-log-parity-fixes.md) (в конце — приложение с ранними заметками по Expo journal; отдельные файлы `expo-service-log-*-parity.md` удалены как дубли).

**QA:** [`status-cache-frontend-qa.md`](./status-cache-frontend-qa.md) · [`parts-catalog-regression-qa.md`](./parts-catalog-regression-qa.md) · [`parts-catalog-qa-seed.md`](./parts-catalog-qa-seed.md)

---

## 6. Auth (дорожная карта)

[`auth-roadmap.md`](./auth-roadmap.md) · [`auth-data-ownership-architecture.md`](./auth-data-ownership-architecture.md) · [`auth-implementation-plan.md`](./auth-implementation-plan.md)

---

## 7. Governance

[`coding-rules.md`](./coding-rules.md) · [`cursor-workflow.md`](./cursor-workflow.md)

---

## 8. Архив

Каталог **[`archive/`](./archive/)** — перенесённые «кандидаты в архив» из старого индекса: `project.md`, `node-status.md`, `documentation-gap-analysis.md`, планы `expo-bootstrap` / `expo-first-migration`, все **`expo-screen-*.md`**, черновик расходов `expenses-analytics-vision-draft.md`. См. [`archive/README.md`](./archive/README.md).

---

## Правила сопровождения

1. Не использовать архив и parity-журналы как единственный источник истины для текущего поведения.
2. Перед удалением файла из `docs/` — обновить ссылки в `docs/`, при необходимости в `README` и в коде.
3. При конфликте canonical vs parity — приоритет у canonical и MVP-спеков; parity — changelog.
