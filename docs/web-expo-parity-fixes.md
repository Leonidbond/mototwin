# Исправления паритета Web / Expo (высокий приоритет)

**Дата:** 2026-04-18  
**Основание:** [web-expo-parity-audit.md](./web-expo-parity-audit.md) — пункты §1 и §2 (High, functional).

## Что сделано

### 1. Пояснение статуса узла на Expo

- По нажатию на краткую строку (`shortExplanationLabel`), если у узла есть `statusExplanation`, открывается **модальное окно** с теми же смысловыми блоками, что и на web: кратко/подробно, сработавшее измерение, пробег / моточасы / время, дата расчёта, trigger mode.
- Используется `getStatusExplanationTriggeredByLabel` из `@mototwin/domain`.

### 2. Валидация «Новое сервисное событие» на Expo

- Введён **`getTodayDateYmdLocal()`** в `packages/domain` (локальный календарный день, как на web).
- **`validateAddServiceEventFormValuesMobile`** принимает **`AddServiceEventValidationContext`** и делегирует в **`validateAddServiceEventFormValues`** — те же правила: лист, дата не в будущем, пробег целый ≥ 0, пробег события ≤ текущего пробега ТС, моточасы/стоимость как на web.
- Экран формы хранит **`currentVehicleOdometer`** с `getVehicleDetail` и передаёт контекст при сохранении.
- Начальная дата события по умолчанию: **`getTodayDateYmdLocal()`** вместо UTC-обрезки `toISOString()`.

## Изменённые файлы

| Файл |
|------|
| `packages/domain/src/forms.ts` |
| `packages/domain/src/index.ts` |
| `apps/app/app/vehicles/[id]/index.tsx` |
| `apps/app/app/vehicles/[id]/service-events/new.tsx` |
| `docs/web-expo-parity-audit.md` |
| `docs/web-expo-parity-fixes.md` |

## Impact

| Слой | Изменения |
|------|-----------|
| **Web** | Нет (поведение уже соответствовало целевым правилам). |
| **Expo** | Модалка пояснения статуса; ужесточение/выравнивание валидации сервисного события; локальная «сегодняшняя» дата. |
| **Shared** | `getTodayDateYmdLocal`, `validateAddServiceEventFormValuesMobile` → делегирование к общему валидатору с контекстом. |
| **Backend** | Нет. |

## Проверки

- Выполнено: `npx tsc --noEmit` (успешно).
- **Требуется ручной QA:** сценарии из аудита на реальном Expo (дерево → пояснение; форма события → дата в будущем, пробег > текущего, не-лист при обходе экранных проверок и т.д.).

## Оставшиеся разрывы (кратко)

- Средний приоритет и ниже из аудита: сортировка журнала на Expo, гараж, подписи месяца, комментарии, лейблы профиля, дефолты онбординга и др. — **не входили в этот шаг**.
- Долгосрочно: вынести разметку пояснения статуса в shared-хелпер текстовых полей (при необходимости), чтобы web/Expo не расходились при изменении полей API.
