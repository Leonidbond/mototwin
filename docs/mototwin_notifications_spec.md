# MotoTwin - спецификация системы оповещений

## 1. Назначение

Система оповещений MotoTwin нужна, чтобы владелец мотоцикла не пропускал обслуживание, вовремя обновлял пробег и моточасы, видел просроченные работы и понимал, что нужно сделать сейчас, что скоро и что можно отложить.

Система должна работать в трех каналах:

- внутри интерфейса MotoTwin;
- по электронной почте;
- push-уведомлениями на телефон.

Ключевой принцип: уведомление должно вести не просто к просмотру текста, а к конкретному действию пользователя.

Примеры действий:

- обновить пробег;
- обновить моточасы;
- добавить сервисное событие;
- открыть узел;
- открыть журнал обслуживания;
- отметить уведомление как выполненное;
- временно отложить напоминание.

---

## 2. Роль системы в продукте

Оповещения не должны быть отдельным декоративным модулем. Это часть ядра Maintenance.

Связанные сущности:

- User;
- Vehicle;
- VehicleProfile;
- Node;
- ServiceRule;
- ServiceEvent;
- Reminder;
- Notification;
- NotificationDelivery;
- UserNotificationSettings;
- VehicleNotificationSettings;
- MileageHoursUpdateLog.

Оповещения должны опираться на детерминированную бизнес-логику:

- текущий пробег;
- текущие моточасы;
- дату последнего обновления пробега / моточасов;
- историю обслуживания;
- правила регламента;
- пользовательские настройки предупреждений;
- выбранные каналы доставки.

---

## 3. Типы уведомлений

### 3.1. Просроченное обслуживание

Показывается, если по узлу наступила просрочка хотя бы по одному из критериев:

- срок по дате уже прошел;
- пробег превысил следующий плановый пробег обслуживания;
- моточасы превысили следующий плановый интервал.

Пример:

> Замена масла просрочена 14 дней назад. Откройте узел или добавьте сервисное событие.

Уровень важности: critical.

Каналы по умолчанию:

- интерфейс: включено;
- email: включено;
- push: включено после разрешения пользователя.

### 3.2. Предстоящее обслуживание

Показывается заранее до наступления обслуживания. За сколько заранее предупреждать, пользователь задает в личном кабинете.

Настройки должны поддерживать три независимых порога:

- за сколько дней;
- за сколько километров;
- за сколько моточасов.

Пример:

> Через 300 км потребуется замена масла и масляного фильтра.

Уровень важности: warning.

Каналы по умолчанию:

- интерфейс: включено;
- email: включено;
- push: включено после разрешения пользователя.

### 3.3. Необходимо обновить пробег

Показывается, если пользователь давно не обновлял пробег мотоцикла.

Период задается в настройках профиля пользователя. Настройка может быть глобальной и переопределяться для конкретного мотоцикла.

Пример:

> Пробег не обновлялся 21 день. Обновите пробег, чтобы MotoTwin точно рассчитал обслуживание.

Уровень важности: info или warning, если есть зависимые регламенты.

Каналы по умолчанию:

- интерфейс: включено;
- email: включено;
- push: включено после разрешения пользователя.

### 3.4. Необходимо обновить моточасы

Показывается, если у мотоцикла включен учет моточасов и они давно не обновлялись.

Пример:

> Моточасы не обновлялись 14 дней. Это влияет на расчет обслуживания двигателя и подвески.

Уровень важности: info или warning.

Каналы по умолчанию:

- интерфейс: включено;
- email: включено;
- push: включено после разрешения пользователя.

### 3.5. Недостаточно данных для точного расчета

Показывается, если система не может надежно рассчитать регламент, потому что не хватает данных.

Сценарии:

- нет текущего пробега;
- нет моточасов, но для модели / узла они нужны;
- нет даты последнего обслуживания по критичному узлу;
- новый мотоцикл добавлен, но нет стартовых данных.

Пример:

> Для точного расчета обслуживания укажите текущий пробег и дату последней замены масла.

Уровень важности: info.

### 3.6. Сводка по мотоциклу

Периодическая сводка по состоянию мотоцикла.

Содержит:

- просроченные работы;
- ближайшие работы;
- узлы, где нужна актуализация пробега / моточасов;
- короткий статус по гаражу.

Рекомендуемый формат:

- Free: еженедельная сводка;
- Pro: гибкая настройка частоты.

---

## 4. Статусы уведомлений

Каждое уведомление должно иметь понятный жизненный цикл.

### 4.1. Notification status

- `new` - создано, еще не прочитано;
- `seen` - пользователь видел уведомление;
- `read` - пользователь открыл уведомление или страницу назначения;
- `snoozed` - пользователь отложил уведомление;
- `resolved` - причина уведомления устранена;
- `dismissed` - пользователь скрыл уведомление вручную;
- `expired` - уведомление больше неактуально.

### 4.2. Delivery status

Для каждого канала доставки хранится отдельный статус:

- `pending`;
- `sent`;
- `failed`;
- `skipped`;
- `muted`;
- `rate_limited`.

---

## 5. Приоритеты и визуальные уровни

### Critical

Для просроченных сервисных работ.

В интерфейсе:

- красный / danger accent;
- иконка внимания;
- текст короткий и прямой;
- основная кнопка: `Добавить обслуживание` или `Открыть узел`.

### Warning

Для предстоящего обслуживания и устаревших данных, которые влияют на расчет.

В интерфейсе:

- янтарный / amber accent;
- статус `Скоро`;
- основная кнопка: `Проверить` или `Обновить данные`.

### Info

Для мягких напоминаний, сводок и недостающих данных.

В интерфейсе:

- нейтральный или синий акцент;
- без агрессивной подсветки;
- кнопка действия присутствует, но не должна визуально спорить с critical/warning.

---

## 6. Логика расчета

## 6.1. Источники данных

Для расчета используются:

- `Vehicle.currentMileage`;
- `Vehicle.currentEngineHours`;
- `Vehicle.mileageUpdatedAt`;
- `Vehicle.engineHoursUpdatedAt`;
- `ServiceEvent.date`;
- `ServiceEvent.mileage`;
- `ServiceEvent.engineHours`;
- `ServiceRule.intervalDays`;
- `ServiceRule.intervalMileageKm`;
- `ServiceRule.intervalEngineHours`;
- `UserNotificationSettings`;
- `VehicleNotificationSettings`.

## 6.2. Расчет следующего обслуживания

Для каждого активного `ServiceRule` система ищет последнее релевантное `ServiceEvent` по связке:

- vehicle;
- node;
- service operation.

Затем считает три независимых значения:

- следующая дата обслуживания;
- следующий пробег обслуживания;
- следующие моточасы обслуживания.

Финальный статус определяется по правилу "что наступит раньше".

## 6.3. Статус Soon

Статус `Soon` возникает, если хотя бы одно условие выполнено:

- до даты обслуживания осталось меньше или равно `daysBeforeService`;
- до планового пробега осталось меньше или равно `kmBeforeService`;
- до плановых моточасов осталось меньше или равно `hoursBeforeService`.

## 6.4. Статус Overdue

Статус `Overdue` возникает, если хотя бы одно условие выполнено:

- текущая дата больше плановой даты обслуживания;
- текущий пробег больше планового пробега обслуживания;
- текущие моточасы больше плановых моточасов обслуживания.

## 6.5. Устаревший пробег

Система создает уведомление `mileage_update_required`, если:

- у мотоцикла есть пробег;
- `mileageUpdatedAt` старше заданного пользователем периода;
- мотоцикл не переведен в режим хранения / зимовки;
- такое уведомление не было создано недавно или не отложено.

## 6.6. Устаревшие моточасы

Система создает уведомление `engine_hours_update_required`, если:

- для мотоцикла включен учет моточасов;
- `engineHoursUpdatedAt` старше заданного пользователем периода;
- мотоцикл не переведен в режим хранения / зимовки;
- такое уведомление не было создано недавно или не отложено.

## 6.7. Подавление дублей

Одинаковое уведомление не должно создаваться бесконечно.

Ключ дедупликации:

- userId;
- vehicleId;
- notificationType;
- nodeId optional;
- serviceRuleId optional;
- period bucket.

Пример period bucket:

- день для critical;
- неделя для warning;
- пользовательский период для update reminders.

---

## 7. Настройки уведомлений

## 7.1. Глобальные настройки профиля

Страница: `Профиль -> Оповещения`.

Блоки:

1. Каналы уведомлений.
2. Предстоящее обслуживание.
3. Обновление пробега и моточасов.
4. Тихие часы.
5. Сводки.
6. Настройки по мотоциклам.

### Каналы уведомлений

Пользователь может отдельно включить / выключить:

- уведомления в интерфейсе;
- email;
- push на телефон.

Важно: критичные уведомления внутри интерфейса нельзя полностью отключить. Их можно только скрывать после прочтения или отложить.

### Предстоящее обслуживание

Поля:

- `Предупреждать за N дней`;
- `Предупреждать за N км`;
- `Предупреждать за N моточасов`.

Рекомендуемые значения по умолчанию:

- 14 дней;
- 500 км;
- 10 моточасов.

### Обновление пробега и моточасов

Поля:

- `Напоминать обновить пробег, если не обновлялся N дней`;
- `Напоминать обновить моточасы, если не обновлялись N дней`;
- чекбокс `Не напоминать, если мотоцикл в режиме хранения`.

Рекомендуемые значения по умолчанию:

- пробег: 14 дней;
- моточасы: 14 дней;
- хранение: включено.

### Тихие часы

Поля:

- время начала;
- время окончания;
- часовой пояс;
- все push в тихие часы откладываются до ближайшего разрешенного окна.

### Сводки

Поля:

- получать еженедельную сводку;
- день недели;
- время отправки;
- канал: email / push / оба.

## 7.2. Настройки по конкретному мотоциклу

Страница: `Мотоцикл -> Настройки -> Оповещения`.

Пользователь может переопределить:

- период напоминания об обновлении пробега;
- период напоминания об обновлении моточасов;
- пороги предстоящего ТО;
- каналы уведомлений для конкретного мотоцикла;
- режим хранения / зимовки.

Пример:

- для дорожного BMW напоминать раз в 14 дней;
- для эндуро KTM напоминать о моточасах раз в 7 дней;
- зимой не требовать обновлять пробег.

---

## 8. Интерфейсы

## 8.1. Верхняя панель: колокольчик уведомлений

На desktop в правой части верхней панели размещается иконка уведомлений.

Состояния:

- нет уведомлений: обычная иконка;
- есть новые: точка с количеством;
- есть critical: точка или бейдж в danger-стиле.

По клику открывается dropdown.

Состав dropdown:

- заголовок `Оповещения`;
- счетчики: `Просрочено`, `Скоро`, `Данные`;
- 3-5 последних уведомлений;
- кнопка `Открыть все`;
- ссылка `Настройки`.

Карточка уведомления в dropdown:

- иконка типа;
- статус;
- название мотоцикла;
- короткий текст;
- время;
- мини-действие.

Пример:

```text
[!] KTM 890 Adventure
Замена масла просрочена на 14 дней
[Добавить ТО]
```

## 8.2. Центр уведомлений

Страница: `Оповещения`.

Desktop layout:

- левая колонка: фильтры;
- центральная колонка: список уведомлений;
- правая колонка: детали выбранного уведомления.

Фильтры:

- все;
- просрочено;
- скоро;
- обновить пробег / моточасы;
- информационные;
- прочитанные;
- скрытые / отложенные.

Сортировка:

- сначала важные;
- сначала новые;
- по мотоциклу;
- по сроку обслуживания.

Карточка уведомления:

- severity badge;
- тип уведомления;
- мотоцикл;
- узел;
- краткая причина;
- дата создания;
- канал доставки;
- CTA.

Правая панель деталей:

- полный текст;
- почему уведомление появилось;
- расчет: дата / км / моточасы;
- связанные действия;
- история доставок;
- кнопки: `Выполнить`, `Отложить`, `Скрыть`, `Настройки`.

## 8.3. Mobile notification center

На мобильном интерфейсе центр уведомлений открывается отдельной страницей или bottom sheet.

Рекомендуемый вариант: отдельная страница с sticky-фильтрами сверху.

Структура:

- top bar: `Оповещения` + кнопка настроек;
- горизонтальные chips-фильтры;
- список карточек;
- bottom action sheet при нажатии на уведомление.

Карточка должна быть плотной:

- строка 1: статус + мотоцикл;
- строка 2: суть;
- строка 3: срок / причина;
- нижняя строка: основная кнопка.

## 8.4. Блок на странице мотоцикла

На странице мотоцикла должен быть компактный блок `Требует внимания`.

Показывать максимум 3 самых важных уведомления:

1. просроченные;
2. предстоящие;
3. обновление пробега / моточасов.

Если уведомлений больше, показывать ссылку:

`Еще 5 уведомлений`.

Формат:

```text
Требует внимания
[Просрочено] Замена масла - 14 дней
[Скоро] Передние колодки - через 300 км
[Данные] Пробег не обновлялся 21 день
```

## 8.5. Быстрое обновление пробега и моточасов

При клике на уведомление об обновлении данных открывается компактная форма.

Desktop:

- модальное окно или правая панель.

Mobile:

- bottom sheet.

Поля:

- текущий пробег;
- текущие моточасы;
- дата обновления;
- чекбокс `Сразу пересчитать обслуживание`;
- кнопка `Сохранить`.

После сохранения:

- обновить `Vehicle.currentMileage`;
- обновить `Vehicle.currentEngineHours`;
- создать `MileageHoursUpdateLog`;
- пересчитать статусы;
- закрыть уведомление как `resolved`;
- показать результат пересчета.

Текст результата:

```text
Данные обновлены. Найдено 2 предстоящих обслуживания.
```

## 8.6. Экран настроек профиля

Страница `Профиль -> Оповещения` должна быть простой, без перегруза.

Рекомендуемая структура:

```text
Оповещения
Настройте, когда и как MotoTwin будет напоминать об обслуживании и обновлении данных.

[Каналы]
В интерфейсе     включено
Email            включено
Push             подключить / включено

[Предстоящее обслуживание]
За 14 дней
За 500 км
За 10 моточасов

[Пробег и моточасы]
Пробег: напоминать через 14 дней без обновления
Моточасы: напоминать через 14 дней без обновления
Не напоминать в режиме хранения: включено

[Сводка]
Еженедельно, понедельник, 09:00

[Сохранить]
```

## 8.7. Экран настроек мотоцикла

Страница `Мотоцикл -> Настройки -> Оповещения`.

Состав:

- переключатель `Использовать общие настройки профиля`;
- если выключен, показать локальные настройки;
- режим хранения;
- частота обновления пробега;
- частота обновления моточасов;
- пороги предстоящего ТО;
- тестовое уведомление.

---

## 9. Push и email тексты

## 9.1. Push: просрочка

Title:

`MotoTwin: обслуживание просрочено`

Body:

`KTM 890 Adventure: замена масла просрочена на 14 дней.`

Action:

`Добавить ТО`

## 9.2. Push: скоро обслуживание

Title:

`Скоро обслуживание`

Body:

`BMW R 1250 GS: передние колодки через 300 км.`

Action:

`Открыть узел`

## 9.3. Push: обновить пробег

Title:

`Обновите пробег`

Body:

`Пробег KTM 690 Enduro не обновлялся 21 день.`

Action:

`Обновить`

## 9.4. Email: просрочка

Subject:

`MotoTwin: есть просроченное обслуживание`

Body structure:

- приветствие;
- мотоцикл;
- список просроченных работ;
- почему это важно;
- кнопка `Открыть MotoTwin`;
- ссылка на настройки уведомлений.

## 9.5. Email: еженедельная сводка

Subject:

`Сводка MotoTwin по вашему гаражу`

Body structure:

- количество мотоциклов;
- просрочено;
- скоро;
- нужно обновить данные;
- последние сервисные события;
- CTA.

---

## 10. Data model

## 10.1. UserNotificationSettings

```prisma
model UserNotificationSettings {
  id                         String   @id @default(cuid())
  userId                     String   @unique

  inAppEnabled               Boolean  @default(true)
  emailEnabled               Boolean  @default(true)
  pushEnabled                Boolean  @default(false)

  daysBeforeService          Int      @default(14)
  kmBeforeService            Int      @default(500)
  hoursBeforeService         Int      @default(10)

  mileageStaleAfterDays      Int      @default(14)
  engineHoursStaleAfterDays  Int      @default(14)
  suppressWhenStored         Boolean  @default(true)

  weeklyDigestEnabled        Boolean  @default(true)
  weeklyDigestDay            Int      @default(1)
  weeklyDigestHour           Int      @default(9)

  quietHoursEnabled          Boolean  @default(false)
  quietHoursStart            String?
  quietHoursEnd              String?
  timezone                   String   @default("Europe/Moscow")

  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
}
```

## 10.2. VehicleNotificationSettings

```prisma
model VehicleNotificationSettings {
  id                         String   @id @default(cuid())
  userId                     String
  vehicleId                  String   @unique

  useUserDefaults            Boolean  @default(true)
  notificationsEnabled       Boolean  @default(true)
  inAppEnabled               Boolean?
  emailEnabled               Boolean?
  pushEnabled                Boolean?

  isStored                   Boolean  @default(false)
  storedUntil                DateTime?

  daysBeforeService          Int?
  kmBeforeService            Int?
  hoursBeforeService         Int?

  mileageStaleAfterDays      Int?
  engineHoursStaleAfterDays  Int?

  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
}
```

## 10.3. Notification

```prisma
model Notification {
  id              String   @id @default(cuid())
  userId          String
  vehicleId       String?
  nodeId          String?
  serviceRuleId   String?

  type            NotificationType
  severity        NotificationSeverity
  status          NotificationStatus @default(new)

  title           String
  body            String
  actionLabel     String?
  actionUrl       String?

  dueDate         DateTime?
  dueMileageKm    Int?
  dueEngineHours  Int?

  dedupeKey       String
  createdAt       DateTime @default(now())
  seenAt          DateTime?
  readAt          DateTime?
  snoozedUntil    DateTime?
  resolvedAt      DateTime?
  dismissedAt     DateTime?
}
```

## 10.4. NotificationDelivery

```prisma
model NotificationDelivery {
  id              String   @id @default(cuid())
  notificationId  String
  channel         NotificationChannel
  status          NotificationDeliveryStatus @default(pending)
  sentAt          DateTime?
  failedAt        DateTime?
  errorMessage    String?
  providerMessageId String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 10.5. PushSubscription

```prisma
model PushSubscription {
  id            String   @id @default(cuid())
  userId        String
  channelType   PushChannelType
  provider      PushProvider
  platform      PushPlatform
  token         String
  endpoint      String?
  p256dh        String?
  auth          String?
  userAgent     String?
  deviceId      String?
  deviceName    String?
  appVersion    String?
  osVersion     String?
  locale        String?
  timezone      String?
  enabled       Boolean  @default(true)
  lastSeenAt    DateTime @default(now())
  invalidatedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 10.6. MileageHoursUpdateLog

```prisma
model MileageHoursUpdateLog {
  id             String   @id @default(cuid())
  userId         String
  vehicleId      String
  mileageKm      Int?
  engineHours    Int?
  source         UsageUpdateSource @default(manual)
  createdAt      DateTime @default(now())
}
```

## 10.7. Enums

```prisma
enum NotificationType {
  service_overdue
  service_upcoming
  mileage_update_required
  engine_hours_update_required
  missing_service_data
  weekly_digest
}

enum NotificationSeverity {
  info
  warning
  critical
}

enum NotificationStatus {
  new
  seen
  read
  snoozed
  resolved
  dismissed
  expired
}

enum NotificationChannel {
  in_app
  email
  push_web
  push_mobile
}

enum NotificationDeliveryStatus {
  pending
  sent
  failed
  skipped
  muted
  rate_limited
}

enum PushChannelType {
  web_push
  mobile_push
}

enum PushProvider {
  webpush
  expo
  fcm
  apns
}

enum PushPlatform {
  web
  ios
  android
}

enum UsageUpdateSource {
  manual
  service_event
  import
  telemetry
}
```

---

## 11. API routes

## 11.1. Notification settings

```text
GET    /api/notification-settings
PATCH  /api/notification-settings
GET    /api/vehicles/:vehicleId/notification-settings
PATCH  /api/vehicles/:vehicleId/notification-settings
```

## 11.2. Notifications

```text
GET    /api/notifications
PATCH  /api/notifications/:notificationId/read
PATCH  /api/notifications/:notificationId/seen
PATCH  /api/notifications/:notificationId/snooze
PATCH  /api/notifications/:notificationId/dismiss
POST   /api/notifications/recalculate
```

## 11.3. Usage update

```text
POST   /api/vehicles/:vehicleId/usage-update
```

Payload:

```json
{
  "mileageKm": 24500,
  "engineHours": 132,
  "recalculateReminders": true
}
```

## 11.4. Push subscriptions

```text
POST   /api/push-subscriptions
DELETE /api/push-subscriptions/:id
POST   /api/push-subscriptions/test
```

Payload для регистрации подписки:

```json
{
  "channelType": "mobile_push",
  "provider": "expo",
  "platform": "ios",
  "token": "ExponentPushToken[xxxx]",
  "deviceId": "ios-vendor-id",
  "deviceName": "iPhone 15 Pro",
  "appVersion": "0.1.0",
  "osVersion": "18.5",
  "locale": "ru-RU",
  "timezone": "Europe/Moscow"
}
```

Payload для Web Push:

```json
{
  "channelType": "web_push",
  "provider": "webpush",
  "platform": "web",
  "token": "https://fcm.googleapis.com/fcm/send/xxx",
  "endpoint": "https://fcm.googleapis.com/fcm/send/xxx",
  "p256dh": "base64url-key",
  "auth": "base64url-auth",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 11.5. Deep link contract для уведомлений

`Notification.actionUrl` хранит относительный путь и query-параметры, например:

- `/vehicles/:vehicleId/service-events/new?nodeId=:nodeId`
- `/vehicles/:vehicleId/nodes?nodeId=:nodeId` (уведомление «Открыть узел»)
- `/vehicles/:vehicleId?openVehicleState=1&focus=mileage` (обновление пробега; web открывает модалку на дашборде)
- Legacy: `/vehicles/:vehicleId/state?focus=mileage` — web redirect → `?openVehicleState=1`; Expo — экран `state`
- `/notifications?notificationId=:id`

Правила:

- для web — переход в Next.js route; inbox `/notifications` показывает кнопку с `actionLabel` и выполняет переход (legacy `/state` нормализуется перед push);
- для mobile — переход в Expo Router route с тем же path;
- если пользователь не авторизован, сохраняется `returnTo` и после входа выполняется возврат;
- запрещены внешние URL, кроме allowlist доменов продукта.

---

## 11.6. Quiet hours delivery policy

- любые push (`push_web`, `push_mobile`) в тихие часы получают delivery status `muted`;
- уведомление ставится в отложенную отправку на ближайшее окно после quiet hours;
- при выходе из quiet hours отправляется последняя актуальная версия по `dedupeKey` (без дублей в периоде);
- in-app создается сразу и не откладывается.

---

## 12. Компоненты UI

Рекомендуемые компоненты:

- `NotificationBell`;
- `NotificationDropdown`;
- `NotificationCenterPage`;
- `NotificationList`;
- `NotificationCard`;
- `NotificationDetailPanel`;
- `NotificationFilters`;
- `NotificationSettingsPage`;
- `VehicleNotificationSettingsPanel`;
- `UsageUpdateSheet`;
- `NotificationDigestCard`;
- `PushPermissionCard`;
- `VehicleAttentionBlock`.

---

## 13. Empty states

### Нет уведомлений

Текст:

`Все спокойно. Просроченных работ и срочных напоминаний нет.`

Дополнительный текст:

`MotoTwin сообщит, когда потребуется обслуживание или обновление пробега.`

### Push не подключен

Текст:

`Push-уведомления не подключены.`

CTA:

`Подключить push`

### Нет данных для расчета

Текст:

`Недостаточно данных для точных напоминаний.`

CTA:

`Заполнить данные мотоцикла`

---

## 14. MVP implementation order

### Step 1. In-app notifications

- модели настроек;
- генерация уведомлений;
- центр уведомлений;
- блок на странице мотоцикла;
- обновление пробега и моточасов.

### Step 2. Email notifications

- шаблоны email;
- отправка critical и weekly digest;
- настройки email;
- unsubscribe / mute logic.

### Step 3. Push notifications

- push subscription;
- permission flow;
- отправка push;
- тестовое уведомление;
- обработка ошибок доставки.

### Step 4. Per-vehicle refinement

- настройки по мотоциклу;
- режим хранения;
- разные пороги для разных мотоциклов.

---

## 15. Acceptance criteria

Система считается готовой в MVP, если пользователь может:

1. открыть центр уведомлений;
2. увидеть просроченные сервисные работы;
3. увидеть предстоящие работы;
4. настроить, за сколько дней / км / моточасов предупреждать о предстоящем ТО;
5. настроить период напоминания об обновлении пробега;
6. настроить период напоминания об обновлении моточасов;
7. получить уведомление внутри интерфейса;
8. получить email-уведомление;
9. подключить push-уведомления;
10. получить push-уведомление;
11. открыть уведомление и перейти к нужному действию;
12. обновить пробег из уведомления;
13. обновить моточасы из уведомления;
14. после обновления данных увидеть пересчитанные статусы;
15. отложить уведомление;
16. скрыть уведомление;
17. увидеть, что устраненное уведомление больше не висит как активное.

---

## 16. Главный принцип UX

Уведомление не должно быть шумом.

Каждое уведомление должно отвечать на 4 вопроса:

1. Что случилось?
2. С каким мотоциклом?
3. Почему это важно?
4. Что сделать дальше?

Формула текста:

`[Мотоцикл]: [узел / событие] [статус]. [Следующее действие].`

Пример:

`KTM 890 Adventure: замена масла просрочена на 14 дней. Добавьте сервисное событие или откройте узел.`

---

## 17. Что не делать в первой версии

Не нужно в MVP:

- строить сложную маркетинговую automation-систему;
- делать чат-уведомления;
- делать социальные уведомления;
- делать уведомления по акциям магазинов;
- делать интеграции с сервисами;
- делать telemetry push без отдельного connected-модуля;
- делать сложную аналитику эффективности уведомлений.

Сначала нужно закрыть главный сценарий: обслуживание, просрочка, предстоящее ТО, актуальность пробега и моточасов.
