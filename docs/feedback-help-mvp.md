# Help & Feedback MVP — MotoTwin

Статус: **реализовано** (спецификация согласована 2026-06-23; реализация 2026-06-23).

> Реализация переиспользует существующую инфраструктуру помощи: web — глобальный
> FAB `src/components/app-help-fab.tsx`; mobile — `AppHelpProvider`/`HelpModal`
> в `apps/app/src/components/app-help-fab.tsx`. Обе сделаны page-aware на базе
> реестра `packages/domain/src/page-help-registry.ts` и дополнены формой
> обратной связи.

Документ описывает две связанные фичи:

1. **Помощь по странице** — контекстный блок «что и как сделать» на каждом экране web и mobile.
2. **Обратная связь** — форма внутри помощи с авто-подстановкой контекста страницы; обращения попадают в админку со статусами и экспортируются в NDJSON для обработки нейросетью.

Обе фичи построены вокруг единого понятия **`pageKey`**.

---

## 1. Согласованные решения

| # | Решение |
|---|---------|
| 1 | Обратная связь принимается **только от залогиненных** пользователей. |
| 2 | Помощь поддерживает **платформенные отличия** (web/mobile) поверх общего текста. |
| 3 | Менять статусы обращений могут **SUPER_ADMIN + MODERATOR**; читать/экспортировать — любой админ. |
| 4 | Формат экспорта — **NDJSON** (одна запись = одна строка JSON). |
| 5 | На старте — **только текст** (без скриншотов и вложений). |

---

## 2. Единый реестр страниц (shared)

Файл: `packages/domain/src/page-help-registry.ts` (+ `*.test.ts`).

Один логический экран описывается один раз и используется обеими платформами.

```ts
export type AppPageKey =
  | "garage"
  | "vehicle.overview"
  | "vehicle.nodes"
  | "vehicle.expenses"
  | "vehicle.service-log"
  | "vehicle.wishlist"
  | "vehicle.parts-picker"
  | "expenses"
  | "profile"
  | "subscription"
  | "trash"
  // ... остальные экраны

export interface PageHelpContent {
  summary: string;
  steps: string[];
  tips?: string[];
}

export interface PageHelpEntry {
  key: AppPageKey;
  title: string;
  base: PageHelpContent;             // общий текст
  web?: Partial<PageHelpContent>;    // переопределяет поля только на web
  mobile?: Partial<PageHelpContent>; // переопределяет поля только на mobile
  webPathPattern?: string;           // "/vehicles/[id]/service-log"
  mobileRoute?: string;              // "/vehicles/[id]/service-log"
}
```

Хелперы:

- `getPageHelp(key, platform)` — мёрж `base` + платформенный оверрайд.
- `resolvePageKeyFromWebPath(pathname)` — матч `usePathname()` против `webPathPattern`.
- `resolvePageKeyFromMobileRoute(segments)` — матч маршрута Expo Router.
- `getFeedbackStatusLabelRu(status)`, `getFeedbackTypeLabelRu(type)`.

Где UX совпадает — заполняем только `base`; где экраны различаются (например, нижняя навигация «Узлы» на mobile) — добавляем `web` / `mobile` оверрайды.

---

## 3. UI помощи

### Web
Глобальный компонент `HelpButton` (иконка «?» в шапке / плавающая кнопка):
- `usePathname()` → `resolvePageKeyFromWebPath()` → `pageKey`;
- открывает drawer с `summary` + `steps` + `tips`;
- внизу — кнопка «Сообщить о проблеме / предложить» → режим формы обратной связи.

### Mobile
`HelpSheet` (modal bottom-sheet), кнопка «?» в хедере экрана:
- `pageKey` из `useSegments()` / `usePathname()` Expo Router;
- тот же контент из реестра, RN-обвязка;
- `appVersion` берётся из `expo-constants`.

---

## 4. Сбор обратной связи и авто-контекст

Поля формы (минимум для пользователя):
- тип: «Проблема» / «Идея» / «Вопрос»;
- текст (обязательно, min ~5 символов).

E-mail не спрашиваем — пользователь залогинен, контакт берём из `User`.

Авто-контекст (собирается клиентом, пользователь не вводит):

```ts
interface FeedbackContext {
  pageKey: AppPageKey;
  platform: "web" | "ios" | "android";
  routePath: string;
  appVersion?: string;   // mobile: expo-constants; web: build version | null
  locale?: string;
  vehicleId?: string;    // если экран привязан к мотоциклу
  userAgent?: string;    // web; на сервере перезапишем достоверным
}
```

На бэкенде добавляются `userId` (из `getCurrentUserContext`), `ip`, серверный `userAgent` — по аналогии с `logAdminAction` / auth-audit.

---

## 5. Модель данных (Prisma)

Образец — `MotorcycleCatalogRequest` (status + reviewedBy/reviewedAt + comment).

```prisma
enum FeedbackStatus {
  NEW
  IN_PROGRESS
  RESOLVED
  REJECTED
}

enum FeedbackType {
  PROBLEM
  IDEA
  QUESTION
}

model Feedback {
  id            String         @id @default(cuid())
  status        FeedbackStatus @default(NEW)
  type          FeedbackType   @default(PROBLEM)

  message       String

  // авто-контекст
  pageKey       String
  platform      String         // web | ios | android
  routePath     String
  appVersion    String?
  locale        String?
  vehicleId     String?
  userAgent     String?
  contextJson   Json?          // запас на будущее

  // автор (всегда залогинен)
  submittedByUserId String?
  submittedBy       User?      @relation("FeedbackSubmittedBy", fields: [submittedByUserId], references: [id], onDelete: SetNull)

  // обработка
  adminNote         String?
  reviewedByUserId  String?
  reviewedBy        User?      @relation("FeedbackReviewedBy", fields: [reviewedByUserId], references: [id], onDelete: SetNull)
  reviewedAt        DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
  @@index([pageKey])
  @@index([platform])
  @@index([createdAt])
  @@map("feedback")
}
```

Миграция: локально `prisma migrate dev`, на проде `prisma migrate deploy` (как FUEL).

Статусы: NEW=«новое», IN_PROGRESS=«в работе», RESOLVED=«решено», REJECTED=«отклонено».

---

## 6. API

### Публичный приём
`POST /api/feedback`
- auth обязателен (`getCurrentUserContext()`); аноним → `401`.
- Валидация: `strictObject({...})` + `parseJsonBody({ maxBytes })` (стандарт MT-SEC-068/069).
- Сервер дополняет `userId/ip/userAgent`, создаёт `Feedback` со `status: NEW`.

### Админка
- `GET /api/admin/feedback` — `requireAnyAdmin()`; фильтры `status`, `type`, `platform`, `pageKey`, `q`, `page`; пагинация (паттерн `loadAdminUserList`).
- `PATCH /api/admin/feedback/[id]` — `requireAdminRole(["SUPER_ADMIN","MODERATOR"])`; меняет `status` + `adminNote`, проставляет `reviewedBy/reviewedAt`; `logAdminAction({ action: "feedback.status.change" })`.
- `GET /api/admin/feedback/export` — `requireAnyAdmin()`; NDJSON; те же фильтры + `ids=` для экспорта части.

Типы — `packages/types/src/admin.ts`: `AdminFeedbackListItemWire`, `AdminFeedbackDetailWire`, `AdminFeedbackListFilters`, `AdminFeedbackPatchPayload`; реэкспорт в `index.ts`.

---

## 7. Админка: раздел «Обратная связь»

- Пункт в `ADMIN_NAV_ITEMS` (`src/app/admin/_components/admin-nav-config.ts`):
  `{ key: "feedback", label: "Обратная связь", href: "/admin/feedback", icon: "MessageSquare", hasAlertDot: true }`
  (`hasAlertDot` зажигается при наличии `NEW`).
- `/admin/feedback` — `AdminPageChrome` + `AdminFilterBar` (status/type/platform/pageKey/поиск) + `AdminDataTable`.
  Колонки: дата, тип, страница (`pageKey` → заголовок из реестра), платформа, статус-чип, превью сообщения, автор.
- `/admin/feedback/[id]` — полный текст, весь авто-контекст, ссылки на `/admin/users/[id]` и `/admin/vehicles/[id]`, панель смены статуса + `adminNote` (паттерн `UserBlockPanel` / `StagingActions`).
- Чекбоксы выбора (selection в `AdminDataTable` уже есть после bulk-delete) — для экспорта выбранных строк.
- Опционально: счётчик `NEW` в дашборд-виджетах.

---

## 8. Экспорт для нейросети

`GET /api/admin/feedback/export`
- `format=ndjson` (по умолчанию и единственный на старте);
- фильтры: `status`, `type`, `platform`, `pageKey`, диапазон дат;
- `ids=...` — только выбранные строки;
- отдаётся как файл (`Content-Disposition: attachment`), как в `GET /api/admin/imports/template`.

Промпт-френдли запись:

```json
{"id":"...","createdAt":"...","type":"PROBLEM","status":"NEW","page":"Журнал ТО","pageKey":"vehicle.service-log","platform":"android","message":"...","appVersion":"...","userId":"...","routePath":"/vehicles/123/service-log"}
```

---

## 9. RBAC сводно

| Операция | Роли |
|----------|------|
| Отправить обратную связь | любой залогиненный пользователь |
| Список / детали / экспорт обращений | любой admin (`requireAnyAdmin`) |
| Смена статуса + `adminNote` | `SUPER_ADMIN`, `MODERATOR` |

---

## 10. Порядок реализации

1. [x] `packages/domain`: реестр страниц (`page-help-registry.ts`) + резолверы + лейблы + тесты (`page-help-registry.test.ts`).
2. [x] `packages/types`: wire-типы и payload'ы (`admin.ts`, реэкспорт в `index.ts`).
3. [x] Prisma: модель `Feedback` + enum'ы + миграция `add_feedback`.
4. [x] API: `POST /api/feedback`; admin `GET`/`PATCH` (`/api/admin/feedback`, `[id]`) + `export`. Метод `submitFeedback` в `@mototwin/api-client`.
5. [x] Web UI: `app-help-fab.tsx` page-aware + вкладка обратной связи.
6. [x] Mobile UI: `app-help-fab.tsx` (`HelpModal` page-aware, `HelpTriggerButton`, `appVersion` из `expo-constants`); `showHelp` по умолчанию включён в `ScreenHeader`/`InternalScreenChrome`.
7. [x] Admin: nav item + `/admin/feedback` список/детали/экспорт; локали в `_locales/ru.ts`.
8. [x] Документация: этот файл, `admin-panel-readme.md`, `api-backend.md`, заметка в `mototwin_recent_implementation_notes_ru.md`.
9. [ ] Деплой vps2 + `prisma migrate deploy` (выполняется отдельно).

---

## 11. Будущие расширения (вне MVP)

- Вложения/скриншоты к обращению (загрузка файлов + хранилище).
- Ответ пользователю по обращению (in-app notification / email).
- Анонимная обратная связь с rate-limit.
- Доп. форматы экспорта (CSV/Excel).
- Авто-категоризация обращений нейросетью прямо в админке.
