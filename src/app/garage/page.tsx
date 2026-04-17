"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GarageVehicle = {
  id: string;
  nickname: string | null;
  vin: string | null;
  odometer: number;
  engineHours: number | null;
  createdAt: string;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  model: {
    id: string;
    name: string;
    slug: string;
  };
  modelVariant: {
    id: string;
    year: number;
    versionName: string;
    generation: string | null;
    market: string | null;
    engineType: string | null;
    coolingType: string | null;
    wheelSizes: string | null;
    brakeSystem: string | null;
    chainPitch: string | null;
    stockSprockets: string | null;
  };
  rideProfile: {
    id: string;
    usageType: string;
    ridingStyle: string;
    loadType: string;
    usageIntensity: string;
  } | null;
};

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadGarage = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/garage");
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Не удалось загрузить гараж.");
          return;
        }

        setVehicles(data.vehicles ?? []);
      } catch (err) {
        console.error(err);
        setError("Произошла ошибка при загрузке гаража.");
      } finally {
        setIsLoading(false);
      }
    };

    loadGarage();
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-gray-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600">
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
            className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
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
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error && vehicles.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
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
                className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Перейти к onboarding
              </Link>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && vehicles.length > 0 ? (
          <div className="grid gap-6">
            {vehicles.map((vehicle) => (
              <section
                key={vehicle.id}
                className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm"
              >
                <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="text-sm text-gray-500">
                      {vehicle.brand.name} | {vehicle.model.name}
                    </div>

                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="transition hover:text-gray-700 hover:underline"
                      >
                        {vehicle.nickname ||
                          `${vehicle.brand.name} ${vehicle.model.name}`}
                      </Link>
                    </h2>

                    <p className="mt-3 text-base leading-7 text-gray-600">
                      {vehicle.modelVariant.year} |{" "}
                      {vehicle.modelVariant.versionName}
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoCard label="Пробег" value={`${vehicle.odometer} км`} />
                      <InfoCard
                        label="Моточасы"
                        value={
                          vehicle.engineHours !== null
                            ? `${vehicle.engineHours}`
                            : "Не указаны"
                        }
                      />
                      <InfoCard label="VIN" value={vehicle.vin || "Не указан"} />
                    </div>

                  </div>

                  <div className="min-w-[280px] rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <h3 className="text-base font-semibold text-gray-950">
                      Профиль эксплуатации
                    </h3>

                    {vehicle.rideProfile ? (
                      <div className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                        <div>
                          <span className="font-medium text-gray-950">
                            Сценарий:
                          </span>{" "}
                          {formatUsageType(vehicle.rideProfile.usageType)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Стиль:
                          </span>{" "}
                          {formatRidingStyle(vehicle.rideProfile.ridingStyle)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Нагрузка:
                          </span>{" "}
                          {formatLoadType(vehicle.rideProfile.loadType)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Интенсивность:
                          </span>{" "}
                          {formatUsageIntensity(
                            vehicle.rideProfile.usageIntensity
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-gray-600">
                        Профиль эксплуатации пока не задан.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SpecCard
                    label="Двигатель"
                    value={vehicle.modelVariant.engineType || "Не указан"}
                  />
                  <SpecCard
                    label="Охлаждение"
                    value={vehicle.modelVariant.coolingType || "Не указано"}
                  />
                  <SpecCard
                    label="Колеса"
                    value={vehicle.modelVariant.wheelSizes || "Не указаны"}
                  />
                  <SpecCard
                    label="Тормоза"
                    value={vehicle.modelVariant.brakeSystem || "Не указаны"}
                  />
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-950">{value}</div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-950">{value}</div>
    </div>
  );
}

function formatUsageType(value: string) {
  switch (value) {
    case "CITY":
      return "Город";
    case "HIGHWAY":
      return "Трасса";
    case "MIXED":
      return "Смешанный";
    case "OFFROAD":
      return "Off-road";
    default:
      return value;
  }
}

function formatRidingStyle(value: string) {
  switch (value) {
    case "CALM":
      return "Спокойный";
    case "ACTIVE":
      return "Активный";
    case "AGGRESSIVE":
      return "Агрессивный";
    default:
      return value;
  }
}

function formatLoadType(value: string) {
  switch (value) {
    case "SOLO":
      return "Один";
    case "PASSENGER":
      return "С пассажиром";
    case "LUGGAGE":
      return "С багажом";
    case "PASSENGER_LUGGAGE":
      return "Пассажир и багаж";
    default:
      return value;
  }
}

function formatUsageIntensity(value: string) {
  switch (value) {
    case "LOW":
      return "Низкая";
    case "MEDIUM":
      return "Средняя";
    case "HIGH":
      return "Высокая";
    default:
      return value;
  }
}