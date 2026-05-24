# MotoTwin Harley-Davidson Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Harley-Davidson seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

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

Это **MVP technical seed**, а не полный всемирный каталог Harley-Davidson.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Harley-Davidson technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Harley-Davidson | Pan America 1250 | Pan America 1250 Special | Pan America 1250 Special / MY2026 | 2021 | null | 2021-н.в. / MY2026 | US | Adventure touring | Revolution Max 1250 liquid-cooled 60-degree V-twin | 1252 | false | 150 | hp | 150 | false | 127.4 | false | 6-speed | CHAIN | 19 | 17 | 120/70R19 | 170/60R17 | 21.2 | true | 262 | curb | 790/813 laden | MVP_CORE | official_current_us_partial | Единственная массовая Harley adventure-платформа; важно отделять от круизеров по приводу/колесам. | https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-special.html |
| Harley-Davidson | Pan America 1250 | Pan America 1250 ST | Pan America 1250 ST / MY2026 | 2025 | null | 2025/2026-н.в. | US | Adventure sport / road-biased | Revolution Max 1250 liquid-cooled 60-degree V-twin | 1252 | false | 150 | hp | 150 | false | 127.4 | false | 6-speed | CHAIN | 17 | 17 | 120/70ZR17 | 180/55ZR17 | 21.2 | true | 246 | curb | 775 laden | EARLY_BETA | needs_manual_verification | Дорожная 17/17 версия Pan America; отдельная конфигурация от Special. | https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-st.html |
| Harley-Davidson | Sportster S | Sportster S | Sportster S / MY2026 | 2021 | null | 2021-н.в. / MY2026 | US | Sport cruiser | Revolution Max 1250T liquid-cooled 60-degree V-twin | 1252 | false | 121 | hp | 121 | false | 125 | true | 6-speed | BELT | 17 | 16 | 160/70R17 | 180/70R16 | 11.8 | true | 228 | curb | 765 laden | COMMUNITY_SUPPORT | official_current_us_partial | Revolution Max sport-cruiser; широкий передний баллон и ременной привод. | https://www.harley-davidson.com/us/en/motorcycles/sportster-s.html |
| Harley-Davidson | Nightster | Nightster Special | Nightster Special / MY2026 | 2023 | null | 2023-н.в. / MY2026 | US | Sport cruiser / entry Harley | Revolution Max 975T liquid-cooled 60-degree V-twin | 975 | false | 91 | hp | 91 | false | 97 | true | 6-speed | BELT | 19 | 16 | 100/90-19 | 150/80B16 | 11.7 | true | 219 | curb | 688 laden | COMMUNITY_SUPPORT | official_current_us_partial | Младший Revolution Max; полезен для современного Harley-сегмента. | https://www.harley-davidson.com/us/en/motorcycles/nightster-special.html |
| Harley-Davidson | Low Rider | Low Rider S | Low Rider S / MY2026 | 2022 | null | 2022-н.в. / MY2026 | US | Cruiser / performance Softail | Milwaukee-Eight 117 High Output air/oil-cooled V-twin | 1923 | false | 114 | hp | 114 | false | 173.5 | false | 6-speed | BELT | 19 | 16 | 110/90B19 | 180/70B16 | 18.9 | true | 304 | curb | 686 laden | COMMUNITY_SUPPORT | official_current_us_partial | Performance cruiser; ремень, большие V-twin расходники, отдельные шины. | https://www.harley-davidson.com/us/en/motorcycles/low-rider-s.html |
| Harley-Davidson | Low Rider | Low Rider ST | Low Rider ST / MY2026 | 2022 | null | 2022-н.в. / MY2026 | US | Cruiser / sport touring Softail | Milwaukee-Eight 117 High Output air/oil-cooled V-twin | 1923 | false | 114 | hp | 114 | false | 173.5 | false | 6-speed | BELT | 19 | 16 | 110/90B19 | 180/70B16 | 18.9 | true | 327 | curb | 686 laden | EARLY_BETA | needs_manual_verification | ST-версия с обтекателем/кофрами; не смешивать с S. | https://www.harley-davidson.com/us/en/motorcycles/low-rider-st.html |
| Harley-Davidson | Street Glide | Street Glide | Street Glide / MY2026 | 2024 | null | 2024-н.в. / MY2026 | US | Grand American touring / bagger | Milwaukee-Eight 117 liquid-cooled heads V-twin | 1923 | false | 105 | hp | 105 | false | 176.3 | false | 6-speed | BELT | 19 | 18 | 130/60B19 | 180/55B18 | 22.7 | false | 368 | curb | 671 laden | COMMUNITY_SUPPORT | official_current_us | Touring/bagger; отдельный класс деталей, кофры, обтекатель, аудио. | https://www.harley-davidson.com/us/en/motorcycles/street-glide.html |
| Harley-Davidson | Road Glide | Road Glide | Road Glide / MY2026 | 2024 | null | 2024-н.в. / MY2026 | US | Grand American touring / sharknose bagger | Milwaukee-Eight 117 liquid-cooled heads V-twin | 1923 | false | 105 | hp | 105 | false | 176.3 | false | 6-speed | BELT | 19 | 18 | 130/60B19 | 180/55B18 | 22.7 | true | 380 | curb | 673 laden | COMMUNITY_SUPPORT | needs_manual_verification | Road Glide близок к Street Glide по базе, но отличается обтекателем/передней частью. | https://www.harley-davidson.com/us/en/motorcycles/road-glide.html |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/harley_davidson-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Harley-Davidson,Pan America 1250,Pan America 1250 Special,Pan America 1250 Special / MY2026,2021,,2021-н.в. / MY2026,US,Adventure touring,Revolution Max 1250 liquid-cooled 60-degree V-twin,1252,False,150,hp,150,False,127.4,False,6-speed,CHAIN,19,17,120/70R19,170/60R17,21.2,True,262,curb,790/813 laden,MVP_CORE,official_current_us_partial,Единственная массовая Harley adventure-платформа; важно отделять от круизеров по приводу/колесам.,https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-special.html
Harley-Davidson,Pan America 1250,Pan America 1250 ST,Pan America 1250 ST / MY2026,2025,,2025/2026-н.в.,US,Adventure sport / road-biased,Revolution Max 1250 liquid-cooled 60-degree V-twin,1252,False,150,hp,150,False,127.4,False,6-speed,CHAIN,17,17,120/70ZR17,180/55ZR17,21.2,True,246,curb,775 laden,EARLY_BETA,needs_manual_verification,Дорожная 17/17 версия Pan America; отдельная конфигурация от Special.,https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-st.html
Harley-Davidson,Sportster S,Sportster S,Sportster S / MY2026,2021,,2021-н.в. / MY2026,US,Sport cruiser,Revolution Max 1250T liquid-cooled 60-degree V-twin,1252,False,121,hp,121,False,125,True,6-speed,BELT,17,16,160/70R17,180/70R16,11.8,True,228,curb,765 laden,COMMUNITY_SUPPORT,official_current_us_partial,Revolution Max sport-cruiser; широкий передний баллон и ременной привод.,https://www.harley-davidson.com/us/en/motorcycles/sportster-s.html
Harley-Davidson,Nightster,Nightster Special,Nightster Special / MY2026,2023,,2023-н.в. / MY2026,US,Sport cruiser / entry Harley,Revolution Max 975T liquid-cooled 60-degree V-twin,975,False,91,hp,91,False,97,True,6-speed,BELT,19,16,100/90-19,150/80B16,11.7,True,219,curb,688 laden,COMMUNITY_SUPPORT,official_current_us_partial,Младший Revolution Max; полезен для современного Harley-сегмента.,https://www.harley-davidson.com/us/en/motorcycles/nightster-special.html
Harley-Davidson,Low Rider,Low Rider S,Low Rider S / MY2026,2022,,2022-н.в. / MY2026,US,Cruiser / performance Softail,Milwaukee-Eight 117 High Output air/oil-cooled V-twin,1923,False,114,hp,114,False,173.5,False,6-speed,BELT,19,16,110/90B19,180/70B16,18.9,True,304,curb,686 laden,COMMUNITY_SUPPORT,official_current_us_partial,"Performance cruiser; ремень, большие V-twin расходники, отдельные шины.",https://www.harley-davidson.com/us/en/motorcycles/low-rider-s.html
Harley-Davidson,Low Rider,Low Rider ST,Low Rider ST / MY2026,2022,,2022-н.в. / MY2026,US,Cruiser / sport touring Softail,Milwaukee-Eight 117 High Output air/oil-cooled V-twin,1923,False,114,hp,114,False,173.5,False,6-speed,BELT,19,16,110/90B19,180/70B16,18.9,True,327,curb,686 laden,EARLY_BETA,needs_manual_verification,ST-версия с обтекателем/кофрами; не смешивать с S.,https://www.harley-davidson.com/us/en/motorcycles/low-rider-st.html
Harley-Davidson,Street Glide,Street Glide,Street Glide / MY2026,2024,,2024-н.в. / MY2026,US,Grand American touring / bagger,Milwaukee-Eight 117 liquid-cooled heads V-twin,1923,False,105,hp,105,False,176.3,False,6-speed,BELT,19,18,130/60B19,180/55B18,22.7,False,368,curb,671 laden,COMMUNITY_SUPPORT,official_current_us,"Touring/bagger; отдельный класс деталей, кофры, обтекатель, аудио.",https://www.harley-davidson.com/us/en/motorcycles/street-glide.html
Harley-Davidson,Road Glide,Road Glide,Road Glide / MY2026,2024,,2024-н.в. / MY2026,US,Grand American touring / sharknose bagger,Milwaukee-Eight 117 liquid-cooled heads V-twin,1923,False,105,hp,105,False,176.3,False,6-speed,BELT,19,18,130/60B19,180/55B18,22.7,True,380,curb,673 laden,COMMUNITY_SUPPORT,needs_manual_verification,"Road Glide близок к Street Glide по базе, но отличается обтекателем/передней частью.",https://www.harley-davidson.com/us/en/motorcycles/road-glide.html
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Harley-Davidson seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Harley-Davidson по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 6
   - Variants/configurations: 8
   - Generations: 8
```

---

## 6. Source notes

- https://www.harley-davidson.com/us/en/motorcycles/low-rider-s.html
- https://www.harley-davidson.com/us/en/motorcycles/low-rider-st.html
- https://www.harley-davidson.com/us/en/motorcycles/nightster-special.html
- https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-special.html
- https://www.harley-davidson.com/us/en/motorcycles/pan-america-1250-st.html
- https://www.harley-davidson.com/us/en/motorcycles/road-glide.html
- https://www.harley-davidson.com/us/en/motorcycles/sportster-s.html
- https://www.harley-davidson.com/us/en/motorcycles/street-glide.html
