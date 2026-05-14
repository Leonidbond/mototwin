# Реализация: пользовательские шаблоны журнала (ADVANCED) и комплекты в подборе

Документ фиксирует **внесённые в репозиторий** изменения: связка шаблонов события обслуживания в подробном режиме (**ADVANCED**) с экраном **«Подбор детали»**, синтетические комплекты с префиксом `user_template:`, флаг показа в подборе, API и UI на **web** и **Expo**.

См. также продуктовый контекст: [`service-kits-mvp.md`](./service-kits-mvp.md), [`parts-wishlist-mvp.md`](./parts-wishlist-mvp.md), [`mototwin-parts-cart-and-picker-ui-spec.md`](./mototwin-parts-cart-and-picker-ui-spec.md).

---

## 1. Продуктовое поведение

1. **Шаблон пользователя (ADVANCED)** может сохраняться с опцией **«Показывать в подборе деталей как комплект»** (`includeInPartPicker`). При включении шаблон попадает в выдачу **`GET /api/parts/service-kits`** для соответствующего мотоцикла и контекста узла (наряду со статическими комплектами).
2. **Код комплекта** для такого шаблона — синтетический: префикс **`user_template:`** + id записи шаблона (см. домен ниже). В типах view model у комплекта выставляется **`isUserTemplate`**, чтобы UI мог отличать «свои» комплекты от каталожных.
3. **Добавление комплекта в wishlist** (`POST .../wishlist/kits`) для встроенного или пользовательского комплекта после успешного создания позиций может **создавать** запись `UserServiceEventFormTemplate`, чтобы состав зафиксировался в журнале (логика в route).
4. **Web и Expo (экран подбора)**: две секции — **«Мои комплекты»** и **«Комплекты обслуживания»**; бейдж **«Мой»**; из черновой корзины по SKU — **«Сохранить как комплект»** → создание шаблона через **`POST /api/user-service-event-templates`** с тем же флагом и перезагрузкой списка китов.

---

## 2. Данные (Prisma)

- Модель **`UserServiceEventFormTemplate`**: поле **`includeInPartPicker`** (`Boolean`, по умолчанию `true`) — управляет попаданием шаблона в подбор как комплекта.  
  Файл: [`prisma/schema.prisma`](../prisma/schema.prisma).
- Миграция: [`prisma/migrations/20260514120000_user_template_include_in_part_picker/migration.sql`](../prisma/migrations/20260514120000_user_template_include_in_part_picker/migration.sql).

После подтягивания миграций нужны **`prisma generate`** и применение миграции к БД; старые клиенты без поля в запросах обрабатывались на API через fallback (см. раздел API).

---

## 3. Домен (`@mototwin/domain`)

| Назначение | Файл |
|------------|------|
| Префикс кода **`user_template:`**, `buildUserServiceKitCode`, `parseUserServiceKitTemplateId`, разбор/сборка synthetic kit из формы ADVANCED, строк подбора, фильтрация по контексту узла | [`packages/domain/src/user-template-service-kit.ts`](../packages/domain/src/user-template-service-kit.ts) |
| Экспорт публичного API пакета | [`packages/domain/src/index.ts`](../packages/domain/src/index.ts) |
| При разрешении позиции комплекта к SKU учитывается **`preferredSkuId`** у элемента определения | [`packages/domain/src/service-kits.ts`](../packages/domain/src/service-kits.ts) |
| Юнит-тесты сценариев user-kit | [`packages/domain/src/user-template-service-kit.test.ts`](../packages/domain/src/user-template-service-kit.test.ts) |

Вспомогательные функции для черновика подбора и сохранения «своего комплекта» (снимок формы для шаблона) используются и на web, и в Expo-модалке: **`advancedServiceKitSnapshotFromPickerLines`**, **`stripAddServiceEventFormValuesForUserTemplate`** (импорт из `@mototwin/domain` в UI).

---

## 4. Типы (`@mototwin/types`)

- **`ServiceKitViewModel`**: опционально **`isUserTemplate?: boolean`** — [`packages/types/src/service-kit.ts`](../packages/types/src/service-kit.ts).
- Провода API для шаблонов пользователя, в т.ч. **`includeInPartPicker`** в теле создания и в ответах — [`packages/types/src/api.ts`](../packages/types/src/api.ts) (и реэкспорт в [`packages/types/src/index.ts`](../packages/types/src/index.ts) при необходимости).

---

## 5. HTTP API (Next.js)

| Маршрут | Поведение |
|---------|-----------|
| [`src/app/api/parts/service-kits/route.ts`](../src/app/api/parts/service-kits/route.ts) | Объединение статических комплектов и пользовательских шаблонов ADVANCED с рекомендациями по узлу; учёт **`includeInPartPicker`** (в т.ч. совместимость со схемой БД до миграции — запрос без поля в `where`, фильтр в памяти при отсутствии колонки). |
| [`src/app/api/vehicles/[id]/wishlist/kits/route.ts`](../src/app/api/vehicles/[id]/wishlist/kits/route.ts) | Резолв определения комплекта по коду, в т.ч. **`user_template:<id>`**; после успешного добавления — создание **`UserServiceEventFormTemplate`** при необходимости; устойчивость к старым Prisma-клиентам при create. |
| [`src/app/api/user-service-event-templates/route.ts`](../src/app/api/user-service-event-templates/route.ts) | **POST**: приём **`includeInPartPicker`**; обработка ошибок создания. |
| [`src/lib/resolve-service-kit-definition.ts`](../src/lib/resolve-service-kit-definition.ts) | Разбор кода **`user_template:`** и сбор synthetic **`ServiceKitDefinition`**. |

Связанная узкая выборка контекста мотоцикла для китов может переиспользовать [`src/lib/build-recommendations-for-node-with-community.ts`](../src/lib/build-recommendations-for-node-with-community.ts) (см. историю правок в `service-kits` route).

---

## 6. Web UI (Next.js)

| Область | Файлы |
|---------|--------|
| Подбор: две секции китов, перезагрузка списка после сохранения своего комплекта | [`src/app/vehicles/[id]/parts/picker/_components/PartPickerPage.tsx`](../src/app/vehicles/[id]/parts/picker/_components/PartPickerPage.tsx) |
| Секция списка комплектов (переиспользуется для «Мои» и каталога) | [`src/app/vehicles/[id]/parts/picker/_components/KitsSection.tsx`](../src/app/vehicles/[id]/parts/picker/_components/KitsSection.tsx) |
| Строка комплекта, бейдж «Мой» | [`src/app/vehicles/[id]/parts/picker/_components/ServiceKitRow.tsx`](../src/app/vehicles/[id]/parts/picker/_components/ServiceKitRow.tsx) |
| Черновая корзина: «Сохранить как комплект» | [`src/app/vehicles/[id]/parts/picker/_components/PickerDraftCartPanel.tsx`](../src/app/vehicles/[id]/parts/picker/_components/PickerDraftCartPanel.tsx) |
| Модалка сохранения комплекта из корзины | [`src/app/vehicles/[id]/parts/picker/_components/UserKitSaveModal.tsx`](../src/app/vehicles/[id]/parts/picker/_components/UserKitSaveModal.tsx) |
| Форма события: сохранение пользовательского шаблона ADVANCED + флаг «в подборе» | [`src/app/vehicles/[id]/_components/service-event-form/ServiceEventForm.tsx`](../src/app/vehicles/[id]/_components/service-event-form/ServiceEventForm.tsx) |

Клиент подбора вызывает **`createUserServiceEventFormTemplate`** через тот же слой API, что и остальной vehicle picker (см. импорты в `PartPickerPage.tsx`).

---

## 7. Expo (мобильный клиент)

| Область | Файлы |
|---------|--------|
| Экран подбора: разделение «Мои» / каталог, `kitsReloadNonce`, состояние добавления комплекта, модалка сохранения | [`apps/app/app/vehicles/[id]/wishlist/picker.tsx`](../apps/app/app/vehicles/[id]/wishlist/picker.tsx) |
| Секция комплектов с настраиваемыми заголовками и пустым состоянием | [`apps/app/components/vehicle-wishlist/picker-kits-section.tsx`](../apps/app/components/vehicle-wishlist/picker-kits-section.tsx) |
| Бейдж «Мой» для `isUserTemplate` | [`apps/app/components/vehicle-wishlist/picker-service-kit-row.tsx`](../apps/app/components/vehicle-wishlist/picker-service-kit-row.tsx) |
| Нижний лист корзины: кнопка «Сохранить как комплект» | [`apps/app/components/vehicle-wishlist/picker-draft-cart-bar.tsx`](../apps/app/components/vehicle-wishlist/picker-draft-cart-bar.tsx) (`PickerDraftCartSheet`) |
| Модалка «Сохранить как комплект» (логика как на web) | [`apps/app/components/vehicle-wishlist/picker-user-kit-save-modal.tsx`](../apps/app/components/vehicle-wishlist/picker-user-kit-save-modal.tsx) |
| Сохранение шаблона ADVANCED + переключатель «в подборе» | [`apps/app/components/vehicle-detail/basic-service-event-bundle-form.tsx`](../apps/app/components/vehicle-detail/basic-service-event-bundle-form.tsx) |

**Клиент API:** `createMotoTwinEndpoints` → **`createUserServiceEventFormTemplate`**, **`getServiceKits`** — [`packages/api-client/src/mototwin-endpoints.ts`](../packages/api-client/src/mototwin-endpoints.ts).

### Намеренное отличие (на момент документа)

В модалке **контекста узла** на дашборде мотоцикла (**[`apps/app/app/vehicles/[id]/index.tsx`](../apps/app/app/vehicles/[id]/index.tsx)**) список комплектов по-прежнему **единый блок** «Комплекты обслуживания» без разбиения на «Мои» / каталог и без отдельного бейджа в строке — данные с того же API уже содержат пользовательские киты при включённом флаге.

---

## 8. Регрессия и проверки

- Прогон доменных тестов: `packages/domain/src/user-template-service-kit.test.ts` (см. принятый в репозитории способ запуска, например `npx tsx --test` для файла/пакета).
- Ручной смоук: сохранение шаблона из журнала с вкл/выкл «в подборе»; появление в **`GET .../service-kits`**; добавление **`user_template:`**-кита в wishlist; сохранение комплекта из черновика подбора (web + Expo).

---

## 9. Связанные правки в других документах

При доработке UX подбора имеет смысл актуализировать:

- [`docs/mototwin-parts-cart-and-picker-ui-spec.md`](./mototwin-parts-cart-and-picker-ui-spec.md) — описание секций комплектов и сценария «Сохранить как комплект» на мобильном (если в спеки ещё не внесено дословно).
- [`docs/parity/cross-platform-parity.md`](./parity/cross-platform-parity.md) — при необходимости зафиксировать оставшийся разрыв по **node context** на Expo (п. 7 выше).
