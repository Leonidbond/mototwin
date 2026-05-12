# MotoTwin — Система пользовательского добавления деталей и community-fitment
## Функциональная спецификация v1.0

---

# 1. Назначение

Документ описывает функционал пользовательского добавления деталей и community-driven системы проверки совместимости деталей в MotoTwin.

Назначение системы:

- позволить пользователям добавлять свои детали в базу MotoTwin;
- фиксировать реальный опыт установки;
- подтверждать совместимость с конкретными моделями мотоциклов;
- формировать структурированную базу знаний по совместимости;
- улучшать рекомендации для владельцев одинаковых моделей.

Функционал является частью архитектуры MotoTwin v5.1.

---

# 2. Главный продуктовый принцип

MotoTwin не рассматривает совместимость как простую статическую связь между деталью и категорией.

Совместимость всегда оценивается как:

```text
Деталь + ModelVariant + Узел
```

Пример:

```text
EBC FA209HH
+
BMW R1250GS Adventure 2022
+
Передние тормозные колодки
```

Это означает:

- одна и та же деталь может подходить одной модели и не подходить другой;
- одна и та же деталь может подходить одной модификации и не подходить другой;
- совместимость всегда должна быть привязана к конкретной модели и конкретному узлу.

При этом MotoTwin v5.1 НЕ заменяет существующую structured fitment архитектуру пользовательскими отчетами.

Система использует гибридную модель:

1. structured fitment rules;
2. configuration-based compatibility;
3. user-submitted fitment reports;
4. community validation;
5. confidence aggregation.

User-generated fitment является дополнительным knowledge layer, а не заменой deterministic fitment logic.

MotoTwin по-прежнему сохраняет существующую data-first архитектуру:

- ModelVariant;
- VehicleConfig;
- Node;
- PartMaster;
- FitmentRule.

Именно structured compatibility rules остаются primary source of truth для:

- OEM compatibility;
- базовых расходников;
- известных fitment-case;
- safety-critical compatibility;
- core recommendation engine.

Community-fitment слой используется для:

- aftermarket compatibility;
- нестандартных решений;
- аналогов;
- fitment с доработками;
- long-tail моделей;
- накопления практического опыта владельцев.

MotoTwin строит fitment через:

- structured compatibility rules;
- configuration matching;
- пользовательские отчеты об установке;
- community validation;
- confidence score;
- агрегированную structured fitment модель.

---

# 3. Общая архитектура

Система состоит из 6 основных слоев:

1. Structured Fitment Rules
2. Part Catalog
3. Replacement Cart
4. Fitment Reports
5. Community Validation
6. Confidence Engine

---

# 4. Основные пользовательские сценарии

## 4.1. Сценарий A — добавление детали через Service Event

Это основной и наиболее качественный сценарий.

### Логика

Пользователь:

1. создает сервисное событие;
2. указывает установленные детали;
3. сохраняет событие.

После сохранения MotoTwin предлагает:

```text
Поделиться совместимостью этой детали с другими владельцами?
```

Если пользователь соглашается:

- создается Fitment Report;
- Service Event становится подтверждающим evidence;
- совместимость становится доступной для владельцев такой же модели.

---

## 4.2. Сценарий B — добавление детали через страницу «Подбор детали»

Это второй основной вход в функционал.

На странице «Подбор детали» добавляется кнопка:

```text
Добавить свою деталь
```

Страница уже существует как часть workflow подбора расходников и замен.

### Логика

Пользователь:

1. открывает страницу подбора;
2. выбирает узел или категорию;
3. нажимает «Добавить свою деталь»;
4. ищет существующую деталь или создает новую;
5. указывает статус установки;
6. при необходимости создает fitment-report.

---

# 5. Важное правило продукта

Добавление детали в корзину замен не означает подтверждение совместимости.

Совместимость появляется только после:

- факта установки;
- создания fitment-report;
- опционального community confirmation.

---

# 6. Логика Replacement Cart

Replacement Cart выполняет роль:

- списка планируемых замен;
- списка расходников;
- трекера покупок;
- источника будущих fitment-report.

---

# 7. Сущность ReplacementCartItem

```ts
ReplacementCartItem {
  id

  vehicleId
  modelVariantId
  nodeId

  partId

  source:
    "RECOMMENDATION" |
    "USER_ADDED"

  status:
    "PLANNED" |
    "PURCHASED" |
    "INSTALLED" |
    "REJECTED"

  quantity?
  comment?

  createdByUserId

  createdAt
  updatedAt
}
```

---

# 8. Статусы ReplacementCartItem

## PLANNED

Пользователь добавил деталь как планируемую замену.

Совместимость еще не подтверждена.

---

## PURCHASED

Деталь куплена, но еще не установлена.

Это также не считается подтверждением fitment.

---

## INSTALLED

Деталь установлена.

MotoTwin предлагает:

```text
Создать fitment-report?
```

---

## REJECTED

Пользователь попробовал деталь и отказался от нее.

Может использоваться как негативный сигнал совместимости.

---

# 9. Workflow добавления детали

## Шаг 1 — запуск flow добавления детали

Пользователь нажимает:

```text
Добавить свою деталь
```

Точка входа:

- страница подбора детали;
- корзина замен;
- сервисное событие.

---

## Шаг 2 — поиск существующей детали

Поля поиска:

- SKU / артикул;
- бренд;
- название.

Система должна:

- искать в PartMaster;
- нормализовывать SKU;
- искать дубли.

---

# 10. Логика поиска дублей

Перед созданием новой детали:

- SKU нормализуется;
- сравниваются:
  - бренд;
  - normalized SKU;
  - aliases.

Пользователю показываются возможные совпадения.

Пример:

```text
Возможно, эта деталь уже существует:
- EBC FA209HH
- EBC FA209 HH
- FA209HH
```

Пользователь должен по возможности переиспользовать существующую карточку детали.

---

# 11. Создание новой детали

Если деталь не найдена, пользователь создает новую карточку PartMaster.

---

# 12. Сущность PartMaster

```ts
PartMaster {
  id

  brand
  sku
  normalizedSku

  title

  category
  subcategory?

  description?
  imageUrl?

  aliases?

  source:
    "ADMIN" |
    "USER"

  status:
    "DRAFT" |
    "PENDING_REVIEW" |
    "ACTIVE" |
    "MERGED" |
    "REJECTED"

  createdByUserId?

  createdAt
  updatedAt
}
```

---

# 13. Минимально обязательные поля

Обязательные:

- бренд;
- SKU;
- название;
- категория.

Опциональные:

- описание;
- фото;
- aliases.

---

# 14. Начальный статус новой детали

Новая пользовательская деталь получает статус:

```text
PENDING_REVIEW
```

или:

```text
ACTIVE_LIMITED
```

в зависимости от выбранной moderation strategy.

В UI должен отображаться бейдж:

```text
Добавлено пользователем
```

---

# 15. Создание Fitment Report

Данные о совместимости хранятся отдельно от самой детали.

Деталь существует глобально.

Совместимость существует в двух слоях:

1. deterministic fitment layer;
2. community fitment layer.

Structured compatibility может существовать даже без пользовательских отчетов.

Community compatibility появляется через Fitment Reports.

---

# 15.1. Existing Structured Fitment Logic

В проекте уже существует базовая fitment-архитектура.

Она должна быть сохранена.

Community-fitment НЕ должен ломать или заменять существующую deterministic compatibility model.

## Existing compatibility architecture

Совместимость в MotoTwin уже строится через:

```text
ModelVariant
+
VehicleConfig
+
Node
+
FitmentRule
+
PartMaster
```

## Existing FitmentRule logic

FitmentRule описывает:

- какие детали совместимы;
- с какими моделями;
- с какими конфигурациями;
- с какими узлами.

Примеры VehicleConfig:

- EFI / carb;
- тип охлаждения;
- размер колес;
- тип тормозной системы;
- chain setup;
- OEM sprocket sizes;
- ABS / non-ABS;
- поколение модели.

## Existing deterministic layer remains primary

Structured fitment остается основным источником истины для:

- OEM compatibility;
- базовых расходников;
- verified compatibility;
- core recommendations;
- reminder engine dependencies;
- safety-critical parts.

## Community-fitment acts as secondary layer

User-generated fitment расширяет систему:

- aftermarket compatibility;
- нестандартные решения;
- аналоги;
- детали с доработками;
- long-tail compatibility;
- редкие конфигурации;
- реальные кейсы эксплуатации.

## Recommendation priority

Recommendation engine должен учитывать приоритет источников.

### Highest priority

- Verified structured fitment;
- OEM compatibility;
- admin-verified compatibility.

### Medium priority

- high-confidence community fitment;
- multiple confirmed reports.

### Lower priority

- low-confidence reports;
- experimental fitment;
- modification-based fitment.

## UI logic

В интерфейсе пользователь должен видеть различие между:

```text
Verified by MotoTwin
```

и:

```text
Community confirmed
```

Это критично для сохранения доверия к системе.

## Safety-critical principle

Для safety-critical категорий deterministic fitment должен иметь более высокий приоритет, чем community reports.

Особенно для:

- тормозов;
- подвески;
- двигателя;
- электроники.

Community-fitment не должен автоматически переопределять verified compatibility rules.

---

# 16. Сущность FitmentReport

```ts
FitmentReport {
  id

  partId

  vehicleId
  modelVariantId

  nodeId

  fitmentResult:
    "DIRECT_FIT" |
    "FIT_WITH_MODIFICATION" |
    "PARTIAL_FIT" |
    "DOES_NOT_FIT" |
    "OEM_REPLACEMENT"

  installationStatus:
    "INSTALLED" |
    "PURCHASED_NOT_INSTALLED" |
    "TESTED_NOT_INSTALLED"

  modificationRequired: boolean

  modificationDetails?

  comment?

  installedAtMileage?
  installedAtHours?

  rideProfileSnapshot?

  rating?

  serviceEventId?

  status:
    "PENDING" |
    "PUBLISHED" |
    "NEEDS_REVIEW" |
    "HIDDEN" |
    "REJECTED"

  createdByUserId

  createdAt
  updatedAt
}
```

---

# 17. Главное правило совместимости

Совместимость никогда не является глобальной.

Она всегда должна быть привязана:

- к конкретной модели;
- к конкретной модификации;
- к конкретному узлу.

---

# 18. Типы результатов совместимости

## DIRECT_FIT

Подходит без доработок.

---

## FIT_WITH_MODIFICATION

Подходит только с доработками.

Требуется описание доработки.

---

## PARTIAL_FIT

Частичная или неуверенная совместимость.

---

## DOES_NOT_FIT

Деталь несовместима.

Используется как негативный сигнал для confidence engine.

---

## OEM_REPLACEMENT

Полный OEM-эквивалент.

---

# 19. Fitment Evidence

Fitment-report может содержать подтверждающие материалы.

---

# 20. Сущность FitmentEvidence

```ts
FitmentEvidence {
  id

  reportId

  type:
    "PART_PHOTO" |
    "PACKAGING_PHOTO" |
    "INSTALLED_PHOTO" |
    "RECEIPT" |
    "SERVICE_EVENT"

  fileUrl

  createdAt
}
```

---

# 21. Рекомендуемые подтверждения

Рекомендуется поддерживать:

- фото упаковки;
- фото установленной детали;
- фото SKU;
- связанное сервисное событие.

Для safety-critical категорий evidence желательно делать обязательным.

---

# 22. Safety-critical категории

Особые правила модерации должны действовать для:

- тормозов;
- подвески;
- электроники;
- двигателя;
- критичных крепежных элементов.

Для них можно требовать:

- обязательное фото;
- более высокий confidence threshold;
- ручную модерацию.

---

# 23. Community Validation

Другие пользователи могут подтверждать или опровергать fitment-report.

---

# 24. Сущность FitmentVote

```ts
FitmentVote {
  id

  reportId
  userId

  voteType:
    "CONFIRM" |
    "REJECT" |
    "SAME_EXPERIENCE" |
    "DIFFERENT_EXPERIENCE" |
    "HELPFUL"

  comment?

  createdAt
}
```

---

# 25. UX-формулировки для голосования

Не использовать:

- лайки;
- дизлайки;
- social-style реакции.

Использовать:

- «У меня тоже подошло»
- «У меня не подошло»
- «Такой же опыт»
- «Другой опыт»
- «Полезный отчет»

Community MotoTwin должен оставаться утилитарным.

---

# 26. Confidence Engine

MotoTwin агрегирует сигналы совместимости в confidence status.

---

# 27. Сущность FitmentConfidence

```ts
FitmentConfidence {
  id

  partId
  modelVariantId
  nodeId

  confidenceScore

  reportCount
  confirmationCount
  rejectionCount
  modificationCount

  status:
    "VERIFIED_BY_MOTOTWIN" |
    "COMMUNITY_CONFIRMED" |
    "FITS_WITH_MODIFICATION" |
    "MIXED_REPORTS" |
    "LOW_CONFIDENCE" |
    "REJECTED_LIKELY_INCOMPATIBLE"

  lastRecalculatedAt
}
```

---

# 28. MVP-логика confidence status

## LOW_CONFIDENCE

- только 1 отчет;
- нет подтверждений;
- нет evidence.

---

## COMMUNITY_CONFIRMED

- несколько подтверждений;
- нет серьезных конфликтов;
- хорошие evidence.

---

## FITS_WITH_MODIFICATION

- есть отчеты с доработками.

---

## MIXED_REPORTS

- есть конфликтующие подтверждения и отказы.

---

## REJECTED_LIKELY_INCOMPATIBLE

- много негативных отчетов.

---

## VERIFIED_BY_MOTOTWIN

- подтверждено модератором или администратором.

---

# 29. Логика рекомендаций

Рекомендации должны строиться не только на существовании детали.

Должны использоваться:

- confidence score;
- количество подтверждений;
- ride profile;
- качество отчетов;
- успешность установки.

---

# 30. Типы рекомендаций

## Most Confirmed

Деталь с наибольшим количеством подтверждений.

---

## Best for Your Riding Style

Деталь, наиболее подходящая под ride profile пользователя.

---

## Best Value from Community

Высокий confidence + хорошее community value.

---

# 31. UI-экраны

Для функционала требуются следующие интерфейсы.

---

# 32. Экран / модальное окно добавления детали

Содержит:

- поиск существующей детали;
- создание новой детали;
- статус установки;
- fitment result;
- загрузку evidence;
- комментарии.

---

# 33. Карточка детали

Содержит:

- название;
- SKU;
- категорию;
- статусы совместимости;
- поддерживаемые модели;
- fitment reports;
- подтверждения / отказы;
- gallery evidence.

---

# 34. Страница деталей узла

Для выбранной модели и узла:

- рекомендации;
- confidence statuses;
- community reports;
- кнопка «Добавить свою деталь».

---

# 35. Страница модерации

Содержит:

- новые детали;
- кандидаты на merge дублей;
- конфликтующие отчеты;
- low-quality reports;
- safety-critical pending reports.

---

# 36. Принципы модерации

Цель модерации — не вручную строить весь каталог.

Цель модерации:

- поддерживать доверие;
- объединять дубли;
- убирать спам;
- разрешать конфликты.

---

# 37. Contributor Trust

Полноценная reputation system не требуется для MVP.

На старте достаточно простых сигналов:

- пользователь действительно владеет этой моделью;
- report связан с service event;
- есть фото;
- есть community confirmations.

Полная reputation system может быть добавлена позже.

---

# 38. Интеграция с Service Events

Это один из самых сильных механизмов системы.

После добавления сервисного события MotoTwin должен автоматически предлагать создать fitment-report.

Это:

- снижает friction;
- повышает качество данных;
- превращает service history в community knowledge.

---

# 39. Интеграция с Expenses

Установленные детали могут быть связаны с:

- ExpenseEvent;
- ReplacementCartItem;
- ServiceEvent.

Это формирует единую ownership history.

---

# 40. Продуктовая философия

MotoTwin не должен обещать:

```text
Мы заранее знаем совместимость всего.
```

MotoTwin должен говорить:

```text
Эта совместимость подтверждена владельцами такой же модели.
```

Это:

- честнее;
- масштабируемее;
- лучше соответствует aftermarket reality;
- соответствует философии MotoTwin v5.1.

---

# 41. Scope MVP

В MVP обязательно входят:

- PartMaster
- ReplacementCartItem
- FitmentReport
- FitmentEvidence
- FitmentVote
- FitmentConfidence

Не входят в первую версию:

- advanced reputation;
- AI moderation;
- marketplace;
- commerce layer;
- глубокая аналитика.

---

# 42. Технические принципы реализации

Реализация должна соответствовать MotoTwin Coding Rules:

- deterministic logic;
- structured data;
- explicit fitment rules;
- MVP-safe architecture;
- без overengineering;
- TypeScript-first;
- Prisma как source of truth.

LLM не должен быть источником истины для fitment и compatibility logic.

