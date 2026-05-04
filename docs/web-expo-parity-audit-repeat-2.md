# Повторный аудит паритета Web + Expo (вторая сверка, пост-фиксы)

**Дата:** 2026-04-18  
**Метод:** статический обзор **актуального** кода web (`src/app/**`), Expo (`apps/app/app/**`), shared (`packages/types`, `packages/domain`, `packages/api-client`, `packages/design-tokens`) и связанной документации. **Изменений коду приложений в этом шаге не вносилось.**

**Контекст:** после батчей: дефолт валюты сервисного события **RUB**, политика дат и спеков гаража, расширение `productSemanticColors` на web (журнал и др.), gating строки API на Expo (`__DEV__`), наведение порядка в parity-доках; кэш **TopNodeState** — правки и QA зафиксированы ранее ([status-cache-frontend-qa.md](./status-cache-frontend-qa.md)).

**Связанные документы:**

- [web-expo-parity-audit.md](./web-expo-parity-audit.md) — индекс и навигация  
- [cross-platform-parity.md](./cross-platform-parity.md), [web-expo-visual-parity-fixes.md](./web-expo-visual-parity-fixes.md), [web-expo-data-parity-fixes.md](./web-expo-data-parity-fixes.md), [shared-form-contracts.md](./shared-form-contracts.md), [shared-design-tokens.md](./shared-design-tokens.md), [status-cache-frontend-qa.md](./status-cache-frontend-qa.md)  

**Ключевые файлы реализации:**

| Область | Web | Expo |
|--------|-----|------|
| Гараж | `src/app/garage/page.tsx` | `apps/app/app/index.tsx` |
| Добавление мотоцикла | `src/app/onboarding/page.tsx` | `apps/app/app/vehicles/new.tsx` |
| Карточка ТС | `src/app/vehicles/[id]/page.tsx` | `apps/app/app/vehicles/[id]/index.tsx` |
| Состояние ТС | инлайн в `page.tsx` | `apps/app/app/vehicles/[id]/state.tsx` |
| Профиль | модалка в `page.tsx` | `apps/app/app/vehicles/[id]/profile.tsx` |
| Журнал | `src/app/vehicles/[id]/service-log/page.tsx` | `apps/app/app/vehicles/[id]/service-log.tsx` |
| Форма сервисного события (bundle) | `src/app/vehicles/[id]/_components/BasicServiceEventModal.tsx` | `apps/app/.../basic-service-event-bundle-form.tsx` + `service-events/new.tsx` |

---

## 1. Сводная матрица по областям

| Область | Статус | Комментарий (кратко) |
|--------|--------|----------------------|
| Garage screen | Practical parity + platform UX | `productSemanticColors` (canvas, ошибки, CTA); список через API-клиент |
| Garage card | Practical parity | `buildGarageCardProps` + `filterMeaningfulGarageSpecHighlights` на **обоих** |
| Add motorcycle flow | Practical parity | `createInitialAddMotorcycleFormValues`; маршруты `/onboarding` vs `/vehicles/new` — намеренно |
| Vehicle detail screen | Practical parity | Общие VM; web хранит **`VehicleDetail`** из types после **`vehicleDetailFromApiRecord`** (wire → канон) |
| Vehicle profile data | Full parity (смысл) | Один API, `normalizeEditVehicleProfilePayload`; разные оболочки UI |
| Vehicle current state update | Practical parity | `validateVehicleStateFormValues` web/mobile; Expo отдельный экран |
| Edit vehicle profile | Partial parity | Нет вызова `validateEditVehicleProfileFormValues` в UI на обоих клиентах |
| Node tree | Practical parity | `buildNodeTreeSectionProps`; Expo — отдельная загрузка/ошибка дерева; **интерактивный статус** → журнал с фильтром по узлу |
| Node status display | Full parity (смысл) | `statusSemanticTokens` + подписи из domain/tokens; **null** = нет бейджа, не «OK по умолчанию» для пустого поддерева |
| Status explanation | Full parity (смысл) | Модалки; `formatIsoCalendarDateRu`; `canOpenNodeStatusExplanationModal` |
| Add service event from tree | Practical parity | Web — путь в модалке; Expo — `nodeId` в query + экран |
| Add Service Event default currency | Full parity (код) | `DEFAULT_ADD_SERVICE_EVENT_CURRENCY` / `createInitialAddServiceEventFormValues` → **RUB**; web и Expo инициализируют валюту из хелпера |
| Service log | Practical parity | `buildServiceLogTimelineProps` — `"default"` web / `"compact"` Expo; опционально **`restrictToNodeIds`** (фильтр из дерева) |
| Service log timeline | Practical parity | Общая VM; web — токены `productSemanticColors` для точек/карточек/бейджей в модалке |
| Service log grouping | Full parity (смысл) | Один domain pipeline |
| Monthly summary | Full parity (смысл) | Те же VM и подписи |
| Filters and sorting | Full parity (смысл) | Те же поля и хелперы |
| Date display policy | Practical parity | Документировано: см. [cross-platform-parity.md](./cross-platform-parity.md) §4.1 |
| Garage spec highlights policy | Full parity (политика + код) | Оба клиента: фильтр осмысленных спек; детали в §4.2 cross-platform |
| API debug visibility (Expo) | Intentional / dev-only | «Текущий API: …» только при **`__DEV__`** на ошибке гаража |
| API client usage | Full parity (основные экраны) | Web `src/app`: `createMotoTwinEndpoints` + `createApiClient({ baseUrl: "" })`; Expo + `getApiBaseUrl()`. Прямых `fetch` в `src/app` **не найдено** (инспекция) |
| Shared view models | High alignment | Garage, vehicle, node tree, service log — `@mototwin/domain` |
| Shared form contracts | High alignment | Формы сервиса, состояния, мотоцикла, профиля (нормализация есть; см. профиль ниже) |
| Shared component contracts | Partial | Типы в `@mototwin/types`; общий UI-kit не вводился |
| Design tokens | Practical parity | Оба: `statusSemanticTokens`, `productSemanticColors`; web — токены для гаража (карточки), журнала, ошибок/success на ТС; остальной нейтраль — **Tailwind** |
| Empty / error states | Practical parity | Сообщения согласованы по смыслу; Expo не показывает URL API в prod-like сборке |

**Легенда:**

- **Full parity** — один смысл данных и исходов при том же API.
- **Practical parity with platform-specific UX** — смысл совпадает, паттерн UI разный.
- **Partial parity** — есть заметные различия, не блокирующие core workflow.
- **N/A** — не применимо к паре клиентов.

---

## 2. Ранее идентифицированные темы — текущий статус (подтверждение по коду)

| Тема | Статус | Подтверждение (инспекция) |
|------|--------|---------------------------|
| Дефолт валюты Add Service Event → **RUB** | **Fixed** | `packages/domain/src/forms.ts`: `DEFAULT_ADD_SERVICE_EVENT_CURRENCY`; web `page.tsx` и Expo `service-events/new.tsx` — `useState(() => createInitialAddServiceEventFormValues().currency)` |
| Политика отображения дат | **Documented / aligned** | `buildServiceLogTimelineProps` + стили; `formatIsoCalendarDateRu` для пояснения статуса; JSDoc в `packages/types/src/service-log.ts` |
| Политика spec highlights на гараже | **Fixed** | `filterMeaningfulGarageSpecHighlights` в `garage/page.tsx` и `app/index.tsx` |
| Расширение `productSemanticColors` на web | **Partially done** | Гараж, onboarding, карточка ТС, **модалка журнала** (оверлей, таймлайн, бейджи); остальной UI преимущественно Tailwind |
| Строка отладки API в Expo | **Gated** | `apps/app/app/index.tsx`: `{__DEV__ ? <Text>Текущий API: …` |
| Структура parity-документации | **Done** | Индекс [web-expo-parity-audit.md](./web-expo-parity-audit.md); детали в repeat / fix-доках |
| TopNodeState / кэш статусов | **Вне объёма клиентского кода в этом шаге** | Логика на backend; клиенты потребляют дерево/статусы; регрессии — [status-cache-frontend-qa.md](./status-cache-frontend-qa.md) |
| Клик/тап по **статусу узла** → журнал с фильтром по узлу/поддереву | **Implemented** (2026-04-18) | Shared: `createServiceLogNodeFilter`, `restrictToNodeIds` в `buildServiceLogTimelineProps` / `filterServiceLogEntries`; web — state в модалке; Expo — query `nodeIds` / `nodeLabel`; см. [web-expo-node-tree-parity-fixes.md](./web-expo-node-tree-parity-fixes.md), [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md) |
| **Пустой статус корня** (нет данных по поддереву) | **Implemented** (2026-04-18) | `node-tree` больше не подменяет `null` → `OK` для top-level; UI без бейджа; кэш `TopNodeState` может отличаться — см. [top-node-state-cache-plan.md](./top-node-state-cache-plan.md) |

---

## 3. Оставшиеся зазоры (не намеренные отличия платформ)

### 3.1. Локальный тип `VehicleDetail` на web

| Поле | Содержание |
|------|------------|
| **Статус** | **Addressed** (2026-04-18, рефакторинг) |
| **Было** | Локальный nested-тип в `page.tsx` + `toSharedVehicleDetail` |
| **Стало** | Канонический `VehicleDetail` из `@mototwin/types`; wire JSON → **`vehicleDetailFromApiRecord`** (`VehicleDetailApiRecord` в types); `buildVehicleHeaderProps(vehicle)` без лишнего маппинга |
| **Остаточный долг** | `VehicleDetailResponse.vehicle` в типах/api-client по-прежнему помечен как `VehicleDetail`, тогда как wire — nested; на границе web использует `as unknown as VehicleDetailApiRecord` (документировано в [shared-vehicle-view-models.md](./shared-vehicle-view-models.md)) |
| **Файлы** | `src/app/vehicles/[id]/page.tsx`, `packages/types/src/vehicle.ts`, `packages/domain/src/vehicle-view-models.ts` |

---

### 3.2. Клиентская валидация редактирования профиля

| Поле | Содержание |
|------|------------|
| **Статус паритета** | Partial parity |
| **Web** | Сохранение через `normalizeEditVehicleProfilePayload`; **нет** `validateEditVehicleProfileFormValues` в UI |
| **Expo** | Аналогично в `profile.tsx` |
| **Ожидаемо** | При появлении продуктовых ограничений — общий validator до submit на обоих |
| **Тип зазора** | Shared logic gap |
| **Severity** | Low |
| **Рекомендация** | Подключить `validateEditVehicleProfileFormValues` при расширении правил |
| **Файлы** | `src/app/vehicles/[id]/page.tsx`, `apps/app/app/vehicles/[id]/profile.tsx`, `packages/domain/src/forms.ts` |

---

### 3.3. Документация vs факт: API-клиент на web

| Поле | Содержание |
|------|------------|
| **Статус паритета** | N/A (документы) |
| **Документы** | [cross-platform-parity.md](./cross-platform-parity.md) §5.1 и [shared-packages.md](./shared-packages.md) утверждают, что web в основном использует прямой `fetch` |
| **Факт в коде** | В `src/app/**` вызовов `fetch(` **не обнаружено**; гараж, onboarding, карточка ТС используют `createMotoTwinEndpoints` |
| **Ожидаемо** | Документы отражают текущую архитектуру |
| **Тип зазора** | Documentation gap |
| **Severity** | Low |
| **Рекомендация** | Обновить §5 `cross-platform-parity.md` и соответствующий абзац `shared-packages.md` |
| **Файлы** | `docs/cross-platform-parity.md`, `docs/shared-packages.md` (вне списка обязательных правок этого аудита — зафиксировано как follow-up) |

---

### 3.4. Визуальный паритет: Tailwind vs токены на web

| Поле | Содержание |
|------|------------|
| **Статус** | **Partially addressed** (2026-04-18, доп. батч) |
| **Сделано** | Новые токены `successSurface` / `successBorder` / `successText`; web **гараж** — поверхности карточек через `card` / `cardMuted` / `border` / чип; web **ТС** — ошибки форм `error`, success после сервиса — success-триада; модалка журнала и бейджи узлов — как ранее (`statusSemanticTokens` / timeline) |
| **Остаток** | Большая часть нейтрали и типографики на карточке ТС — по-прежнему `gray-*` Tailwind |
| **Expo** | Без изменений; при желании позже подключить success-триаду к аналогичным баннерам |
| **Файлы** | `packages/design-tokens/src/index.ts`, `src/app/garage/page.tsx`, `src/app/vehicles/[id]/page.tsx` |

---

## 4. Намеренные платформенные отличия (не считать дефектом без нового требования)

1. **Навигация и URL:** `/onboarding` vs `/vehicles/new`; Expo Router vs Next.js.  
2. **Композиция потоков:** модалки на одной странице (web) vs отдельные маршруты (Expo).  
3. **Строка даты в журнале:** `dateStyle` `"default"` (web) vs `"compact"` (Expo) — см. политику в docs.  
4. **Обновление состояния ТС:** инлайн (web) vs экран `state.tsx` (Expo).  
5. **Дерево узлов:** multi-column корни (web) vs компактный список (Expo); раскрытие: кнопка ± (web) vs строка (Expo).  
6. **Отладка API:** только в dev на Expo (см. §2 таблицу).  
7. **Плотность UI:** desktop-сетки vs mobile-first карточки.

---

## 5. План доработок (если зазоры остаются)

Критичных **функциональных** разрывов по результатам этой инспекции **не выявлено**.

| Батч | Содержание |
|------|------------|
| **Batch 1** | *Нет пунктов высокого влияния* — высокоприоритетные темы первичного аудита закрыты в коде ранее |
| **Batch 2** | *§3.1 закрыт* — опционально позже: поправить тип `VehicleDetailResponse` / api-client под `VehicleDetailApiRecord` или union, чтобы убрать двойное приведение на web |
| **Batch 3** | *Нет обязательных* — журнал/дерево на domain-хелперах |
| **Batch 4** | §3.4 **частично закрыт**; дальше — точечно по экранам (нейтраль Tailwind → токены при касании) |
| **Batch 5** | Обновить **документацию** про использование api-client на web (§3.3); при необходимости дополнить `shared-form-contracts` про профиль |

---

## 6. QA

### 6.1. Доступно по инспекции кода

- Наличие `filterMeaningfulGarageSpecHighlights`, `DEFAULT_ADD_SERVICE_EVENT_CURRENCY`, `buildServiceLogTimelineProps` с ожидаемым `dateStyle`.  
- `__DEV__` вокруг строки API в `apps/app/app/index.tsx`.  
- Использование `createMotoTwinEndpoints` в `src/app` без `fetch`.  
- `formatIsoCalendarDateRu` / токены в модалке журнала на web.

### 6.2. Требуется ручной UI

- Один мотоцикл на web и Expo: гараж, карточка, дерево, журнал, формы, сохранение без смены валюты (ожидание **RUB**).  
- Ошибка загрузки гаража на Expo: в **release** профиле нет строки с URL API; в **dev** — есть.  
- Пояснение статуса узла и длинные комментарии в журнале.  
- **«Требует внимания»:** счётчик, модалка/экран, порядок OVERDUE → SOON, свёрнутый по умолчанию подробный расчёт для просроченных, переход в журнал по узлу — см. [attention-flow-mvp.md](./attention-flow-mvp.md).

### 6.3. Требуется API / прокси (при необходимости)

- Сверка тел ответов при одной сессии (`getGarageVehicles`, `getVehicleDetail`, `getNodeTree`, `getServiceEvents`).  
- Регрессии кэша TopNodeState — сценарии из [status-cache-frontend-qa.md](./status-cache-frontend-qa.md).

---

## 7. Итог

После перечисленных фиксов **существенных функциональных разрывов** между web и Expo по core workflow **не обнаружено**. Остаются **низкоприоритетные** темы: точность типа ответа `getVehicleDetail` (wire vs `VehicleDetail`, см. §3.1), отсутствие UI-валидации профиля, **остаточное** визуальное расхождение Tailwind vs токены на крупных блоках карточки ТС (§3.4 — частично снято), **устаревшие формулировки** в части docs про `fetch` на web.

*Конец второго повторного аудита.*
