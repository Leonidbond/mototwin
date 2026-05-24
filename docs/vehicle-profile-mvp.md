# Vehicle Profile MVP

## Scope

MotoTwin supports editing motorcycle profile data on web and Expo.

Editable fields:

- `nickname`
- `vin`
- ride profile:
  - `usageType`
  - `ridingStyle`
  - `loadType`
  - `usageIntensity`

## Important rule

`odometer` and `engineHours` are **not** edited in profile flow.

They are updated only through **"Обновить состояние"** (`STATE_UPDATE`) flow so history remains correct.

## Non-editable fields

Profile edit does not change:

- `motorcycleBrandId`
- `motorcycleModelFamilyId`
- `motorcycleVariantId`
- `motorcycleGenerationId`
- ownership fields (`userId`, `garageId`)
- trash fields (`trashedAt`, `trashExpiresAt`)

Каталог моделей теперь 4-уровневый (`MotorcycleBrand → MotorcycleModelFamily → MotorcycleVariant → MotorcycleGeneration` + sidecar `MotorcycleTechnicalSpecs`), см. [data-model.md](./data-model.md). Чтобы поменять привязку ТС к модели/поколению, нужно создать новый мотоцикл (а старый — в свалку): миграция между поколениями в profile-flow не предусмотрена.

## API

- `PATCH /api/vehicles/[id]` updates only profile fields.
- Ownership scope is enforced through current user/garage context.
- Non-owned vehicle returns `404`.
- Trashed vehicle is not editable via normal profile flow (`404`).
- Response returns updated vehicle detail-compatible payload.

## Validation

- `nickname`: trimmed, max `80`, nullable.
- `vin`: trimmed, uppercased, max `32`, nullable.
- Ride profile fields are validated against enum values.

## UI behavior

- Web Vehicle Detail has action **"Редактировать"** with modal **"Редактировать мотоцикл"**.
- Expo has dedicated profile edit screen for the same fields.
- UI includes hint:
  - "Пробег и моточасы обновляются через действие «Обновить состояние»."
- On save:
  - updated data is reflected in Vehicle Detail and Garage card views.

## Ownership and trash constraints

- Edit profile follows existing ownership guards.
- Trashed vehicles are handled via trash lifecycle (restore/permanent delete) and are excluded from normal profile edit path.
