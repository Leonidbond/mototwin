# Status Cache Frontend QA (Web + Expo)

## Scope

Проверка frontend-поведения после backend-изменений по консистентности статусов:
- `TopNodeState` используется как cached summary для top-level узлов.
- `GET /node-tree` остается детальным reference-расчетом effective status.
- Проверка выполняется через два клиента:
  - Web app
  - Expo mobile app

## Prerequisites

Перед началом убедиться, что:
- backend запущен и отвечает;
- database запущена и доступна;
- web app запущен;
- Expo app запущен на устройстве/эмуляторе;
- существует минимум один motorcycle;
- есть maintenance rules для ключевых leaf-узлов (например `ENGINE.LUBE.OIL`, `DRIVETRAIN.CHAIN`, `BRAKES.FRONT.PADS`);
- есть доступ к экрану Service Log и формам:
  - Add Service Event
  - Update Vehicle State

## Test Data Setup (Recommended)

- Выбрать один тестовый motorcycle и зафиксировать его `id`/название.
- Использовать одинаковый motorcycle в обоих клиентах для всех сценариев.
- Для сценария threshold подготовить baseline service event для выбранного leaf-узла.
- Для удобства вести QA-журнал (время, действие, observed status).

## Test Scenarios

### A. Baseline check

1. Открыть один и тот же motorcycle в Web и Expo.
2. Сравнить:
   - identity data (brand/model/variant/nickname/VIN, если отображаются),
   - `odometer`,
   - `engineHours`,
   - top-level статусы,
   - effective statuses в node tree.

Expected:
- Web и Expo показывают консистентные данные и статусы.

### B. Add SERVICE event from Web

1. В Web добавить service event для leaf node (пример: `ENGINE.LUBE.OIL`).
2. В Web проверить:
   - событие появилось в Service Log,
   - статус leaf узла обновился,
   - root `ENGINE` обновился.
3. В Expo проверить:
   - новый `SERVICE` event есть в Service Log,
   - node tree показывает тот же effective status outcome,
   - top-level `ENGINE` консистентен с Web.

Expected:
- Оба клиента отражают один и тот же результат после действия в Web.

### C. Add SERVICE event from Expo

1. В Expo добавить service event для leaf node (пример: `BRAKES.FRONT.PADS`).
2. В Expo проверить:
   - событие появилось в Service Log,
   - статус leaf узла обновился,
   - root `BRAKES` обновился.
3. В Web проверить:
   - новый `SERVICE` event есть в Service Log,
   - node tree показывает тот же effective status outcome,
   - top-level `BRAKES` консистентен с Expo.

Expected:
- Оба клиента отражают один и тот же результат после действия в Expo.

### D. Update vehicle state from Web

1. В Web изменить `odometer` и/или `engineHours`.
2. В Web проверить:
   - новое состояние видно в UI,
   - появился `STATE_UPDATE` в Service Log,
   - статусы пересчитались (если пересечены пороги).
3. В Expo проверить:
   - те же `odometer/engineHours`,
   - есть `STATE_UPDATE` в Service Log,
   - top-level статусы консистентны с Web.

Expected:
- Обновление state в Web синхронно отражается в обоих клиентах.

### E. Update vehicle state from Expo

1. В Expo изменить `odometer` и/или `engineHours`.
2. В Expo проверить:
   - новое состояние видно в UI,
   - появился `STATE_UPDATE` в Service Log,
   - статусы пересчитались (если пересечены пороги).
3. В Web проверить:
   - те же `odometer/engineHours`,
   - есть `STATE_UPDATE` в Service Log,
   - top-level статусы консистентны с Expo.

Expected:
- Обновление state в Expo синхронно отражается в обоих клиентах.

### F. Status threshold scenario

1. Выбрать node с maintenance rule:
   - `ENGINE.LUBE.OIL` или
   - `DRIVETRAIN.CHAIN` или
   - `BRAKES.FRONT.PADS`.
2. Создать/использовать baseline service event для выбранного leaf.
3. Изменять `odometer/engineHours`, чтобы последовательно получить:
   - `SOON`,
   - затем `OVERDUE`.
4. Проверить в Web и Expo:
   - leaf status корректен,
   - parent/root aggregated status корректен,
   - status explanation (если показывается) согласована с visible status.

Expected:
- Переходы `OK/RECENTLY_REPLACED -> SOON -> OVERDUE` совпадают между клиентами.

### G. Service log parity

1. Сравнить Service Log в Web и Expo.
2. Проверить:
   - видны `SERVICE` entries,
   - видны `STATE_UPDATE` entries,
   - даты выглядят корректно,
   - `odometer/engineHours` совпадают,
   - node names совпадают (где применимо).

Expected:
- Web и Expo показывают одинаковую историю событий (с допустимой UI-разницей сортировки/форматирования).

### H. Cached top-level status check

1. Открыть UI-блок с top-level status summary.
2. После каждого действия:
   - добавление service event,
   - обновление vehicle state,
   проверить, что top-level статус обновился.
3. Сравнить top-level summary с detailed node tree.

Expected:
- Summary-статус соответствует актуальному состоянию из node tree.

## Result Table

Прогон выполнен в формате API-proxy QA (через живой backend на локальном окружении).
Полная визуальная сверка UI Web/Expo по экранам остается ручной задачей.

| Scenario | Web result | Expo result | Pass/Fail | Notes |
|---|---|---|---|---|
| A. Baseline check | API responses consistent for one vehicle | API responses consistent for one vehicle | Pass (API proxy) | `topNodes=12`, `nodeTreeRoots=12`; визуальную парность Web/Expo проверить вручную |
| B. Add SERVICE event from Web | SERVICE created, log updated, ENGINE updated | Visual parity not auto-checkable | Pass (API proxy) | `ENGINE.LUBE.OIL -> RECENTLY_REPLACED`, root `ENGINE -> RECENTLY_REPLACED` |
| C. Add SERVICE event from Expo | Visual parity not auto-checkable | SERVICE created, log updated, BRAKES updated | Pass (API proxy) | `BRAKES.FRONT.PADS -> RECENTLY_REPLACED`, root `BRAKES -> RECENTLY_REPLACED` |
| D. Update vehicle state from Web | STATE_UPDATE created, values updated | Visual parity not auto-checkable | Pass (API proxy) | `odometer=11148`, `engineHours=5` |
| E. Update vehicle state from Expo | Visual parity not auto-checkable | STATE_UPDATE created, values updated | Pass (API proxy) | `odometer=11152`, `engineHours=6` |
| F. Status threshold scenario | SOON and OVERDUE transitions observed | Same backend outcome available to both clients | Pass (API proxy) | `ENGINE.LUBE.OIL: SOON -> OVERDUE` |
| G. Service log parity | SERVICE and STATE_UPDATE present | SERVICE and STATE_UPDATE present | Pass (API proxy) | `SERVICE=true`, `STATE_UPDATE=true`, entries count valid |
| H. Cached top-level status check | Mismatch for several roots | Mismatch for several roots | **Fail** | `top-nodes` returns `OK`, while `node-tree.effectiveStatus=null` for multiple roots |

## Known issues found

- Найдено расхождение cached summary vs detailed calculation (сценарий H):
  - для ряда root-узлов `top-nodes` возвращает `OK`,
  - при этом `node-tree` показывает `effectiveStatus = null`.
- Подтвержденные коды с расхождением (на тестовом vehicle):
  - `FUEL`
  - `COOLING`
  - `EXHAUST`
  - `ELECTRICS`
  - `CHASSIS`
  - `STEERING`
  - `SUSPENSION`
  - `WHEELS`
  - `DRIVETRAIN`
  - `CONTROLS`
- Принятое решение по семантике:
  - для root/top-level узлов canonical fallback = `OK`,
  - для child/non-root узлов `effectiveStatus` может оставаться `null`,
    если нет direct/computed/aggregated статуса.

## Follow-up fixes

- После фикса root fallback обязательно повторно прогнать сценарии:
  - `H` (primary regression check),
  - `A` (baseline consistency),
  - `D/E` (state update impact).
- Для полной frontend QA добавить ручную визуальную сверку Web vs Expo по сценариям B/C/D/E/G.

## Final QA conclusion

- API-proxy прогон по сценариям A–H выполнен.
- Большинство сценариев проходят на backend/endpoint уровне.
- Зафиксирован 1 значимый fail (сценарий H): несоответствие `top-nodes` и `node-tree` для части root-узлов.
- Для H выбран canonical fallback: root `null` нормализуется в `OK`; требуется ретест после фикса.
- Текущий вердикт: **Partial pass, H pending retest after fallback fix**.
- Полная UI-парность Web vs Expo требует отдельного ручного прогона по тем же сценариям.
