# MotoTwin MVP Frontend

## 1. Scope

Документ описывает **текущую реализованную** frontend-часть MotoTwin MVP на основе `src/app/**`.

Цель документа: зафиксировать, как сейчас устроены страницы и пользовательские сценарии, без описания не реализованных экранов как готовых.

## 2. Frontend architecture (current)

- Framework: Next.js App Router
- Основные страницы:
  - `src/app/page.tsx`
  - `src/app/onboarding/page.tsx`
  - `src/app/garage/page.tsx`
  - `src/app/vehicles/[id]/page.tsx`
- Подход:
  - локальный state на уровне страницы (`useState`, `useEffect`, `useMemo`)
  - загрузка данных через `fetch` к backend route handlers
  - без отдельного global state manager

## 3. Pages and major UI flows

## 3.1 Landing / start page

**File:** `src/app/page.tsx`

Реализовано:

- продуктовый стартовый экран (hero + benefits + audience + CTA);
- переход в onboarding через кнопку `Начать`;
- CTA для проверки live data (`/api/brands`).

Экран статический по данным (без runtime загрузки бизнес-сущностей), используется как вход в сценарий MVP.

---

## 3.2 Onboarding page

**File:** `src/app/onboarding/page.tsx`

Реализовано:

- каскадный выбор:
  - бренд -> `GET /api/brands`
  - модель -> `GET /api/models?brandId=...`
  - модификация -> `GET /api/model-variants?modelId=...`
- ввод полей:
  - `nickname`, `vin`, `odometer`, `engineHours`
  - ride profile (`usageType`, `ridingStyle`, `loadType`, `usageIntensity`)
- отправка формы:
  - `POST /api/vehicles`
- базовая UX-обратная связь:
  - loading states для справочников
  - `submitError` / `submitSuccess`
  - ссылка в гараж после успеха
- правый блок предпросмотра профиля с выбранными значениями.

---

## 3.3 Garage page

**File:** `src/app/garage/page.tsx`

Реализовано:

- загрузка гаража через `GET /api/garage`;
- состояния: loading / error / empty;
- карточки мотоциклов со сводкой:
  - бренд/модель/модификация
  - пробег, моточасы, VIN
  - профиль эксплуатации
  - краткая техсводка
- переход в карточку мотоцикла (`/vehicles/[id]`);
- кнопка добавления нового мотоцикла (`/onboarding`).

---

## 3.4 Vehicle detail page

**File:** `src/app/vehicles/[id]/page.tsx`

Это основной operational экран MVP.

### 3.4.1 Profile block

Реализовано:

- загрузка `vehicle` через `GET /api/vehicles/[id]`;
- отображение:
  - бренд/модель/модификация
  - nickname, VIN
  - профиль эксплуатации
  - техсводка модификации
- блок **`Текущее состояние`** с inline-редактированием:
  - default: readonly (`Пробег`, `Моточасы`)
  - action: `Редактировать`
  - режим редактирования: инпуты + `Сохранить` / `Отмена`
  - save: `PATCH /api/vehicles/[id]/state`
  - после успеха:
    - локально обновляются значения в UI
    - перезагружаются `node-tree` и `service-events`
    - выход из edit mode

### 3.4.2 Node tree block

Реализовано:

- загрузка дерева через `GET /api/vehicles/[id]/node-tree`;
- отображение top-level узлов в grid;
- рекурсивный рендер children;
- expand/collapse:
  - кнопки `+ / −`
  - состояние хранится в `expandedNodes`;
- статусные бейджи по `effectiveStatus`;
- leaf action `+`:
  - открывает add-service-event modal
  - предзаполняет путь выбранного узла.

### 3.4.3 Status display and explanations

Реализовано:

- отображается итоговый статус узла (`effectiveStatus`);
- для leaf узлов показывается short explanation (`statusExplanation.reasonShort`) как clickable элемент;
- по клику открывается modal `Пояснение расчета`:
  - `reasonShort`, `reasonDetailed`, `triggeredBy`
  - табличный блок расчетных данных (current / last service / rule / usage / remaining);
- modal имеет overlay, close button и scroll.

### 3.4.4 Service log modal

Реализовано:

- открытие кнопкой `Открыть журнал обслуживания`;
- отдельная modal `Журнал обслуживания`;
- состояния: loading / error / empty;
- табличное представление событий с колонками:
  - дата, тип записи, событие, узел, пробег, моточасы, стоимость, комментарий;
- sticky header в таблице;
- раскрываемые комментарии (`Показать` / `Скрыть`);
- фильтры:
  - раскрываемый ряд фильтров над соответствующими колонками;
- сортировки:
  - по всем колонкам (toggle asc/desc);
- кнопка `Сбросить фильтры`.

### 3.4.5 Add service event modal

Реализовано:

- входная точка из service log modal (`Добавить сервисное событие`);
- также открывается с leaf кнопки `+` в дереве;
- отдельная modal с формой:
  - каскадный выбор node path по уровням
  - поля `serviceType`, `eventDate`, `odometer`, `engineHours`, `costAmount`, `currency`, `comment`
- клиентские проверки (обязательные поля, leaf selection, ограничения даты/пробега);
- submit: `POST /api/vehicles/[id]/service-events`;
- после успеха:
  - reset формы
  - reload service log
  - reload node tree
  - закрытие add-event modal (service log modal остается открытой).

## 4. Data loading from backend

## 4.1 Onboarding

- `GET /api/brands`
- `GET /api/models?brandId=...`
- `GET /api/model-variants?modelId=...`
- `POST /api/vehicles`

## 4.2 Garage

- `GET /api/garage`

## 4.3 Vehicle detail

- `GET /api/vehicles/[id]`
- `GET /api/vehicles/[id]/service-events`
- `GET /api/vehicles/[id]/node-tree`
- `PATCH /api/vehicles/[id]/state`
- `POST /api/vehicles/[id]/service-events`

## 5. How user actions update the page

## Add service event

1. Пользователь открывает форму (из журнала или leaf `+`).
2. Отправка `POST /service-events`.
3. При успехе UI вызывает:
   - `loadServiceEvents()`
   - `loadNodeTree()`
4. Форма очищается и modal закрывается.

## Update vehicle state

1. `Редактировать` -> inline inputs.
2. `Сохранить` -> `PATCH /state`.
3. При успехе:
   - обновляются отображаемые значения состояния
   - перезагружаются service log и node tree
   - выход из edit mode.

## Open service log

- Кнопка в блоке дерева открывает отдельную modal с таблицей событий.

## Inspect node status explanation

- Клик по short explanation leaf узла открывает modal с детальным расчетом.

## 6. Current UX decisions

- Vehicle detail организован как operational workspace:
  - профиль + текущее состояние
  - дерево узлов со статусами
  - сервисный журнал и создание событий в модалках
- Журнал и форма создания события вынесены в modal flow, чтобы не перегружать основной экран.
- Для leaf узлов доступен быстрый action `+`, чтобы создавать событие из контекста конкретного узла.
- Детальный расчет статуса вынесен в отдельную modal, чтобы основной tree UI оставался компактным.
- Табличный журнал выбран как формат для быстрого сравнения событий, фильтрации и сортировки.

## 7. Current limitations

- Нет отдельного design system / shared modal framework: логика локальная в page component.
- Нет клиентской пагинации/виртуализации журнала; таблица рендерит весь полученный список.
- Нет отдельного offline/optimistic режима синхронизации.
- Нет отдельного разделения ролей пользователя в UI (MVP flow ориентирован на один operational сценарий).
- Страницы управления подпиской/аккаунтом не реализованы как отдельные frontend-модули в текущем MVP.

