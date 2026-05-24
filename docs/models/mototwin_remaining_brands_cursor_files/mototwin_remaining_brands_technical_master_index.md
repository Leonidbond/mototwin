# MotoTwin remaining brands technical master — Cursor files index

Дата подготовки: 2026-05-24

Все файлы ниже используют единую структуру:

```text
Brand → ModelFamily → Variant → Generation → TechnicalSpecs
```

## Состав комплекта

| Brand | MD file | CSV seed | Rows | Families | Variants | Generations |
|---|---|---:|---:|---:|---:|---:|
| Honda | `mototwin_honda_model_technical_master_cursor.md` | `honda-model-technical-master.csv` | 10 | 9 | 10 | 10 |
| Yamaha | `mototwin_yamaha_model_technical_master_cursor.md` | `yamaha-model-technical-master.csv` | 8 | 8 | 8 | 8 |
| Kawasaki | `mototwin_kawasaki_model_technical_master_cursor.md` | `kawasaki-model-technical-master.csv` | 8 | 8 | 8 | 8 |
| Suzuki | `mototwin_suzuki_model_technical_master_cursor.md` | `suzuki-model-technical-master.csv` | 9 | 8 | 9 | 9 |
| Ducati | `mototwin_ducati_model_technical_master_cursor.md` | `ducati-model-technical-master.csv` | 10 | 4 | 10 | 10 |
| Harley-Davidson | `mototwin_harley_davidson_model_technical_master_cursor.md` | `harley_davidson-model-technical-master.csv` | 8 | 6 | 8 | 8 |
| Triumph | `mototwin_triumph_model_technical_master_cursor.md` | `triumph-model-technical-master.csv` | 9 | 7 | 9 | 9 |
| Royal Enfield | `mototwin_royal_enfield_model_technical_master_cursor.md` | `royal_enfield-model-technical-master.csv` | 9 | 9 | 9 | 9 |

## Как использовать в Cursor

1. Сначала загрузить `mototwin_model_technical_master_standard_cursor.md` как главный стандарт.
2. Затем загрузить нужные брендовые `.md` файлы из этого комплекта.
3. CSV-файлы можно использовать как seed-data для Prisma importer.
4. Cursor должен использовать один importer и одну модель данных для всех брендов.
5. Строки `needs_manual_verification` не считать production-verified.

## Общий промпт для Cursor

```text
Используй mototwin_model_technical_master_standard_cursor.md как главный стандарт структуры.
Импортируй все брендовые CSV из папки prisma/seed-data через один importer.
Не создавай разные Prisma-модели под разные бренды.
Ключ уникальности поколения: brand + model_family + variant + generation + year_from + year_to.
Пустые значения преобразуй в null, True/False в boolean.
Строки needs_manual_verification пометь флагом dataQuality=NEEDS_MANUAL_VERIFICATION и не показывай как verified.
Каталоги запчастей, правила совместимости и сервисные интервалы должны ссылаться на generation_id.
```