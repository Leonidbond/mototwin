# Parts Catalog MVP — MotoTwin

## 1. Назначение документа

Этот документ описывает архитектуру MVP-каталога запчастей MotoTwin.

Цель каталога — перейти от свободного текста в wishlist к нормализованным SKU, которые можно связывать с узлами мотоцикла, применимостью к моделям, OEM-номерами, aftermarket-артикулами и предложениями магазинов.

Каталог SKU — это фундамент для будущей логики рекомендаций. Рекомендации запчастей нельзя делать качественно, пока нет нормальной структуры SKU, артикулов, применимости и связи с деревом узлов.

---

## 2. Почему нельзя делать плоский каталог

Наивная модель вида:

```text
PartSku
- nodeId
- brand
- name
- articleNumber
- price
- url
```

подходит только для самого раннего прототипа, но быстро ломается.

Причины:

1. Один SKU может иметь несколько артикулов:
   - OEM номер;
   - aftermarket номер;
   - seller SKU;
   - barcode;
   - старый/новый номер после supersession.

2. Один SKU может относиться к нескольким узлам:
   - тормозная жидкость относится к переднему и заднему тормозу;
   - комплект цепь+звезды относится к нескольким узлам привода;
   - очиститель тормозов является сопутствующим расходником для колодок.

3. Один узел может требовать несколько SKU:
   - замена масла: масло, масляный фильтр, прокладка сливной пробки;
   - замена колодок: колодки, очиститель, тормозная жидкость;
   - обслуживание цепи: цепь, звезды, направляющая, смазка.

4. OEM-каталоги, aftermarket-каталоги и маркетплейсы представляют данные по-разному.

5. Товарная карточка магазина — это не то же самое, что нормализованный SKU.

Поэтому архитектура должна разделять:

- нормализованный SKU;
- артикулы;
- связь с узлами MotoTwin;
- применимость к моделям;
- предложения магазинов;
- источники данных;
- будущие OEM diagram/fiche позиции.

---

## 3. Источники данных и как они устроены

### 3.1. OEM-каталоги

Типичная структура OEM-каталога:

```text
Brand
  Model
    Year / Variant / VIN / Engine number
      Assembly / Diagram
        Diagram position
          OEM part number
          Part name
          Quantity
          Notes
```

Пример:

```text
KTM
  500 EXC-F
    2022
      Engine > Lubricating System
        Position 12
          OEM part number: 77038005044
          Name: Oil filter
          Quantity: 1
```

Особенности OEM-каталогов:

- детали сгруппированы по exploded diagrams / fiche;
- одна и та же деталь может встречаться в нескольких сборках;
- part number может быть заменен новым номером;
- применимость может зависеть от года, рынка, VIN или номера двигателя;
- не все расходники есть в OEM fiche, например масло может отсутствовать как товар.

### 3.2. Aftermarket-каталоги

Типичная структура aftermarket-каталога:

```text
Category
  Brand
    Product line
      SKU / Article
        Attributes
        Fitment list
```

Примеры категорий:

- brake pads;
- oil filters;
- engine oil;
- chains;
- tires;
- spark plugs;
- air filters.

Особенности aftermarket-каталогов:

- сильная роль параметров;
- важна применимость к модели;
- один товар может подходить к большому числу моделей;
- часто есть несколько вариантов под разные сценарии эксплуатации.

Примеры параметров:

```text
Brake pads:
- position: front / rear
- compound: organic / sintered / racing
- usage: city / enduro / sport

Chain:
- pitch: 520
- links: 118
- sealType: O-ring / X-ring

Oil:
- viscosity: 10W-50
- standard: JASO MA2
- volume: 1L

Tires:
- size: 90/90-21
- position: front
- terrain: soft / intermediate / hard
```

### 3.3. Marketplace / магазины

Типичная структура marketplace-данных:

```text
Offer
- title
- seller
- price
- currency
- URL
- availability
- raw article
- raw brand
- description
```

Особенности:

- названия грязные и неполные;
- бренд может быть указан по-разному;
- артикул может быть внутри title;
- одна карточка может быть комплектом;
- совместимость часто дана текстом;
- цена и наличие меняются.

Marketplace offer нельзя считать SKU. Это отдельная сущность `PartOffer`, которая может быть связана с нормализованным `PartSku`.

---

## 4. Связь с MotoTwin node tree

MotoTwin использует внутреннее дерево узлов:

```text
ENGINE.LUBE.OIL
ENGINE.LUBE.FILTER
BRAKES.FRONT.PADS
DRIVETRAIN.CHAIN
TIRES.FRONT
```

Это дерево используется для:

- сервисных событий;
- статусов;
- maintenance rules;
- attention flow;
- wishlist;
- будущих рекомендаций.

Но структура OEM-каталогов не совпадает 1-в-1 с MotoTwin node tree.

Пример:

| MotoTwin node | Где может быть в OEM-каталоге |
|---|---|
| `ENGINE.LUBE.OIL` | может отсутствовать в fiche |
| `ENGINE.LUBE.FILTER` | Engine / Lubricating System |
| `BRAKES.FRONT.PADS` | Front Brake Caliper |
| `DRIVETRAIN.CHAIN` | Rear Wheel / Swingarm / Drive Chain |
| `ELECTRICS.IGNITION.SPARK` | Electrical / Ignition |
| `TIRES.FRONT` | Wheels / Tires или может отсутствовать |

Поэтому нужен отдельный слой связи:

```text
PartSkuNodeLink
```

Он связывает нормализованный SKU с одним или несколькими узлами MotoTwin.

---

## 5. Целевая модель данных

### 5.1. PartSku

`PartSku` — нормализованная карточка детали.

Это не карточка магазина и не обязательно OEM part number. Это внутренняя сущность MotoTwin, которая описывает “какую деталь или расходник мы знаем”.

Пример:

```text
canonicalName: Масляный фильтр Hiflofiltro HF155
brandName: Hiflofiltro
partType: OIL_FILTER
primaryNodeCode: ENGINE.LUBE.FILTER
isConsumable: true
isOem: false
```

Рекомендуемые поля:

```text
PartSku
- id
- primaryNodeId?
- brandName
- canonicalName
- partType
- description?
- category?
- priceAmount?
- currency?
- sourceUrl?
- isOem
- isActive
- createdAt
- updatedAt
```

Назначение:

- хранит нормализованную карточку детали;
- используется в wishlist;
- используется будущим recommendation engine;
- может иметь несколько артикулов;
- может иметь несколько fitment-записей;
- может иметь несколько offer-записей;
- может быть связан с несколькими узлами.

### 5.2. PartNumber

`PartNumber` — артикул или номер детали.

Одна деталь может иметь несколько номеров.

Рекомендуемые поля:

```text
PartNumber
- id
- skuId
- number
- normalizedNumber
- numberType
- brandName?
- createdAt
```

Типы номеров:

```text
OEM
AFTERMARKET
MANUFACTURER
SELLER_SKU
BARCODE
INTERNAL
```

Пример:

```text
SKU: Hiflofiltro HF155
PartNumber:
- number: HF155
- normalizedNumber: HF155
- numberType: MANUFACTURER
```

Пример OEM:

```text
SKU: KTM Oil Filter
PartNumber:
- number: 77038005044
- normalizedNumber: 77038005044
- numberType: OEM
```

### 5.3. PartSkuNodeLink

`PartSkuNodeLink` связывает SKU с узлами MotoTwin.

Рекомендуемые поля:

```text
PartSkuNodeLink
- id
- skuId
- nodeId
- relationType
- confidence
- createdAt
```

Типы связи:

```text
PRIMARY
ALTERNATIVE
KIT_COMPONENT
RELATED_CONSUMABLE
TOOL_OR_CHEMICAL
```

Примеры:

| SKU | Node | relationType |
|---|---|---|
| Моторное масло | `ENGINE.LUBE.OIL` | `PRIMARY` |
| Масляный фильтр | `ENGINE.LUBE.FILTER` | `PRIMARY` |
| Прокладка сливной пробки | `ENGINE.LUBE.OIL` | `RELATED_CONSUMABLE` |
| Очиститель тормозов | `BRAKES.FRONT.PADS` | `RELATED_CONSUMABLE` |
| Комплект цепь+звезды | `DRIVETRAIN.CHAIN` | `KIT_COMPONENT` |

### 5.4. PartFitment

`PartFitment` описывает применимость SKU к мотоциклам.

Рекомендуемые поля:

```text
PartFitment
- id
- skuId
- brandId?
- modelId?
- modelVariantId?
- yearFrom?
- yearTo?
- market?
- engineCode?
- vinFrom?
- vinTo?
- confidence
- sourceId?
- note?
- createdAt
```

Уровни точности применимости:

```text
EXACT_VARIANT
MODEL_YEAR
MODEL_RANGE
GENERIC_NODE
UNKNOWN
```

Примеры:

```text
Exact:
- KTM 500 EXC-F 2022

Range:
- KTM EXC-F 2017-2023

Generic:
- Универсально, если вязкость/спецификация подходит
```

### 5.5. PartOffer

`PartOffer` — конкретное предложение магазина или marketplace.

Рекомендуемые поля:

```text
PartOffer
- id
- skuId?
- sourceName
- externalOfferId?
- title
- url?
- priceAmount?
- currency?
- availability?
- sellerName?
- rawBrand?
- rawArticle?
- rawDataJson?
- lastSeenAt?
- createdAt
- updatedAt
```

Назначение:

- хранить конкретное предложение;
- сохранять цену/ссылку/наличие;
- поддерживать будущий парсинг магазинов;
- позволять офферам быть “сырыми” до матчинга с `PartSku`.

### 5.6. Будущие сущности

Не обязательно реализовывать в MVP, но нужно держать в архитектуре.

#### CatalogSource

Источник данных:

```text
CatalogSource
- id
- name
- sourceType
- baseUrl?
- brandScope?
- trustLevel
- notes?
```

Типы источников:

```text
OEM
DEALER_FICHE
AFTERMARKET
MARKETPLACE
MANUAL
INTERNAL_SEED
```

#### CatalogAssembly

Сборка/раздел OEM-каталога:

```text
CatalogAssembly
- id
- sourceId
- brandId?
- modelId?
- modelVariantId?
- externalAssemblyId?
- name
- normalizedName?
- path?
- diagramUrl?
```

#### CatalogDiagramPosition

Позиция на exploded diagram:

```text
CatalogDiagramPosition
- id
- assemblyId
- skuId?
- partNumberId?
- positionNo?
- name
- quantity?
- note?
- rawDataJson?
```

#### PartSupersession

Замена одного номера другим:

```text
PartSupersession
- id
- fromPartNumberId
- toPartNumberId
- sourceId?
- note?
```

#### PartAttribute

Параметры детали:

```text
PartAttribute
- id
- skuId
- key
- value
- unit?
```

Примеры:

```text
viscosity = 10W-50
standard = JASO MA2
pitch = 520
links = 118
compound = sintered
position = front
size = 90/90-21
```

---

## 6. MVP-модель для реализации сейчас

Для первого этапа каталога достаточно реализовать:

```text
PartSku
PartNumber
PartSkuNodeLink
PartFitment
PartOffer
skuId в PartWishlistItem
```

Не реализовывать пока:

```text
CatalogSource
CatalogAssembly
CatalogDiagramPosition
PartSupersession
PartAttribute
```

Причина:

- MVP-каталог должен уже поддерживать seed;
- wishlist должен уметь ссылаться на SKU;
- API должен уметь искать SKU;
- будущие рекомендации должны иметь базу;
- при этом не нужно сразу строить полный OEM fiche parser.

---

## 7. Рекомендуемая Prisma-модель MVP

```prisma
model PartSku {
  id            String   @id @default(cuid())

  /** Стабильный ключ для идемпотентного seed (`upsert`); в проде может быть `null`. */
  seedKey       String?  @unique

  primaryNodeId String?
  primaryNode   Node?    @relation(fields: [primaryNodeId], references: [id])

  brandName     String
  canonicalName String
  partType      String

  description   String?
  category      String?

  priceAmount   Decimal?
  currency      String?
  sourceUrl     String?

  isOem         Boolean  @default(false)
  isActive      Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  partNumbers   PartNumber[]
  nodeLinks     PartSkuNodeLink[]
  fitments      PartFitment[]
  offers        PartOffer[]
  wishlistItems PartWishlistItem[]

  @@index([primaryNodeId])
  @@index([brandName])
  @@index([partType])
  @@index([isActive])
}

model PartNumber {
  id               String  @id @default(cuid())
  skuId            String
  sku              PartSku @relation(fields: [skuId], references: [id], onDelete: Cascade)

  number           String
  normalizedNumber String
  numberType       String
  brandName        String?

  createdAt        DateTime @default(now())

  @@index([skuId])
  @@index([normalizedNumber])
  @@unique([skuId, normalizedNumber, numberType])
}

model PartSkuNodeLink {
  id           String  @id @default(cuid())
  skuId        String
  sku          PartSku @relation(fields: [skuId], references: [id], onDelete: Cascade)

  nodeId       String
  node         Node    @relation(fields: [nodeId], references: [id])

  relationType String
  confidence   Int     @default(80)

  createdAt    DateTime @default(now())

  @@index([skuId])
  @@index([nodeId])
  @@unique([skuId, nodeId, relationType])
}

model PartFitment {
  id             String  @id @default(cuid())
  skuId          String
  sku            PartSku @relation(fields: [skuId], references: [id], onDelete: Cascade)

  brandId        String?
  modelId        String?
  modelVariantId String?

  yearFrom       Int?
  yearTo         Int?

  market         String?
  engineCode     String?
  vinFrom        String?
  vinTo          String?

  fitmentType    String?
  confidence     Int     @default(80)
  note           String?

  createdAt      DateTime @default(now())

  @@index([skuId])
  @@index([brandId])
  @@index([modelId])
  @@index([modelVariantId])
}

model PartOffer {
  id              String   @id @default(cuid())

  skuId           String?
  sku             PartSku? @relation(fields: [skuId], references: [id], onDelete: SetNull)

  sourceName      String
  externalOfferId String?
  title           String
  url             String?

  priceAmount     Decimal?
  currency        String?
  availability    String?

  sellerName      String?
  rawBrand        String?
  rawArticle      String?
  rawDataJson     Json?

  lastSeenAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([skuId])
  @@index([sourceName])
  @@index([externalOfferId])
}
```

В `PartWishlistItem` добавить:

```prisma
skuId String?
sku   PartSku? @relation(fields: [skuId], references: [id], onDelete: SetNull)

@@index([skuId])
```

---

## 8. Основные partType для первого seed

Для первого seed использовать контролируемые строковые значения.

```text
ENGINE_OIL
OIL_FILTER
AIR_FILTER
SPARK_PLUG
BRAKE_PADS_FRONT
BRAKE_PADS_REAR
BRAKE_FLUID
CHAIN
FRONT_SPROCKET
REAR_SPROCKET
TIRE_FRONT
TIRE_REAR
COOLANT
FORK_OIL
BATTERY
```

Позже можно вынести `partType` в enum или отдельный справочник, но для MVP строка проще и гибче.

---

## 9. Seed strategy

### 9.1. Что сидить первым

Seed Pack 1 — универсальные расходники:

```text
ENGINE.LUBE.OIL
ENGINE.LUBE.FILTER
INTAKE.FILTER
ELECTRICS.IGNITION.SPARK
BRAKES.FRONT.PADS
BRAKES.REAR.PADS
BRAKES.FLUID
DRIVETRAIN.CHAIN
DRIVETRAIN.FRONT_SPROCKET
DRIVETRAIN.REAR_SPROCKET
TIRES.FRONT
TIRES.REAR
COOLING.LIQUID
SUSPENSION.FRONT.OIL
ELECTRICS.BATTERY
```

Seed Pack 2 — node-linked consumables:

```text
ENGINE.LUBE.OIL:
- масло двигателя
- прокладка сливной пробки
- очиститель

BRAKES.FRONT.PADS:
- передние колодки
- очиститель тормозов
- тормозная жидкость

DRIVETRAIN.CHAIN:
- цепь
- ведущая звезда
- ведомая звезда
- смазка цепи

TIRES.FRONT:
- передняя шина
- камера
- буксатор

TIRES.REAR:
- задняя шина
- камера
- буксатор
```

Seed Pack 3 — model-specific sample:

```text
KTM 500 EXC-F 2022
или текущая тестовая модель MotoTwin
```

Цель model-specific seed:

- проверить `PartFitment`;
- проверить точную применимость;
- показать difference между generic и exact fit.

### 9.2. Рекомендуемый seed JSON

Создать позже файл:

```text
prisma/seed-data/parts-skus.json
```

Формат:

```json
[
  {
    "seedKey": "MVP_CATALOG_ENGINE_OIL_MOTUL",
    "canonicalName": "Масло Motul 7100 10W-50 1L",
    "brandName": "Motul",
    "partType": "ENGINE_OIL",
    "primaryNodeCode": "ENGINE.LUBE.OIL",
    "isOem": false,
    "description": "Синтетическое моторное масло 10W-50 для 4T мотоциклов",
    "category": "Масло двигателя",
    "priceAmount": 1800,
    "currency": "RUB",
    "sourceUrl": null,
    "partNumbers": [
      {
        "number": "104092",
        "numberType": "MANUFACTURER",
        "brandName": "Motul"
      }
    ],
    "nodeLinks": [
      {
        "nodeCode": "ENGINE.LUBE.OIL",
        "relationType": "PRIMARY",
        "confidence": 90
      }
    ],
    "fitments": [
      {
        "fitmentType": "GENERIC_NODE",
        "confidence": 40,
        "note": "Универсально при соответствии вязкости и спецификации"
      }
    ],
    "offers": []
  }
]
```

### 9.3. Правила seed

1. Каждая seed-запись должна иметь:
   - `canonicalName`;
   - `brandName`;
   - `partType`;
   - `primaryNodeCode`.

2. Если есть артикул, добавлять его в `partNumbers`.

3. Если SKU связан с несколькими узлами, использовать `nodeLinks`.

4. Если применимость точная, использовать `fitments`.

5. Если это generic расходник, использовать:

```text
fitmentType = GENERIC_NODE
confidence = 40
```

6. Если это точная применимость:

```text
fitmentType = EXACT_VARIANT
confidence = 90
```

7. Marketplace URL не хранить как основной SKU, а добавлять в `PartOffer`.

---

## 10. Связь SKU с wishlist

Wishlist item должен оставаться гибким.

Поля wishlist item:

```text
title
nodeId?
skuId?
quantity
status
comment?
costAmount?
currency?
```

Правила:

1. Wishlist item может быть создан без SKU.
2. Если пользователь выбирает SKU:
   - `skuId` сохраняется;
   - `title` можно заполнить из `sku.canonicalName`;
   - `nodeId` можно заполнить из `sku.primaryNodeId`;
   - `costAmount/currency` можно заполнить из `sku.priceAmount/currency`.
3. Пользователь может редактировать title/cost/comment даже после выбора SKU.
4. При переводе в `INSTALLED` открывается форма сервисного события.
5. В сервисное событие передаются:
   - nodeId;
   - serviceType = `Установка запчасти`;
   - costAmount;
   - currency;
   - comment;
   - информация о SKU в комментарии или `installedPartsJson`, если поле доступно.

### 10.1. Ручной выбор SKU в UI wishlist (web + Expo)

На клиентах в форме добавления/редактирования позиции списка покупок доступен **опциональный** поиск по MVP-каталогу (`GET` через **`getPartSkus`** в `@mototwin/api-client`): пользователь вводит строку поиска (или при **предвыбранном узле** может запросить подборку по `nodeId` без текста), выбирает SKU из списка или очищает выбор. Подстановка названия / узла / стоимости согласована с серверными правилами (`applyPartSkuViewModelToPartWishlistFormValues` и API). Отображение подписей и цен — общие хелперы в `@mototwin/domain` (`getWishlistItemSkuDisplayLines`, `formatPartSkuSearchResultMetaLineRu` и др.), без дублирования форматирования в web и Expo. Ручная позиция **без** `skuId` по-прежнему поддерживается.

---

## 11. Будущая логика рекомендаций

Рекомендации должны строиться не из wishlist, а из связки:

```text
vehicle + nodeId + PartSku + PartFitment + PartSkuNodeLink
```

### 11.1. Типы recommendation match

```text
EXACT_FIT
MODEL_FIT
GENERIC_NODE_MATCH
RELATED_CONSUMABLE
VERIFY_REQUIRED
```

### 11.2. MVP recommendation algorithm

Для выбранного узла:

1. Найти active SKU через `PartSkuNodeLink.nodeId`.
2. Разделить по `relationType`:
   - `PRIMARY`;
   - `RELATED_CONSUMABLE`;
   - `KIT_COMPONENT`.
3. Проверить `PartFitment`:
   - exact `modelVariantId`;
   - затем `modelId + year`;
   - затем generic node fitment.
4. Присвоить label:
   - `Подходит к этой модификации`;
   - `Подходит к модели`;
   - `Универсальная позиция для узла`;
   - `Сопутствующий расходник`;
   - `Проверьте совместимость`.
5. Отсортировать:
   - exact fit выше;
   - primary выше;
   - confidence выше;
   - наличие цены/offer выше.

### 11.3. Честная маркировка рекомендаций

Пока нет полной базы совместимости, нельзя обещать “точно подходит”.

Нужны labels:

```text
Подходит к этой модификации
Подходит к модели
Универсальная позиция для узла
Сопутствующий расходник
Проверьте совместимость
```

---

## 12. Что не входит в MVP каталога

Не входит сейчас:

- полный OEM fiche parser;
- загрузка exploded diagrams;
- marketplace availability sync;
- аналоги и заменители;
- supersession;
- подбор по VIN;
- автоматический matching marketplace offer к SKU;
- проверка совместимости по всем параметрам;
- полноценная корзина/заказ;
- партнерские ссылки.

---

## 13. Первый технический шаг после документа

Рекомендуемый первый implementation step:

1. Добавить Prisma-модели:
   - `PartSku`;
   - `PartNumber`;
   - `PartSkuNodeLink`;
   - `PartFitment`;
   - `PartOffer`;
   - `skuId` в `PartWishlistItem`.

2. Добавить API:
   - `GET /api/parts/skus`;
   - `GET /api/parts/skus/[skuId]`.

3. Обновить wishlist API:
   - accept optional `skuId`;
   - return SKU info;
   - copy SKU price/name into wishlist if fields are empty.

4. Добавить shared:
   - types;
   - domain view models;
   - api-client methods.

5. Добавить seed:
   - `prisma/seed-data/parts-skus.json`;
   - небольшой набор seed SKU.

UI-выбор SKU в wishlist делать вторым шагом после backend/shared foundation.

---

## 14. Краткий roadmap

### Этап 1. Catalog foundation

- Prisma-модели каталога.
- API поиска SKU.
- Связка wishlist item с `skuId`.
- Seed JSON.
- Shared types/domain/api-client.

### Этап 2. SKU selection in wishlist

- Поиск SKU в форме wishlist.
- Выбор SKU.
- Автозаполнение title/cost/currency/node.
- Отображение SKU в wishlist item.

### Этап 3. Basic recommendations

- Рекомендованные SKU по выбранному узлу.
- Разделение exact/model/generic/related.
- Кнопка “Добавить в список покупок”.

### Этап 4. Fitment improvements

- Расширение `PartFitment`.
- Проверка по modelVariant/year/market.
- Честные labels совместимости.

### Этап 5. Marketplace/offers

- Связь SKU с предложениями магазинов.
- Цена/наличие/ссылка.
- Позже — парсинг и нормализация.

---

## 15. Принцип качества данных

Для каталога MotoTwin важнее не объем, а качество нормализации.

Каждая SKU-запись должна отвечать на вопросы:

1. Что это за деталь?
2. Какой у нее тип?
3. К какому узлу она относится?
4. Какие у нее артикулы?
5. Для каких мотоциклов она подходит?
6. Это точная применимость или универсальная рекомендация?
7. Где ее можно купить, если есть источник?
8. Насколько мы уверены в связи?

Если нет уверенности в применимости, это должно быть явно отражено через `fitmentType`, `confidence` и пользовательский label “Проверьте совместимость”.

---

## 16. Итог

MVP-каталог запчастей MotoTwin должен быть достаточно простым для реализации, но не должен ломать будущую архитектуру.

Правильный компромисс:

- сейчас реализовать `PartSku`, `PartNumber`, `PartSkuNodeLink`, `PartFitment`, `PartOffer` и `skuId` в wishlist;
- оставить wishlist свободным: можно создать позицию без SKU;
- добавить seed через JSON;
- не делать пока полный OEM fiche parser;
- не делать пока recommendation engine;
- не обещать точную совместимость без данных fitment;
- использовать честные уровни рекомендаций.

Такой подход позволит начать собирать seed-данные уже сейчас и не переделывать модель, когда появятся реальные OEM/aftermarket/marketplace источники.
