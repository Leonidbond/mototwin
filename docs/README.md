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
| [`frontend-expo.md`](./frontend-expo.md) | Expo Router, экраны, потокы |
| [`mobile-build.md`](./mobile-build.md) | Сборка и запуск Expo: Metro, release APK, EAS, troubleshooting |
| [`shared-packages.md`](./shared-packages.md) | `types`, `domain`, `api-client`, границы reuse |
| [`functional-logic.md`](./functional-logic.md) | События, статусы узлов, агрегация |
| [`parity/cross-platform-parity.md`](./parity/cross-platform-parity.md) | Матрица parity и намеренные отличия |
| [`mototwin_unified_design_concept.md`](./mototwin_unified_design_concept.md) | Единый дизайн-концепт |
| [`mototwin_ui_refactor_playbook.md`](./mototwin_ui_refactor_playbook.md) | Playbook UI-рефакторинга |
| [`top-node-icons.md`](./top-node-icons.md) | TOP-node иконки: хранение и именование |
| [`node-tree-design-icons.md`](./node-tree-design-icons.md) | Иконки строк дерева узлов (design → `from-design` → `nodes`, скрипты) |
| [`models/mototwin_model_technical_master_standard_cursor.md`](./models/mototwin_model_technical_master_standard_cursor.md) | **Standard:** unified motorcycle model technical master (4-уровневая иерархия `MotorcycleBrand → MotorcycleModelFamily → MotorcycleVariant → MotorcycleGeneration` + `MotorcycleTechnicalSpecs`) — source of truth для CSV-импорта моделей и схемы. |

---

## 2. Feature specs (MVP)

[`garage-dashboard-mvp.md`](./garage-dashboard-mvp.md) · [`service-log-mvp.md`](./service-log-mvp.md) · [`expense-tracking-mvp.md`](./expense-tracking-mvp.md) · [`attention-flow-mvp.md`](./attention-flow-mvp.md) · [`vehicle-profile-mvp.md`](./vehicle-profile-mvp.md) · [`vehicle-trash-mvp.md`](./vehicle-trash-mvp.md) · [`upcoming-maintenance-mvp.md`](./upcoming-maintenance-mvp.md) · [`parts-wishlist-mvp.md`](./parts-wishlist-mvp.md) · [`parts-catalog-mvp.md`](./parts-catalog-mvp.md) · [`service-kits-mvp.md`](./service-kits-mvp.md) · [`user-settings-mvp.md`](./user-settings-mvp.md) · [`custom-top-nodes-mvp.md`](./custom-top-nodes-mvp.md) · [`subscription-access-mvp.md`](./subscription-access-mvp.md)

### Parts catalog staging (v1.2)

| Документ | Назначение |
|----------|------------|
| [`catalog/parts-catalog-schema.md`](./catalog/parts-catalog-schema.md) | **Canonical:** 39-column CSV contract, enums, validation, DB mapping, CLI + admin import |
| [`catalog/parts-source-policy.md`](./catalog/parts-source-policy.md) | Иерархия источников, региональные правила |
| [`catalog/mototwin_cursor_parts_catalog_skill_v1_2.md`](./catalog/mototwin_cursor_parts_catalog_skill_v1_2.md) | Cursor skill: batch workflow, 5 CSV, QA |
| [`admin-panel-readme.md`](./admin-panel-readme.md) §5 | Admin bulk import + шаблоны CSV |
| `data/catalog/templates/` | Шаблоны для заполнения и admin download |

Pilot batch: `data/parts/bmw/r-1300-gs/`.

При расхождении с canonical — править спеки или canonical так, чтобы остался один согласованный источник.

---

## 3. UI и крупные спеки

| Документ | Назначение |
|----------|------------|
| [`mototwin-parts-cart-and-picker-ui-spec.md`](./mototwin-parts-cart-and-picker-ui-spec.md) | Корзина замен + single-page подбор детали (web + mobile) |
| [`mototwin_user_template_service_kits_implementation_ru.md`](./mototwin_user_template_service_kits_implementation_ru.md) | Реализация: шаблоны ADVANCED ↔ комплекты в подборе (`user_template:`, API, web, Expo) |
| [`node-tree.md`](./node-tree.md) | Справочник иерархии узлов (коды дерева) |
| [`node-tree-design-icons.md`](./node-tree-design-icons.md) | Иконки строк дерева: дизайн, нарезка, постобработка, маппинг |
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

**Индекс:** [`parity/web-expo-parity-audit.md`](./parity/web-expo-parity-audit.md) → детальная сверка [`parity/web-expo-parity-audit-repeat-2.md`](./parity/web-expo-parity-audit-repeat-2.md).

**Процесс:** [`parity/web-mobile-parity-workflow.md`](./parity/web-mobile-parity-workflow.md) · [`parity/parity-task-template.md`](./parity/parity-task-template.md)

**Журналы фиксов:** [`parity/web-expo-parity-fixes.md`](./parity/web-expo-parity-fixes.md) · [`parity/web-expo-data-parity-fixes.md`](./parity/web-expo-data-parity-fixes.md) · [`parity/web-expo-node-tree-parity-fixes.md`](./parity/web-expo-node-tree-parity-fixes.md) · [`parity/web-expo-visual-parity-fixes.md`](./parity/web-expo-visual-parity-fixes.md) · [`parity/web-expo-service-log-parity-fixes.md`](./parity/web-expo-service-log-parity-fixes.md) (в конце — приложение с ранними заметками по Expo journal; отдельные файлы `expo-service-log-*-parity.md` удалены как дубли). **Сводка 2026-06:** [`mototwin_recent_implementation_notes_ru.md`](./mototwin_recent_implementation_notes_ru.md) §10 — гараж, уведомления, admin, back-навигация.

**QA:** [`service-event-qa-smoke.md`](./service-event-qa-smoke.md) · [`status-cache-frontend-qa.md`](./status-cache-frontend-qa.md) · [`parts-catalog-regression-qa.md`](./parts-catalog-regression-qa.md) · [`parts-compatibility-qa.md`](./parts-compatibility-qa.md) · [`parts-catalog-qa-seed.md`](./parts-catalog-qa-seed.md) · `npm run qa:subscription-smoke` → [subscription-access-mvp.md](./subscription-access-mvp.md#qa)

---

## 6. Auth, подписка и доступ

[`auth-roadmap.md`](./auth-roadmap.md) · [`auth-data-ownership-architecture.md`](./auth-data-ownership-architecture.md) · [`auth-implementation-plan.md`](./auth-implementation-plan.md) · [`auth-web-architecture.md`](./auth-web-architecture.md) — **web-сессии, SSR guards, OAuth bridge, клиентский кеш** · [`auth-oauth-production.md`](./auth-oauth-production.md) — **OAuth на prod: env, Google Console, callbacks, troubleshooting**

**Тарифы (реализовано):** [`subscription-access-mvp.md`](./subscription-access-mvp.md) — MVP FREE / RIDER / PRO, API, UI, QA. Полная спека: [`mototwin_subscription_access_spec.md`](./mototwin_subscription_access_spec.md).

---

## 7. Governance

[`coding-rules.md`](./coding-rules.md) · [`cursor-workflow.md`](./cursor-workflow.md)

---

## 8. Security

[`security/README.md`](./security/README.md) — аудит по OWASP Top 10 (web), OWASP API Top 10 (2023), OWASP Mobile Top 10 (2024). Включает: [threat-model](./security/threat-model.md), per-stream findings ([api](./security/api-findings.md) · [web](./security/web-findings.md) · [mobile](./security/mobile-findings.md)), сводный [реестр находок](./security/findings.md), [roadmap фиксов](./security/roadmap.md).

---

## 9. Архив

Каталог **[`archive/`](./archive/)** — перенесённые «кандидаты в архив» из старого индекса: `project.md`, `node-status.md`, `documentation-gap-analysis.md`, планы `expo-bootstrap` / `expo-first-migration`, все **`expo-screen-*.md`**, черновик расходов `expenses-analytics-vision-draft.md`. См. [`archive/README.md`](./archive/README.md).

---

## Правила сопровождения

1. Не использовать архив и parity-журналы как единственный источник истины для текущего поведения.
2. Перед удалением файла из `docs/` — обновить ссылки в `docs/`, при необходимости в `README` и в коде.
3. При конфликте canonical vs parity — приоритет у canonical и MVP-спеков; parity — changelog.
