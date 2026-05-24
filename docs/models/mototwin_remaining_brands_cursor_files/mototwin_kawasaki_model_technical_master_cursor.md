# MotoTwin Kawasaki Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Kawasaki seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

---

## 1. Каноническая структура

```text
Brand → ModelFamily → Variant → Generation → TechnicalSpecs
```

Этот файл совместим с ранее подготовленным стандартом:

```text
mototwin_model_technical_master_standard_cursor.md
```

---

## 2. Важная оговорка по качеству данных

Это **MVP technical seed**, а не полный всемирный каталог Kawasaki.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Kawasaki technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kawasaki | Versys 650 | Versys 650 LT ABS | Versys 650 / MY2026 | 2022 | null | 2022-н.в. / MY2026 | US | Middle adventure touring / road-biased | Liquid-cooled 4-stroke parallel twin | 649 | false | 66 | hp | 66 | true | 61 | true | 6-speed | CHAIN | 17 | 17 | 120/70-17 | 160/60-17 | 20.8 | false | 219 | curb | 846 | COMMUNITY_SUPPORT | official_current_us_partial | Дорожный adventure-tourer; 17/17, не смешивать с KLR/KLX. | https://www.kawasaki.com/en-us/motorcycle/versys/adventure-touring/versys-650 |
| Kawasaki | Versys 1100 | Versys 1100 SE LT | Versys 1100 / MY2026 | 2025 | null | 2025/2026-н.в. | US | Sport touring / adventure touring | Liquid-cooled 4-stroke inline-four | 1099 | false | 133 | hp | 133 | false | 112 | true | 6-speed | CHAIN | 17 | 17 | 120/70 ZR17 | 180/55 ZR17 | 20.8 | false | 259 | curb | 841 | EARLY_BETA | official_current_us_partial | Новый крупный Versys; цепь и 17/17, ближе к sport-tourer, чем к эндуро. | https://www.kawasaki.com/en-us/motorcycle/versys/adventure-touring/versys-1100-se-lt |
| Kawasaki | Ninja 650 | Ninja 650 ABS | Ninja 650 / MY2026 | 2020 | null | 2020-н.в. / MY2026 | US | Sport / middleweight | Liquid-cooled 4-stroke parallel twin | 649 | false | 68 | hp | 68 | true | 64 | true | 6-speed | CHAIN | 17 | 17 | 120/70-17 | 160/60-17 | 15.1 | false | 193.0 | curb | 790 | COMMUNITY_SUPPORT | official_current_us_partial | Массовая Kawasaki 650; база для многих расходников, но спорт-геометрия. | https://www.kawasaki.com/en-us/motorcycle/ninja/sport/ninja-650 |
| Kawasaki | Z650 | Z650 ABS | Z650 / current | 2020 | null | 2020-н.в. | US | Naked / middleweight | Liquid-cooled 4-stroke parallel twin | 649 | false | 68 | hp | 68 | true | 64 | true | 6-speed | CHAIN | 17 | 17 | 120/70-17 | 160/60-17 | 15.0 | true | 188 | curb | 790 | EARLY_BETA | needs_manual_verification | Naked-версия 650-платформы; не объединять с Ninja 650 из-за кузовных деталей. | https://www.kawasaki.com/en-us/motorcycle/z/supernaked/z650 |
| Kawasaki | Z900 | Z900 SE ABS | Z900 / MY2026 | 2025 | null | 2025/2026-н.в. | US | Naked / sport roadster | Liquid-cooled 4-stroke inline-four | 948 | false | 123 | hp | 123 | true | 98.6 | true | 6-speed | CHAIN | 17 | 17 | 120/70-17 | 180/55-17 | 17.0 | false | 213.0 | curb | 810 | COMMUNITY_SUPPORT | official_current_us_partial | Сильная naked-модель Kawasaki; 17/17, тормоза и подвеска отличаются от 650. | https://www.kawasaki.com/en-us/motorcycle/z/supernaked/z900 |
| Kawasaki | Ninja ZX-10R | Ninja ZX-10R | Ninja ZX-10R / MY2026 | 2021 | null | 2021-н.в. / MY2026 | EU | Sport / superbike | Liquid-cooled 4-stroke inline-four | 998 | false | 203 | PS | 200 | true | 114.9 | true | 6-speed | CHAIN | 17 | 17 | 120/70 ZR17 | 190/55 ZR17 | 17.0 | false | 209 | curb | 825 | EARLY_BETA | official_current_eu_partial | Спорт/трек-сегмент; отдельные тормоза, цепь, шины, трековые расходники. | https://www.kawasaki.eu/en/Motorcycles/Supersport_Sport/Ninja_ZX-10R_2026.html |
| Kawasaki | KLR650 | KLR650 ABS | KLR650 / MY2026 | 2022 | null | 2022-н.в. / MY2026 | US | Dual sport / adventure single | Liquid-cooled 4-stroke single-cylinder | 652 | false | 40 | hp | 40 | true | 53 | true | 5-speed | CHAIN | 21 | 17 | 90/90-21 | 130/80-17 | 23.1 | false | 209 | curb | 871 | COMMUNITY_SUPPORT | official_current_us_partial | Одноцилиндровая adventure/dual-sport платформа; важно отличать от Versys. | https://www.kawasaki.com/en-us/motorcycle/klr/dual-sport/klr650 |
| Kawasaki | KLX300 | KLX300 | KLX300 / MY2026 | 2021 | null | 2021-н.в. / MY2026 | US | Dual sport / light enduro | Liquid-cooled 4-stroke single-cylinder | 292 | false | 23.4 | hp | 23.4 | true | 21 | true | 6-speed | CHAIN | 21 | 18 | 3.00-21 | 4.60-18 | 7.6 | false | 137 | curb | 894 | EARLY_BETA | official_current_us_partial | Легкий dual-sport; 21/18 и эндуро-расходники. | https://www.kawasaki.com/en-us/motorcycle/klx/dual-sport/klx300/2026-klx300 |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/kawasaki-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Kawasaki,Versys 650,Versys 650 LT ABS,Versys 650 / MY2026,2022,,2022-н.в. / MY2026,US,Middle adventure touring / road-biased,Liquid-cooled 4-stroke parallel twin,649,False,66,hp,66,True,61,True,6-speed,CHAIN,17,17,120/70-17,160/60-17,20.8,False,219,curb,846,COMMUNITY_SUPPORT,official_current_us_partial,"Дорожный adventure-tourer; 17/17, не смешивать с KLR/KLX.",https://www.kawasaki.com/en-us/motorcycle/versys/adventure-touring/versys-650
Kawasaki,Versys 1100,Versys 1100 SE LT,Versys 1100 / MY2026,2025,,2025/2026-н.в.,US,Sport touring / adventure touring,Liquid-cooled 4-stroke inline-four,1099,False,133,hp,133,False,112,True,6-speed,CHAIN,17,17,120/70 ZR17,180/55 ZR17,20.8,False,259,curb,841,EARLY_BETA,official_current_us_partial,"Новый крупный Versys; цепь и 17/17, ближе к sport-tourer, чем к эндуро.",https://www.kawasaki.com/en-us/motorcycle/versys/adventure-touring/versys-1100-se-lt
Kawasaki,Ninja 650,Ninja 650 ABS,Ninja 650 / MY2026,2020,,2020-н.в. / MY2026,US,Sport / middleweight,Liquid-cooled 4-stroke parallel twin,649,False,68,hp,68,True,64,True,6-speed,CHAIN,17,17,120/70-17,160/60-17,15.1,False,193.0,curb,790,COMMUNITY_SUPPORT,official_current_us_partial,"Массовая Kawasaki 650; база для многих расходников, но спорт-геометрия.",https://www.kawasaki.com/en-us/motorcycle/ninja/sport/ninja-650
Kawasaki,Z650,Z650 ABS,Z650 / current,2020,,2020-н.в.,US,Naked / middleweight,Liquid-cooled 4-stroke parallel twin,649,False,68,hp,68,True,64,True,6-speed,CHAIN,17,17,120/70-17,160/60-17,15.0,True,188,curb,790,EARLY_BETA,needs_manual_verification,Naked-версия 650-платформы; не объединять с Ninja 650 из-за кузовных деталей.,https://www.kawasaki.com/en-us/motorcycle/z/supernaked/z650
Kawasaki,Z900,Z900 SE ABS,Z900 / MY2026,2025,,2025/2026-н.в.,US,Naked / sport roadster,Liquid-cooled 4-stroke inline-four,948,False,123,hp,123,True,98.6,True,6-speed,CHAIN,17,17,120/70-17,180/55-17,17.0,False,213.0,curb,810,COMMUNITY_SUPPORT,official_current_us_partial,"Сильная naked-модель Kawasaki; 17/17, тормоза и подвеска отличаются от 650.",https://www.kawasaki.com/en-us/motorcycle/z/supernaked/z900
Kawasaki,Ninja ZX-10R,Ninja ZX-10R,Ninja ZX-10R / MY2026,2021,,2021-н.в. / MY2026,EU,Sport / superbike,Liquid-cooled 4-stroke inline-four,998,False,203,PS,200,True,114.9,True,6-speed,CHAIN,17,17,120/70 ZR17,190/55 ZR17,17.0,False,209,curb,825,EARLY_BETA,official_current_eu_partial,"Спорт/трек-сегмент; отдельные тормоза, цепь, шины, трековые расходники.",https://www.kawasaki.eu/en/Motorcycles/Supersport_Sport/Ninja_ZX-10R_2026.html
Kawasaki,KLR650,KLR650 ABS,KLR650 / MY2026,2022,,2022-н.в. / MY2026,US,Dual sport / adventure single,Liquid-cooled 4-stroke single-cylinder,652,False,40,hp,40,True,53,True,5-speed,CHAIN,21,17,90/90-21,130/80-17,23.1,False,209,curb,871,COMMUNITY_SUPPORT,official_current_us_partial,Одноцилиндровая adventure/dual-sport платформа; важно отличать от Versys.,https://www.kawasaki.com/en-us/motorcycle/klr/dual-sport/klr650
Kawasaki,KLX300,KLX300,KLX300 / MY2026,2021,,2021-н.в. / MY2026,US,Dual sport / light enduro,Liquid-cooled 4-stroke single-cylinder,292,False,23.4,hp,23.4,True,21,True,6-speed,CHAIN,21,18,3.00-21,4.60-18,7.6,False,137,curb,894,EARLY_BETA,official_current_us_partial,Легкий dual-sport; 21/18 и эндуро-расходники.,https://www.kawasaki.com/en-us/motorcycle/klx/dual-sport/klx300/2026-klx300
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Kawasaki seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Kawasaki по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 8
   - Variants/configurations: 8
   - Generations: 8
```

---

## 6. Source notes

- https://www.kawasaki.com/en-us/motorcycle/klr/dual-sport/klr650
- https://www.kawasaki.com/en-us/motorcycle/klx/dual-sport/klx300/2026-klx300
- https://www.kawasaki.com/en-us/motorcycle/ninja/sport/ninja-650
- https://www.kawasaki.com/en-us/motorcycle/versys/adventure-touring/versys-1100-se-lt
- https://www.kawasaki.com/en-us/motorcycle/versys/adventure-touring/versys-650
- https://www.kawasaki.com/en-us/motorcycle/z/supernaked/z650
- https://www.kawasaki.com/en-us/motorcycle/z/supernaked/z900
- https://www.kawasaki.eu/en/Motorcycles/Supersport_Sport/Ninja_ZX-10R_2026.html
