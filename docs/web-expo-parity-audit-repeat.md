# Повторный аудит паритета Web (Next.js) и Expo (MotoTwin)

**Дата:** 2026-04-18  
**Метод:** статический обзор **текущего** кода в репозитории после батчей: design tokens, view models, service log, node tree, visual parity, workflow docs, QA по кэшу статусов.  
**Ограничение:** код приложений и пакетов **не изменялся** в рамках этого шага.

**Связанные документы:** краткий индекс и карта файлов — **[web-expo-parity-audit.md](./web-expo-parity-audit.md)**; ниже — **детализация** этого повторного прохода и ссылки на fix-доки.

- [web-expo-parity-audit.md](./web-expo-parity-audit.md) — индекс статуса и ссылки (без дублирования длинных таблиц)  
- [web-expo-parity-fixes.md](./web-expo-parity-fixes.md)  
- [web-expo-data-parity-fixes.md](./web-expo-data-parity-fixes.md)  
- [web-expo-service-log-parity-fixes.md](./web-expo-service-log-parity-fixes.md)  
- [web-expo-node-tree-parity-fixes.md](./web-expo-node-tree-parity-fixes.md)  
- [web-expo-visual-parity-fixes.md](./web-expo-visual-parity-fixes.md)  
- [status-cache-frontend-qa.md](./status-cache-frontend-qa.md)  

**Ключевые файлы реализации:**

| Область | Web | Expo |
|--------|-----|------|
| Гараж | `src/app/garage/page.tsx` | `apps/app/app/index.tsx` |
| Добавление мотоцикла | `src/app/onboarding/page.tsx` | `apps/app/app/vehicles/new.tsx` |
| Карточка ТС | `src/app/vehicles/[id]/page.tsx` | `apps/app/app/vehicles/[id]/index.tsx` |
| Состояние ТС | инлайн в `page.tsx` | `vehicles/[id]/state.tsx` |
| Профиль | модалка в `page.tsx` | `vehicles/[id]/profile.tsx` |
| Журнал | модалка в `page.tsx` | `vehicles/[id]/service-log.tsx` |
| Новое сервисное событие | модалка в `page.tsx` | `vehicles/[id]/service-events/new.tsx` |

---

## 1. Сводная матрица по областям

| Область | Статус паритета | Комментарий (кратко) |
|--------|------------------|----------------------|
| Garage screen | Practical parity + platform UX | Токены и `buildGarageCardProps`; спеки на гараже — `filterMeaningfulGarageSpecHighlights` на web и Expo; строка «Текущий API» на ошибке гаража в Expo только в **development** (`__DEV__`) |
| Garage card | Practical parity | Один контракт карточки; **спеки гаража** — только осмысленные значения (shared `filterMeaningfulGarageSpecHighlights`) на web и Expo |
| Add motorcycle flow | Practical parity | Общий `createInitialAddMotorcycleFormValues`; разные маршруты `/onboarding` vs `/vehicles/new` |
| Vehicle detail screen | Practical parity | Общие VM для заголовка/состояния/профиля/техсводки; web — локальный тип `VehicleDetail` + маппинг в shared |
| Vehicle profile data | Full parity (смысл) | Один API и нормализация; web — модалка, Expo — экран |
| Vehicle current state update | Practical parity | Общие правила в `validateVehicleStateFormValues` (web/mobile режимы сообщений) |
| Edit vehicle profile | Partial parity | Оба сохраняют через API; **нигде в UI не вызывается** `validateEditVehicleProfileFormValues` |
| Node tree | Practical parity | `buildNodeTreeSectionProps`; отдельная загрузка/ошибка дерева на Expo; раскрытие: кнопка web vs строка Expo |
| Node status display | Full parity (смысл) | `statusLabel` + `statusSemanticTokens` на обоих клиентах |
| Status explanation | Full parity (смысл) | Модалка Expo; `canOpenNodeStatusExplanationModal`; общий хелпер подписей |
| Add service event from tree | Practical parity | Web — предзаполнение пути в модалке; Expo — query `nodeId` + экран |
| Service log | Practical parity | Оба: `buildServiceLogTimelineProps`, `isServiceLogTimelineQueryActive`; **строка записи:** `default` web / `compact` Expo; **месяц в шапке группы** и **даты пояснения статуса** — одна схема (`ru-RU`), см. parity docs |
| Service log timeline | Practical parity | Общая VM; визуал разный, смысл строк совпадает |
| Grouping / monthly summary | Full parity (смысл) | Одна цепочка фильтр → сорт → группировка в domain |
| Filters and sorting | Full parity (смысл) | Те же поля и хелперы |
| API client usage | Full parity | Один `createMotoTwinEndpoints`; `baseUrl: ""` vs `getApiBaseUrl()` — ожидаемо |
| Shared view models | High alignment | Garage, vehicle sections, node tree, service log timeline из `packages/domain` |
| Shared form contracts | High alignment | Мотоцикл, сервисное событие, состояние ТС; валидатор профиля не подключён в UI |
| Shared component contracts | Partial | Контракты в `packages/types`; UI остаётся платформенным |
| Design tokens | Practical parity | `statusSemanticTokens`, `productSemanticColors`; web частично Tailwind + точечные `style` |
| Empty / error states | Practical parity | Копирайт гаража выровнен; Expo — строка «Текущий API» при ошибке гаража |

**Условные обозначения статусов:**

- **Full parity** — один смысл данных и исходов при том же API.  
- **Practical parity with platform-specific UX** — смысл совпадает, паттерн UI разный (модалка vs экран и т.д.).  
- **Partial parity** — есть ощутимые различия в данных, валидации или отображении, не блокирующие core workflow.  
- **No parity** — в текущем коде явного расхождения не выявлено по критичным областям из списка задачи.  
- **Not applicable** — не применялось к паре клиентов.

---

## 2. Подтверждённые закрытые пункты (относительно первичного аудита)

По **инспекции кода** следующие темы из [web-expo-parity-audit.md](./web-expo-parity-audit.md) и сопутствующих fix-доков **выглядят закрытыми или доведёнными до practical parity**:

| Было (первичный аудит / план) | Подтверждение в коде |
|------------------------------|----------------------|
| §1 Status explanation на Expo | Модалка, `getStatusExplanationTriggeredByLabel`, условие открытия через `canOpenNodeStatusExplanationModal` |
| §2 Валидация нового сервисного события на Expo | `validateAddServiceEventFormValuesMobile` → общий валидатор; контекст пробега/даты |
| §3 Сортировка журнала на Expo | Полный набор полей + общие хелперы |
| §4 Гараж карточка Expo | `buildGarageCardProps`, метрики, профиль, спеки (см. исключение filter ниже) |
| §5 Язык месячной сводки / бейджи типа записи | `getServiceLogEventKindBadgeLabel` на web; русские подписи |
| §7 Русские лейблы профиля Expo | Закрыто в прошлых батчах (не перепроверялись построчно в этом шаге — **manual QA**) |
| §8 Дефолты ride profile при создании мотоцикла | `createInitialAddMotorcycleFormValues` на web и Expo |
| §9 `buildServiceLogTimelineProps` на Expo | Используется с `"compact"` |
| §12 Узел в записи журнала | `secondaryTitle` / общая VM |
| Node tree §11 (ошибка дерева на Expo) | Отдельный запрос/ошибка/«Повторить» на карточке ТС |
| Визуальный батч | `productSemanticColors` на ключевых экранах Expo; web — canvas/ошибки/CTA |

---

## 3. Оставшиеся разрывы и уточнения

### 3.1. Garage card — фильтрация spec highlights

| Поле | Содержание |
|------|------------|
| **Статус** | **Fixed / documented** (2026-04-18) |
| **Политика** | На **гараже** (web и Expo) после `buildGarageCardProps` применяется **`filterMeaningfulGarageSpecHighlights`**: показываются только строки с реальными значениями; плейсхолдеры «Не указан / Не указано / Не указаны» и пустые значения скрыты. Полный техблок (рынок, цепь, звёзды и т.д.) — только на **карточке ТС** через `buildVehicleTechnicalInfoViewModel` (строки с непустыми данными). |
| **Web** | `src/app/garage/page.tsx` — как Expo. |
| **Expo** | `apps/app/app/index.tsx` — без изменений по смыслу. |
| **Файлы** | `packages/domain/src/component-contract-props.ts` (JSDoc политики), `src/app/garage/page.tsx`, `apps/app/app/index.tsx` |

---

### 3.2. Локальный тип `VehicleDetail` на web

| Поле | Содержание |
|------|------------|
| **Статус** | Partial parity (технический долг) |
| **Web** | Локальный `type VehicleDetail` + `toSharedVehicleDetail` для `@mototwin/domain` хелперов. |
| **Expo** | `VehicleDetail` из `@mototwin/types`. |
| **Ожидаемо** | Один источник типа ответа в UI или генерация из API. |
| **Тип** | Shared logic gap |
| **Severity** | Low |
| **Рекомендация** | Постепенно свести страницу к `VehicleDetail` / ответу API. |
| **Файлы** | `src/app/vehicles/[id]/page.tsx`, `packages/types` |

---

### 3.3. Валидация редактирования профиля в UI

| Поле | Содержание |
|------|------------|
| **Статус** | Partial parity |
| **Web** | Сохранение профиля без вызова `validateEditVehicleProfileFormValues` в UI. |
| **Expo** | Аналогично. |
| **Ожидаемо** | При расширении правил — общий validator на обоих до submit. |
| **Тип** | Shared logic gap |
| **Severity** | Low |
| **Рекомендация** | Подключить при появлении продуктовых ограничений на клиенте. |
| **Файлы** | `src/app/vehicles/[id]/page.tsx`, `apps/app/app/vehicles/[id]/profile.tsx`, `packages/domain/src/forms.ts` |

---

### 3.4. Дефолт валюты в форме «Новое сервисное событие»

| Поле | Содержание |
|------|------------|
| **Статус** | **Fixed** (2026-04-18) |
| **Канон** | В `@mototwin/domain`: константа **`DEFAULT_ADD_SERVICE_EVENT_CURRENCY`** = **`"RUB"`** (ISO 4217); **`createInitialAddServiceEventFormValues`** задаёт `currency: RUB`. Web и Expo инициализируют поле из этого хелпера; в API уходит **`RUB`** (через `normalizeAddServiceEventPayload`, `toUpperCase`). |
| **Web** | `useState(() => createInitialAddServiceEventFormValues().currency)`; сброс формы по-прежнему через тот же хелпер. |
| **Expo** | То же; placeholder поля ввода валюты: `RUB`. |
| **Тип** | — (закрыто) |
| **Severity** | — |
| **Файлы** | `packages/domain/src/forms.ts`, `packages/domain/src/index.ts`, `src/app/vehicles/[id]/page.tsx`, `apps/app/app/vehicles/[id]/service-events/new.tsx`, `packages/types/src/forms.ts` (JSDoc) |

---

### 3.5. Web: «полный» Tailwind vs токены

| Поле | Содержание |
|------|------------|
| **Статус** | Practical parity (визуально согласовано частично) |
| **Web** | Большинство цветов — `gray-*` Tailwind; токены для canvas, ошибок, части CTA. |
| **Expo** | `productSemanticColors` в StyleSheet. |
| **Ожидаемо** | Дальнейшее сближение только если продукт требует; не блокер. |
| **Тип** | Visual parity gap (остаточный) |
| **Severity** | Low |
| **Рекомендация** | Расширять токены в web по мере касания экранов. |
| **Файлы** | По месту в `src/app/**` |

---

## 4. Намеренные платформенные отличия (не считать дефектом без нового требования)

1. **Навигация и URL:** `/onboarding` vs `/vehicles/new`; Expo Router vs Next.js `Link`.  
2. **Журнал и формы:** модалки на странице ТС (web) vs отдельные экраны (Expo).  
3. **Формат дат в строках журнала:** web — `dateStyle: "default"` (полная `ru-RU`), Expo — `"compact"` (короткий месяц); **заголовки месяцев** и **даты в пояснении статуса** — одна политика на обоих (см. `docs/cross-platform-parity.md`, `formatIsoCalendarDateRu`).  
4. **Редактирование состояния ТС:** инлайн блок (web) vs экран `state.tsx` (Expo).  
5. **Сетка дерева узлов:** multi-column карточки корней (web) vs вертикальный список в одной карточке (Expo).  
6. **Отладка API на Expo:** строка «Текущий API: …» при ошибке гаража (см. первичный аудит §10).  
7. **Раскрытие узла:** отдельная кнопка ± (web) vs нажатие на строку с детьми (Expo).

---

## 5. Приоритетный план доработок (после аудита)

### Batch 1: функциональные высокого влияния

- По результатам **ручного QA** и [status-cache-frontend-qa.md](./status-cache-frontend-qa.md): зафиксировать любые новые расхождения статусов после правок кэша TopNodeState (если проявятся — вне объёма чисто статического повтора).

### Batch 2: data parity

- ~~Дефолт валюты в форме сервисного события~~ — **сделано** (§3.4): канон **`RUB`** в shared helper.

### Batch 3: service log / node tree polish

- **Даты:** задокументирована политика (default vs compact для строк журнала; общие месячные заголовки и статус — см. `docs/cross-platform-parity.md`, `docs/web-expo-visual-parity-fixes.md`); общий хелпер **`formatIsoCalendarDateRu`** для «полной» даты на web/Expo в пояснении статуса.  
- **Spec highlights на гараже:** **сделано** (§3.1) — web и Expo используют `filterMeaningfulGarageSpecHighlights`.

### Batch 4: visual / UX polish

- Постепенное расширение **productSemanticColors** на web-компонентах без полной замены Tailwind.  
- Решение по **строке отладки API** на Expo для prod-сборок (опционально).

### Batch 5: documentation-only

- Обновлять **первичный аудит** только ссылками и краткими статусами; детали — в repeat/fix docs.  
- Поддерживать **parity-task-template** в актуальном виде при новых фичах.

---

## 6. QA

### 6.1. Доступно по инспекции кода

- Использование `buildGarageCardProps`, `buildServiceLogTimelineProps`, `buildNodeTreeSectionProps`, `isServiceLogTimelineQueryActive`.  
- Импорт `productSemanticColors` / `statusSemanticTokens`.  
- Делегирование `validateAddServiceEventFormValuesMobile` → общий валидатор.  
- Наличие отдельной обработки ошибки дерева на Expo.

### 6.2. Требуется ручной UI

- Визуальное сравнение одного мотоцикла на web и Expo (гараж, карточка, дерево, журнал, формы).  
- Сверка статусов узлов и журнала после действий (см. [status-cache-frontend-qa.md](./status-cache-frontend-qa.md)).  
- Проверка модалки пояснения статуса и длинных комментариев в журнале.

### 6.3. Требуется API / прокси (при необходимости)

- Подтверждение тел ответов `getGarageVehicles`, `getVehicleDetail`, `getNodeTree`, `getServiceEvents` при сравнении клиентов за одной сессией.  
- Воспроизведение ошибок сети (дерево vs карточка на Expo).

---

## 7. Итог

После выполненных батчей **критичных функциональных разрывов** между web и Expo по основным workflow (гараж, ТС, дерево, журнал, сервисное событие, токены статусов) в коде **не выявлено**. Остаются **низко- и средне-приоритетные** темы: тип `VehicleDetail` на web, отсутствие клиентской валидации профиля, остаточное визуальное расхождение Tailwind vs токены, намеренные UX-различия платформ.

*Конец повторного аудита.*
