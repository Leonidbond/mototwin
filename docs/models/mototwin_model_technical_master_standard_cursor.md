# MotoTwin Model Technical Master — единый стандарт для Cursor

Версия: 1.0  
Дата: 2026-05-24  
Назначение: канонический формат справочника моделей, конфигураций и технических параметров для всех брендов MotoTwin.

---

## 1. Главная проблема

Нельзя использовать разные структуры для разных брендов.

Неправильно:

```text
KTM: Brand → ModelFamily → Variant → Generation
BMW: Brand → ModelFamily → Variant → Generation → TechnicalSpecs
```

Правильно для всех брендов:

```text
Brand → ModelFamily → Variant → Generation → TechnicalSpecs
```

В Cursor нужно передавать не отдельные разрозненные файлы как равнозначные ТЗ, а один стандарт структуры и брендовые seed-файлы, которые строго этому стандарту соответствуют.

---

## 2. Каноническая модель данных MotoTwin

```text
Brand
  └── ModelFamily
        └── Variant / Configuration
              └── Generation / YearRange
                    └── TechnicalSpecs
                    └── FitmentRules
                    └── ServiceIntervals
                    └── CompatibleParts
```

### Что означает каждый уровень

| Уровень | Пример | Зачем нужен |
|---|---|---|
| `Brand` | `BMW`, `KTM` | Производитель |
| `ModelFamily` | `R 1300 GS`, `390 Adventure` | Семейство модели |
| `Variant` | `R 1300 GS Adventure`, `390 Adventure R` | Конкретная конфигурация |
| `Generation` | `R 1300 GS Adventure / 2025-current` | Поколение / годовой диапазон |
| `TechnicalSpecs` | двигатель, объем, мощность, колеса, масса | Технический профиль для подбора узлов, запчастей, фильтров и UI |

---

## 3. Главное правило подсчета моделей

В MotoTwin должны быть разные счетчики.

```text
brand_count = уникальные бренды
model_family_count = уникальные Brand + ModelFamily
variant_count = уникальные Brand + ModelFamily + Variant
generation_count = уникальные Brand + ModelFamily + Variant + Generation
```

Каталог запчастей, документация и fitment-таблицы **не являются источником количества моделей**. Они должны ссылаться на `generation_id`.

---

## 4. Единая структура строки seed-файла

Каждая строка брендового файла должна описывать одну конфигурацию модели в одном годовом диапазоне.

| Поле | Тип | Обязательное | Комментарий |
|---|---:|---:|---|
| `brand` | string | yes | Например `BMW`, `KTM` |
| `model_family` | string | yes | Например `R 1300 GS`, `390 Adventure` |
| `variant` | string | yes | Например `R 1300 GS Adventure`, `390 Adventure R` |
| `generation` | string | yes | Внутреннее имя поколения |
| `year_from` | number | yes | Первый год выпуска |
| `year_to` | number/null | yes | Последний год выпуска или `null` для current |
| `years_label` | string | yes | Человекочитаемая строка годов |
| `market_region` | enum | yes | `GLOBAL`, `EU`, `US`, `RU`, `OTHER` |
| `segment` | string | yes | Класс / назначение |
| `engine` | string | yes | Описание двигателя |
| `displacement_cc` | number/null | yes | Объем двигателя |
| `displacement_is_approx` | boolean | yes | `true`, если значение приблизительное |
| `power_value` | number/null | yes | Значение мощности в исходной единице |
| `power_unit` | enum/null | yes | `hp`, `PS`, `kW` |
| `power_hp_normalized` | number/null | no | Нормализованное значение в hp, если нужно для фильтров |
| `power_is_approx` | boolean | yes | Приблизительность мощности |
| `torque_nm` | number/null | yes | Крутящий момент, Нм |
| `torque_is_approx` | boolean | yes | Приблизительность момента |
| `gearbox` | string/null | no | Например `6-speed` |
| `drive` | enum | yes | `CHAIN`, `SHAFT`, `BELT`, `UNKNOWN` |
| `front_wheel_in` | number/null | yes | Диаметр переднего колеса |
| `rear_wheel_in` | number/null | yes | Диаметр заднего колеса |
| `front_tire` | string/null | no | Размер передней шины, если известен |
| `rear_tire` | string/null | no | Размер задней шины, если известен |
| `fuel_l` | number/null | yes | Объем бака |
| `fuel_is_approx` | boolean | yes | Приблизительность объема бака |
| `weight_kg` | number/null | yes | Основная масса для отображения |
| `weight_type` | enum/null | no | `dry`, `wet`, `curb`, `fully_fueled`, `without_fuel`, `unknown` |
| `seat_mm` | string/null | yes | Можно хранить диапазон `849/869` строкой |
| `support_level` | enum | yes | Уровень поддержки MotoTwin |
| `data_status` | string | yes | Статус качества данных |
| `mototwin_comment` | string/null | no | Комментарий для продукта |
| `source_url` | string/null | no | Источник, если есть |

---

## 5. Почему `TechnicalSpecs` должен быть у всех брендов

MotoTwin подбирает детали и строит интерфейсы не только по названию модели. Для продукта критичны:

- тип привода: `CHAIN`, `SHAFT`, `BELT`;
- колеса: 21/18, 19/17, 17/17;
- двигатель и объем;
- масса и посадка;
- сегмент мотоцикла;
- годовой диапазон поколения;
- отличия между обычной и Adventure/R/S/X/GT/Enduro конфигурацией.

Поэтому даже если в первом KTM-файле были только уровни модели, для разработки он должен быть расширен до `TechnicalSpecs`.

---

## 6. TypeScript-типы

```ts
export type MotoDriveType = 'CHAIN' | 'SHAFT' | 'BELT' | 'UNKNOWN';
export type MotoPowerUnit = 'hp' | 'PS' | 'kW';
export type MotoMarketRegion = 'GLOBAL' | 'EU' | 'US' | 'RU' | 'OTHER';
export type MotoWeightType = 'dry' | 'wet' | 'curb' | 'fully_fueled' | 'without_fuel' | 'unknown';

export type MotoTwinSupportLevel =
  | 'MVP_CORE'
  | 'MVP_CORE_LEGACY'
  | 'COMMUNITY_SUPPORT'
  | 'EARLY_BETA'
  | 'NO_FITMENT_DATA_YET';

export interface MotoModelTechnicalMasterRow {
  brand: string;
  model_family: string;
  variant: string;
  generation: string;

  year_from: number;
  year_to: number | null;
  years_label: string;
  market_region: MotoMarketRegion;

  segment: string;
  engine: string;

  displacement_cc: number | null;
  displacement_is_approx: boolean;

  power_value: number | null;
  power_unit: MotoPowerUnit | null;
  power_hp_normalized?: number | null;
  power_is_approx: boolean;

  torque_nm: number | null;
  torque_is_approx: boolean;

  gearbox: string | null;
  drive: MotoDriveType;

  front_wheel_in: number | null;
  rear_wheel_in: number | null;
  front_tire?: string | null;
  rear_tire?: string | null;

  fuel_l: number | null;
  fuel_is_approx: boolean;

  weight_kg: number | null;
  weight_type?: MotoWeightType | null;

  seat_mm: string | null;

  support_level: MotoTwinSupportLevel;
  data_status: string;
  mototwin_comment?: string | null;
  source_url?: string | null;
}
```

---

## 7. Prisma schema draft

```prisma
model MotorcycleBrand {
  id        String   @id @default(cuid())
  name      String   @unique
  families  MotorcycleModelFamily[]
}

model MotorcycleModelFamily {
  id        String   @id @default(cuid())
  brandId   String
  brand     MotorcycleBrand @relation(fields: [brandId], references: [id])
  name      String
  variants  MotorcycleVariant[]

  @@unique([brandId, name])
}

model MotorcycleVariant {
  id        String   @id @default(cuid())
  familyId  String
  family    MotorcycleModelFamily @relation(fields: [familyId], references: [id])
  name      String
  generations MotorcycleGeneration[]

  @@unique([familyId, name])
}

model MotorcycleGeneration {
  id              String   @id @default(cuid())
  variantId       String
  variant         MotorcycleVariant @relation(fields: [variantId], references: [id])

  name            String
  yearFrom        Int
  yearTo          Int?
  yearsLabel      String
  marketRegion    String
  segment         String
  supportLevel    String
  dataStatus      String
  comment         String?
  sourceUrl       String?

  technicalSpecs  MotorcycleTechnicalSpecs?

  @@unique([variantId, name, yearFrom, yearTo])
  @@index([yearFrom, yearTo])
  @@index([supportLevel])
}

model MotorcycleTechnicalSpecs {
  id                     String   @id @default(cuid())
  generationId           String   @unique
  generation             MotorcycleGeneration @relation(fields: [generationId], references: [id])

  engine                 String
  displacementCc         Float?
  displacementIsApprox   Boolean  @default(false)

  powerValue             Float?
  powerUnit              String?
  powerHpNormalized      Float?
  powerIsApprox          Boolean  @default(false)

  torqueNm               Float?
  torqueIsApprox         Boolean  @default(false)

  gearbox                String?
  drive                  String

  frontWheelIn           Float?
  rearWheelIn            Float?
  frontTire              String?
  rearTire               String?

  fuelLiters             Float?
  fuelIsApprox           Boolean  @default(false)

  weightKg               Float?
  weightType             String?
  seatMm                 String?

  @@index([drive])
  @@index([frontWheelIn, rearWheelIn])
  @@index([displacementCc])
}
```

---

## 8. Правила для Cursor

Cursor должен считать этот файл главным стандартом. Все брендовые файлы должны быть приведены к этой структуре.

### Запрещено

- Создавать отдельную структуру под BMW, KTM, Honda, Yamaha и т.д.
- Считать строки каталога запчастей моделями.
- Хранить `н/д` в базе. Использовать `null`.
- Смешивать `hp`, `PS`, `kW` в одном числовом поле без `power_unit`.
- Хранить колеса строками `21"`, `17"`; в базе использовать числа.

### Разрешено

- В UI показывать `н/д`, если значение в базе `null`.
- Хранить диапазон высоты сиденья строкой, например `849/869`.
- Хранить приблизительность в boolean-полях `*_is_approx`.
- Подключать source URL позже, если данные изначально внесены вручную.

---

## 9. Готовый промпт для Cursor

```text
Используй файл mototwin_model_technical_master_standard_cursor.md как канонический стандарт структуры данных MotoTwin.

Задача:
1. Приведи все брендовые seed-файлы моделей к единой структуре:
   Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай разные схемы для разных брендов.
3. Реализуй Prisma-модели MotorcycleBrand, MotorcycleModelFamily, MotorcycleVariant, MotorcycleGeneration, MotorcycleTechnicalSpecs.
4. Подготовь seed importer, который читает CSV/JSON rows с полями из MotoModelTechnicalMasterRow.
5. Для значений `н/д` используй null.
6. Для приблизительных значений используй поля `*_is_approx`.
7. Для мощности храни исходное значение и единицу: power_value + power_unit. Нормализованное значение power_hp_normalized можно рассчитывать отдельно.
8. Каталог запчастей и fitment-правила должны ссылаться на MotorcycleGeneration, а не создавать собственные модели.
9. Проверь, что BMW и KTM используют одну и ту же структуру данных.
10. Не меняй UI без отдельной задачи. Сейчас задача только в нормализации модели данных и seed-импорте.
```
