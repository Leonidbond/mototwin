# Аудит паритета Web (Next.js) и Expo — индекс и статус

**Назначение:** краткая **навигация** и **текущий снимок** паритета web/Expo. Детальные матрицы, остаточные зазоры, батчи и QA — в **[web-expo-parity-audit-repeat-2.md](./web-expo-parity-audit-repeat-2.md)** (актуальная детальная сверка) и в документах `web-expo-*-fixes.md` ниже.  
**Не дублировать здесь** длинные таблицы находок: они разбиты по специализированным fix-докам и повторным аудитам.

**Дата первичного обзора:** 2026-04-18  
**Процесс и правила:** [coding-rules.md](./coding-rules.md) (§25), [web-mobile-parity-workflow.md](./web-mobile-parity-workflow.md), [parity-task-template.md](./parity-task-template.md), [cursor-workflow.md](./cursor-workflow.md).

---

## Текущий статус (кратко)

- **Форма сервисного события (bundle, web + Expo, 2026-05):** одна и та же **семантика** bundle-формы `AddServiceEventFormValues` на web и в мобильном экране создания/редактирования: на Next.js — компонент **`src/app/vehicles/[id]/_components/BasicServiceEventModal.tsx`** (журнал `service-log/page.tsx`, карточка ТС `vehicle-detail-client.tsx` и прочие точки входа); в Expo — **`apps/app/app/vehicles/[id]/_components/basic-service-event-bundle-form.tsx`**, экран-обёртка **`service-events/new.tsx`**. Включает блок **«Готово к установке»** (`GET …/installable`), **ADVANCED**-суммы (строки + верх, остаток при edit), превью **«Итого»**, парсинг сумм `ru-RU`. Детали — [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md), [shared-form-contracts.md](./shared-form-contracts.md).
- **Актуальный аудит (2026-04-18, вторая сверка):** [web-expo-parity-audit-repeat-2.md](./web-expo-parity-audit-repeat-2.md) — подтверждены фиксы (RUB, даты, спеки гаража, токены журнала на web, `__DEV__` для API-строки на Expo); **критичных функциональных разрывов не найдено**; остаются low-only: локальный `VehicleDetail` на web, валидатор профиля не в UI, хвост Tailwind vs токены, устаревшие упоминания `fetch` в части docs.
- По основным сценариям (гараж, карточка ТС, дерево узлов, журнал, новое сервисное событие, семантика статусов) в целом **practical / full parity** по смыслу данных и API; **намеренные** платформенные отличия — в repeat-2 **§4**.
- Политики **дат**, **спеков гаража**, **токенов**: [cross-platform-parity.md](./cross-platform-parity.md), [web-expo-visual-parity-fixes.md](./web-expo-visual-parity-fixes.md), [shared-design-tokens.md](./shared-design-tokens.md).

---

## Где искать детали

| Документ | Содержание |
|----------|------------|
| [web-expo-parity-audit-repeat-2.md](./web-expo-parity-audit-repeat-2.md) | **Актуально:** детальная сверка после батчей (RUB, даты, спеки, токены, Expo debug, docs); матрица, подтверждённые фиксы, остаточные low-зазоры, QA |
| [web-expo-parity-fixes.md](./web-expo-parity-fixes.md) | Первые функциональные выравнивания (в т.ч. высокий приоритет) |
| [web-expo-data-parity-fixes.md](./web-expo-data-parity-fixes.md) | Паритет данных, гараж, журнал, общие VM |
| [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md) | Журнал обслуживания |
| [web-expo-node-tree-parity-fixes.md](./web-expo-node-tree-parity-fixes.md) | Дерево узлов и пояснения статусов |
| [web-expo-visual-parity-fixes.md](./web-expo-visual-parity-fixes.md) | `productSemanticColors`, визуальное сближение, Expo debug API (политика) |
| [shared-form-contracts.md](./shared-form-contracts.md) | Общие формы и начальные значения |
| [status-cache-frontend-qa.md](./status-cache-frontend-qa.md) | QA кэша статусов на клиентах |

---

## Карта ключевых файлов реализации

| Область | Web | Expo |
|--------|-----|------|
| Гараж | `src/app/garage/page.tsx` | `apps/app/app/index.tsx` |
| Добавление мотоцикла | `src/app/onboarding/page.tsx` | `apps/app/app/vehicles/new.tsx` |
| Карточка ТС | `src/app/vehicles/[id]/page.tsx` | `apps/app/app/vehicles/[id]/index.tsx` |
| Состояние (пробег / моточасы) | тот же `page.tsx` (инлайн) | `apps/app/app/vehicles/[id]/state.tsx` |
| Профиль | модалка в `page.tsx` | `apps/app/app/vehicles/[id]/profile.tsx` |
| Журнал | `src/app/vehicles/[id]/service-log/page.tsx` | `apps/app/app/vehicles/[id]/service-log.tsx` |
| Форма сервисного события (bundle) | `src/app/vehicles/[id]/_components/BasicServiceEventModal.tsx` (журнал, карточка ТС `vehicle-detail-client.tsx`, …) | `apps/app/app/vehicles/[id]/_components/basic-service-event-bundle-form.tsx` + экран `service-events/new.tsx` |
| API-клиент | `createMotoTwinEndpoints` + `baseUrl: ""` | тот же клиент + `getApiBaseUrl()` |
| Shared | `packages/types`, `packages/domain`, `packages/api-client`, `packages/design-tokens` | то же |

---

## Связанные обзорные документы

- [cross-platform-parity.md](./cross-platform-parity.md) — матрица паритета и намеренные отличия  
- [frontend-web.md](./frontend-web.md), [frontend-expo.md](./frontend-expo.md) — экраны и потоки по клиентам  

---

## QA (высокий уровень)

Чеклисты по сценариям и граничным случаям: **§6** в [web-expo-parity-audit-repeat-2.md](./web-expo-parity-audit-repeat-2.md) (и при необходимости в первом repeat); при изменениях статусов узлов — [status-cache-frontend-qa.md](./status-cache-frontend-qa.md).

---

*Историческая полная таблица различий первичного аудита (пункты §1–17 в прежнем виде) при необходимости — в истории git этого файла; для актуального состояния ориентироваться на **[web-expo-parity-audit-repeat-2.md](./web-expo-parity-audit-repeat-2.md)** и fix-доки.*
