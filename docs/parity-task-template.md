# Шаблон задачи Cursor: паритет Web + Expo

Скопируйте блок ниже в новый чат / задачу и заполните поля. Подробности процесса: [web-mobile-parity-workflow.md](./web-mobile-parity-workflow.md).

---

```markdown
## Context
<!-- Коротко: откуда задача, что уже есть в продукте, ссылки на issues/docs. -->

## Goal
<!-- Измеримый результат: что должно уметь пользователь или система. -->

## Files allowed to change
<!-- Список путей или масок, например: src/app/**/..., apps/app/**/..., packages/types/**/... -->

## Files that must not be changed
<!-- Явный запрет: prisma/**, src/app/api/**, ... -->

## Backend impact
<!-- Какие эндпоинты/поля/ошибки; если изменений нет — «Нет». Если есть — перечислить контракт. -->

## Shared impact
<!-- packages/types, domain, api-client, design-tokens, component contracts; «Нет» или конкретные пакеты/файлы. -->

## Web impact
<!-- Страницы, поведение; «Нет» / «Отложено: причина». -->

## Expo impact
<!-- Экраны, навигация; «Нет» / «Отложено: причина». -->

## Parity expectation
<!-- Например: полный паритет по данным и исходам; или намеренные отличия (перечислить); или один клиент сейчас + документированный gap. -->

## QA requirements
<!-- Сценарии на web и Expo; граничные случаи; проверка API при необходимости. -->

## Documentation requirements
<!-- Какие docs обновить или создать; где зафиксировать gap. Для паритета: при необходимости cross-platform-parity.md, web-expo-parity-audit.md (краткий статус/ссылка), web-expo-parity-audit-repeat-2.md или тематический web-expo-*-fixes.md; контракты — shared-form-contracts.md, shared-design-tokens.md и т.п. -->

## Constraints
<!-- MVP, без новых библиотек, только docs, и т.д. -->

## Expected result
<!-- Как проверить готовность; критерии приёмки. -->
```

---

## Минимальный вариант (короткая задача)

Если задача маленькая, в промпте всё равно должны быть **четыре строки**:

- **Web impact:** …  
- **Expo impact:** …  
- **Shared impact:** …  
- **Parity expectation:** …  

Рекомендуется также одной строкой указать **Backend impact** (или «Нет») и **Documentation requirements** (или «Нет»), если задача трогает API, контракты или осознанный разрыв паритета.

Остальное — по необходимости.
