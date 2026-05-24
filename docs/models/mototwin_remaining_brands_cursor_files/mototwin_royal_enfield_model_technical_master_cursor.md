# MotoTwin Royal Enfield Model Technical Master for Cursor — unified structure

Дата подготовки: 2026-05-24  
Назначение: Royal Enfield seed-файл с техническими параметрами, приведенный к единой структуре MotoTwin Model Technical Master.

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

Это **MVP technical seed**, а не полный всемирный каталог Royal Enfield.  
Для строк со статусом `official_current_*` основные параметры взяты с официальных страниц производителя или официальных PDF.  
Для строк со статусом `needs_manual_verification` часть значений заполнена как первичная база для разработки и должна быть перепроверена перед production-импортом.

---

## 3. Royal Enfield technical master table

| brand | model_family | variant | generation | year_from | year_to | years_label | market_region | segment | engine | displacement_cc | displacement_is_approx | power_value | power_unit | power_hp_normalized | power_is_approx | torque_nm | torque_is_approx | gearbox | drive | front_wheel_in | rear_wheel_in | front_tire | rear_tire | fuel_l | fuel_is_approx | weight_kg | weight_type | seat_mm | support_level | data_status | mototwin_comment | source_url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Royal Enfield | Himalayan 450 | Himalayan 450 | Himalayan 450 / current | 2024 | null | 2024-н.в. / current | GLOBAL | Adventure / light-middle off-road | 452cc liquid-cooled single-cylinder DOHC Sherpa | 452 | false | 40.02 | hp | 40.02 | false | 40 | false | 6-speed | CHAIN | 21 | 17 | 90/90-21 | 140/80-17 | 17.0 | true | 196 | curb | 825/845 | MVP_CORE | official_current_pdf | Ключевой Royal Enfield adventure; сильный кандидат для MotoTwin в бюджетном adventure-сегменте. | https://www.royalenfield.com/content/dam/open-pdf/royal_enfield_himalayan_450_technical_specifications.pdf |
| Royal Enfield | Guerrilla 450 | Guerrilla 450 | Guerrilla 450 / current | 2024 | null | 2024-н.в. / current | US | Roadster / urban scrambler | 452cc liquid-cooled single-cylinder DOHC Sherpa | 452 | false | 39.48 | hp | 39.48 | false | 40 | false | 6-speed | CHAIN | 17 | 17 | 120/70-17 | 160/60-17 | 11.0 | false | 185 | wet | 780 | COMMUNITY_SUPPORT | official_current_pdf_partial | Та же Sherpa-платформа, но дорожные 17/17; не смешивать с Himalayan. | https://www.royalenfield.com/content/dam/open-pdf/guerrilla-450-technical-specifications-rena.pdf |
| Royal Enfield | Classic 350 | Classic 350 | Classic 350 / J-platform current | 2021 | null | 2021-н.в. / current | US | Classic / retro roadster | 349cc air/oil-cooled single-cylinder J-platform | 349 | false | 20.2 | PS | 19.9 | false | 27 | false | 5-speed | CHAIN | 19 | 18 | 100/90-19 | 120/80-18 | 13.0 | true | 195 | curb | 805 | COMMUNITY_SUPPORT | official_current_partial | Массовая 350-платформа; важна по объему пользователей и простым расходникам. | https://www.royalenfield.com/us/en/motorcycles/classic-350/ |
| Royal Enfield | Bullet 350 | Bullet 350 | Bullet 350 / J-platform current | 2023 | null | 2023-н.в. / current | GLOBAL | Classic / standard | 349cc air/oil-cooled single-cylinder J-platform | 349 | false | 20.2 | PS | 19.9 | false | 27 | false | 5-speed | CHAIN | 19 | 18 | 100/90-19 | 120/80-18 | 13.0 | true | 195 | curb | 805 | EARLY_BETA | needs_manual_verification | Близка к Classic 350, но отдельная модель по кузовным деталям и комплектации. | https://www.royalenfield.com/us/en/motorcycles/bullet-350/ |
| Royal Enfield | Hunter 350 | Hunter 350 | Hunter 350 / current | 2022 | null | 2022-н.в. / current | US | Roadster / urban entry | 349cc air/oil-cooled single-cylinder J-platform | 349 | false | 20.2 | PS | 19.9 | false | 27 | false | 5-speed | CHAIN | 17 | 17 | 110/70-17 | 140/70-17 | 13.0 | true | 181 | curb | 800 | EARLY_BETA | needs_manual_verification | Городская 350-платформа с 17/17; не смешивать с Classic/Bullet. | https://www.royalenfield.com/us/en/motorcycles/hunter-350/ |
| Royal Enfield | Meteor 350 | Meteor 350 | Meteor 350 / current | 2020 | null | 2020-н.в. / current | US | Cruiser / entry | 349cc air/oil-cooled single-cylinder J-platform | 349 | false | 20.2 | PS | 19.9 | false | 27 | false | 5-speed | CHAIN | 19 | 17 | 100/90-19 | 140/70-17 | 15.0 | true | 191 | curb | 765 | EARLY_BETA | needs_manual_verification | Круизерная 350-платформа; отдельная посадка и заднее колесо. | https://www.royalenfield.com/us/en/motorcycles/meteor/ |
| Royal Enfield | INT650 | INT650 | INT650 / current | 2018 | null | 2018-н.в. / current | US | Retro roadster / twin | 648cc air/oil-cooled parallel twin | 648 | false | 47 | hp | 47 | false | 54 | false | 6-speed | CHAIN | 18 | 18 | 100/90-18 | 130/70-18 | 13.7 | true | 202 | curb | 804 | COMMUNITY_SUPPORT | official_current_partial | Массовая 650 twin-платформа; важно для расходников и кастомизации. | https://www.royalenfield.com/us/en/motorcycles/int650/ |
| Royal Enfield | Continental GT 650 | Continental GT 650 | Continental GT 650 / current | 2018 | null | 2018-н.в. / current | US | Cafe racer / twin | 648cc air/oil-cooled parallel twin | 648 | false | 47 | hp | 47 | false | 52 | false | 6-speed | CHAIN | 18 | 18 | 100/90-18 | 130/70-18 | 12.5 | true | 211 | curb | 820 | COMMUNITY_SUPPORT | official_current_partial | Cafe-racer 650; мотор общий с INT650, но посадка/кузовные детали другие. | https://www.royalenfield.com/us/en/motorcycles/continental-gt/ |
| Royal Enfield | Super Meteor 650 | Super Meteor 650 | Super Meteor 650 / current | 2023 | null | 2023-н.в. / current | US | Cruiser / middleweight twin | 648cc air/oil-cooled parallel twin | 648 | false | 47 | hp | 47 | true | 52.3 | true | 6-speed | CHAIN | 19 | 16 | 100/90-19 | 150/80-16 | 15.7 | true | 241 | curb | 740 | EARLY_BETA | needs_manual_verification | 650 cruiser; отдельные колеса/посадка против INT/Continental. | https://www.royalenfield.com/us/en/motorcycles/super-meteor-650/ |

---

## 4. CSV seed для Cursor / Prisma importer

Скопируй этот блок в файл:

```text
prisma/seed-data/royal_enfield-model-technical-master.csv
```

```csv
brand,model_family,variant,generation,year_from,year_to,years_label,market_region,segment,engine,displacement_cc,displacement_is_approx,power_value,power_unit,power_hp_normalized,power_is_approx,torque_nm,torque_is_approx,gearbox,drive,front_wheel_in,rear_wheel_in,front_tire,rear_tire,fuel_l,fuel_is_approx,weight_kg,weight_type,seat_mm,support_level,data_status,mototwin_comment,source_url
Royal Enfield,Himalayan 450,Himalayan 450,Himalayan 450 / current,2024,,2024-н.в. / current,GLOBAL,Adventure / light-middle off-road,452cc liquid-cooled single-cylinder DOHC Sherpa,452,False,40.02,hp,40.02,False,40,False,6-speed,CHAIN,21,17,90/90-21,140/80-17,17.0,True,196,curb,825/845,MVP_CORE,official_current_pdf,Ключевой Royal Enfield adventure; сильный кандидат для MotoTwin в бюджетном adventure-сегменте.,https://www.royalenfield.com/content/dam/open-pdf/royal_enfield_himalayan_450_technical_specifications.pdf
Royal Enfield,Guerrilla 450,Guerrilla 450,Guerrilla 450 / current,2024,,2024-н.в. / current,US,Roadster / urban scrambler,452cc liquid-cooled single-cylinder DOHC Sherpa,452,False,39.48,hp,39.48,False,40,False,6-speed,CHAIN,17,17,120/70-17,160/60-17,11.0,False,185,wet,780,COMMUNITY_SUPPORT,official_current_pdf_partial,"Та же Sherpa-платформа, но дорожные 17/17; не смешивать с Himalayan.",https://www.royalenfield.com/content/dam/open-pdf/guerrilla-450-technical-specifications-rena.pdf
Royal Enfield,Classic 350,Classic 350,Classic 350 / J-platform current,2021,,2021-н.в. / current,US,Classic / retro roadster,349cc air/oil-cooled single-cylinder J-platform,349,False,20.2,PS,19.9,False,27,False,5-speed,CHAIN,19,18,100/90-19,120/80-18,13.0,True,195,curb,805,COMMUNITY_SUPPORT,official_current_partial,Массовая 350-платформа; важна по объему пользователей и простым расходникам.,https://www.royalenfield.com/us/en/motorcycles/classic-350/
Royal Enfield,Bullet 350,Bullet 350,Bullet 350 / J-platform current,2023,,2023-н.в. / current,GLOBAL,Classic / standard,349cc air/oil-cooled single-cylinder J-platform,349,False,20.2,PS,19.9,False,27,False,5-speed,CHAIN,19,18,100/90-19,120/80-18,13.0,True,195,curb,805,EARLY_BETA,needs_manual_verification,"Близка к Classic 350, но отдельная модель по кузовным деталям и комплектации.",https://www.royalenfield.com/us/en/motorcycles/bullet-350/
Royal Enfield,Hunter 350,Hunter 350,Hunter 350 / current,2022,,2022-н.в. / current,US,Roadster / urban entry,349cc air/oil-cooled single-cylinder J-platform,349,False,20.2,PS,19.9,False,27,False,5-speed,CHAIN,17,17,110/70-17,140/70-17,13.0,True,181,curb,800,EARLY_BETA,needs_manual_verification,Городская 350-платформа с 17/17; не смешивать с Classic/Bullet.,https://www.royalenfield.com/us/en/motorcycles/hunter-350/
Royal Enfield,Meteor 350,Meteor 350,Meteor 350 / current,2020,,2020-н.в. / current,US,Cruiser / entry,349cc air/oil-cooled single-cylinder J-platform,349,False,20.2,PS,19.9,False,27,False,5-speed,CHAIN,19,17,100/90-19,140/70-17,15.0,True,191,curb,765,EARLY_BETA,needs_manual_verification,Круизерная 350-платформа; отдельная посадка и заднее колесо.,https://www.royalenfield.com/us/en/motorcycles/meteor/
Royal Enfield,INT650,INT650,INT650 / current,2018,,2018-н.в. / current,US,Retro roadster / twin,648cc air/oil-cooled parallel twin,648,False,47,hp,47,False,54,False,6-speed,CHAIN,18,18,100/90-18,130/70-18,13.7,True,202,curb,804,COMMUNITY_SUPPORT,official_current_partial,Массовая 650 twin-платформа; важно для расходников и кастомизации.,https://www.royalenfield.com/us/en/motorcycles/int650/
Royal Enfield,Continental GT 650,Continental GT 650,Continental GT 650 / current,2018,,2018-н.в. / current,US,Cafe racer / twin,648cc air/oil-cooled parallel twin,648,False,47,hp,47,False,52,False,6-speed,CHAIN,18,18,100/90-18,130/70-18,12.5,True,211,curb,820,COMMUNITY_SUPPORT,official_current_partial,"Cafe-racer 650; мотор общий с INT650, но посадка/кузовные детали другие.",https://www.royalenfield.com/us/en/motorcycles/continental-gt/
Royal Enfield,Super Meteor 650,Super Meteor 650,Super Meteor 650 / current,2023,,2023-н.в. / current,US,Cruiser / middleweight twin,648cc air/oil-cooled parallel twin,648,False,47,hp,47,True,52.3,True,6-speed,CHAIN,19,16,100/90-19,150/80-16,15.7,True,241,curb,740,EARLY_BETA,needs_manual_verification,650 cruiser; отдельные колеса/посадка против INT/Continental.,https://www.royalenfield.com/us/en/motorcycles/super-meteor-650/
```

---

## 5. Prompt для Cursor

```text
Используй этот файл как Royal Enfield seed для MotoTwin Model Technical Master.

Требования:
1. Импортируй Royal Enfield по общей структуре Brand → ModelFamily → Variant → Generation → TechnicalSpecs.
2. Не создавай отдельную схему под бренд. Все бренды должны импортироваться одним importer-ом и в одну Prisma-модель.
3. Пустые значения из CSV преобразуй в null.
4. Булевы значения `True` / `False` преобразуй в boolean.
5. Каталог запчастей, сервисные интервалы и fitment-правила должны ссылаться на `generation_id`.
6. Поле `drive` означает final drive. Для Harley-Davidson не путай primary chain с final belt.
7. Строки с `data_status=needs_manual_verification` не использовать как production-verified без повторной проверки по мануалам/официальным каталогам.
8. После импорта проверь счетчики:
   - Brand: 1
   - Model families: 9
   - Variants/configurations: 9
   - Generations: 9
```

---

## 6. Source notes

- https://www.royalenfield.com/content/dam/open-pdf/guerrilla-450-technical-specifications-rena.pdf
- https://www.royalenfield.com/content/dam/open-pdf/royal_enfield_himalayan_450_technical_specifications.pdf
- https://www.royalenfield.com/us/en/motorcycles/bullet-350/
- https://www.royalenfield.com/us/en/motorcycles/classic-350/
- https://www.royalenfield.com/us/en/motorcycles/continental-gt/
- https://www.royalenfield.com/us/en/motorcycles/hunter-350/
- https://www.royalenfield.com/us/en/motorcycles/int650/
- https://www.royalenfield.com/us/en/motorcycles/meteor/
- https://www.royalenfield.com/us/en/motorcycles/super-meteor-650/
