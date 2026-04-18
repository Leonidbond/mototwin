"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildGarageCardProps, filterMeaningfulGarageSpecHighlights } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";

const garageApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadGarage = async () => {
      try {
        setIsLoading(true);
        setError("");

        const data = await garageApi.getGarageVehicles();
        setVehicles(data.vehicles ?? []);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Произошла ошибка при загрузке гаража."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadGarage();
  }, []);

  return (
    <main
      className="min-h-screen px-6 py-16 text-gray-950"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-sm"
              style={{
                borderColor: productSemanticColors.borderStrong,
                backgroundColor: productSemanticColors.chipBackground,
                color: productSemanticColors.textSecondary,
              }}
            >
              MotoTwin | Гараж
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Ваш гараж
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
              Здесь отображаются сохраненные мотоциклы, их профиль и базовые
              данные для дальнейшего обслуживания, fitment и учета расходов.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: productSemanticColors.primaryAction }}
          >
            Добавить мотоцикл
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-600">Загрузка гаража...</p>
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-3xl border p-8"
            style={{
              borderColor: productSemanticColors.errorBorder,
              backgroundColor: productSemanticColors.errorSurface,
            }}
          >
            <p className="text-sm font-medium" style={{ color: productSemanticColors.error }}>
              {error}
            </p>
          </div>
        ) : null}

        {!isLoading && !error && vehicles.length === 0 ? (
          <div
            className="rounded-3xl border p-8 shadow-sm"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: productSemanticColors.card,
            }}
          >
            <h2 className="text-2xl font-semibold tracking-tight">
              В гараже пока нет мотоциклов
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              Начните с добавления первого мотоцикла. После этого здесь появится
              его карточка.
            </p>
            <div className="mt-8">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: productSemanticColors.primaryAction }}
              >
                Добавить мотоцикл
              </Link>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && vehicles.length > 0 ? (
          <div className="grid gap-6">
            {vehicles.map((vehicle) => {
              const card = buildGarageCardProps(vehicle);
              const specHighlights = filterMeaningfulGarageSpecHighlights(card.specHighlights);

              return (
                <section
                  key={vehicle.id}
                  className="rounded-3xl border p-8 shadow-sm"
                  style={{
                    borderColor: productSemanticColors.border,
                    backgroundColor: productSemanticColors.card,
                  }}
                >
                <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="text-sm text-gray-500">
                      {card.brandModelCaption}
                    </div>

                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="transition hover:text-gray-700 hover:underline"
                      >
                        {card.summary.title}
                      </Link>
                    </h2>

                    <p className="mt-3 text-base leading-7 text-gray-600">
                      {card.summary.yearVersionLine.replace(" · ", " | ")}
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoCard label="Пробег" value={card.summary.odometerLine} />
                      <InfoCard
                        label="Моточасы"
                        value={
                          card.summary.engineHoursLine !== null
                            ? card.summary.engineHoursLine
                            : "Не указаны"
                        }
                      />
                      <InfoCard label="VIN" value={card.summary.vinLine || "Не указан"} />
                    </div>

                  </div>

                  <div
                    className="min-w-[280px] rounded-2xl border p-5"
                    style={{
                      borderColor: productSemanticColors.border,
                      backgroundColor: productSemanticColors.cardMuted,
                    }}
                  >
                    <h3 className="text-base font-semibold text-gray-950">
                      Профиль эксплуатации
                    </h3>

                    {card.rideProfile ? (
                      <div className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                        <div>
                          <span className="font-medium text-gray-950">
                            Сценарий:
                          </span>{" "}
                          {card.rideProfile.usageType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Стиль:
                          </span>{" "}
                          {card.rideProfile.ridingStyle}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Нагрузка:
                          </span>{" "}
                          {card.rideProfile.loadType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Интенсивность:
                          </span>{" "}
                          {card.rideProfile.usageIntensity}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-gray-600">
                        Профиль эксплуатации пока не задан.
                      </p>
                    )}
                  </div>
                </div>

                {specHighlights.length > 0 ? (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {specHighlights.map((spec) => (
                      <SpecCard key={spec.label} label={spec.label} value={spec.value} />
                    ))}
                  </div>
                ) : null}
              </section>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: productSemanticColors.border,
        backgroundColor: productSemanticColors.cardMuted,
      }}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-950">{value}</div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: productSemanticColors.border,
        backgroundColor: productSemanticColors.card,
      }}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-950">{value}</div>
    </div>
  );
}
