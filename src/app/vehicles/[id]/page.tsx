"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type VehicleDetail = {
  id: string;
  nickname: string | null;
  vin: string | null;
  odometer: number;
  engineHours: number | null;
  brand: {
    name: string;
  };
  model: {
    name: string;
  };
  modelVariant: {
    year: number;
    versionName: string;
    engineType: string | null;
    coolingType: string | null;
    wheelSizes: string | null;
    brakeSystem: string | null;
    chainPitch: string | null;
    stockSprockets: string | null;
  };
  rideProfile: {
    usageType: string;
    ridingStyle: string;
    loadType: string;
    usageIntensity: string;
  } | null;
};

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ServiceEvent = {
  id: string;
  node: string;
  eventDate: string;
  odometer: number;
  engineHours: number | null;
  serviceType: string;
  costAmount: number | null;
  currency: string | null;
  comment: string | null;
  createdAt: string;
};

type TopNodeState = {
  id: string;
  status: "OK" | "SOON" | "OVERDUE" | "RECENTLY_REPLACED";
  note: string | null;
  updatedAt: string;
  node: {
    id: string;
    code: string;
    name: string;
    level: number;
    displayOrder: number;
  };
};

export default function VehiclePage({ params }: VehiclePageProps) {
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>([]);
  const [isServiceEventsLoading, setIsServiceEventsLoading] = useState(false);
  const [serviceEventsError, setServiceEventsError] = useState("");
  const [topNodes, setTopNodes] = useState<TopNodeState[]>([]);
  const [isTopNodesLoading, setIsTopNodesLoading] = useState(false);
  const [topNodesError, setTopNodesError] = useState("");
  const [isCreatingServiceEvent, setIsCreatingServiceEvent] = useState(false);
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [serviceEventFormSuccess, setServiceEventFormSuccess] = useState("");
  const [node, setNode] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const resolvedParams = await params;
        setVehicleId(resolvedParams.id);
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/vehicles/${resolvedParams.id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Не удалось загрузить мотоцикл.");
          return;
        }

        setVehicle(data.vehicle ?? null);
      } catch (requestError) {
        console.error(requestError);
        setError("Произошла ошибка при загрузке мотоцикла.");
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [params]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    const loadServiceEvents = async () => {
      try {
        setIsServiceEventsLoading(true);
        setServiceEventsError("");
        const response = await fetch(`/api/vehicles/${vehicleId}/service-events`);
        const data = await response.json();

        if (!response.ok) {
          setServiceEventsError(
            data.error || "Не удалось загрузить журнал обслуживания."
          );
          return;
        }

        setServiceEvents(data.serviceEvents ?? []);
      } catch (serviceError) {
        console.error(serviceError);
        setServiceEventsError("Произошла ошибка при загрузке журнала.");
      } finally {
        setIsServiceEventsLoading(false);
      }
    };

    loadServiceEvents();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    const loadTopNodes = async () => {
      try {
        setIsTopNodesLoading(true);
        setTopNodesError("");
        const response = await fetch(`/api/vehicles/${vehicleId}/top-nodes`);
        const data = await response.json();

        if (!response.ok) {
          setTopNodesError(data.error || "Не удалось загрузить основные узлы.");
          return;
        }

        setTopNodes(data.topNodes ?? []);
      } catch (topNodesLoadError) {
        console.error(topNodesLoadError);
        setTopNodesError("Произошла ошибка при загрузке основных узлов.");
      } finally {
        setIsTopNodesLoading(false);
      }
    };

    loadTopNodes();
  }, [vehicleId]);

  const loadServiceEvents = async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsServiceEventsLoading(true);
      setServiceEventsError("");
      const response = await fetch(`/api/vehicles/${vehicleId}/service-events`);
      const data = await response.json();

      if (!response.ok) {
        setServiceEventsError(
          data.error || "Не удалось загрузить журнал обслуживания."
        );
        return;
      }

      setServiceEvents(data.serviceEvents ?? []);
    } catch (serviceError) {
      console.error(serviceError);
      setServiceEventsError("Произошла ошибка при загрузке журнала.");
    } finally {
      setIsServiceEventsLoading(false);
    }
  };

  const resetServiceEventForm = () => {
    setNode("");
    setServiceType("");
    setEventDate("");
    setOdometer("");
    setEngineHours("");
    setCostAmount("");
    setCurrency("");
    setComment("");
  };

  const handleCreateServiceEvent = async () => {
    try {
      setServiceEventFormError("");
      setServiceEventFormSuccess("");

      if (!vehicleId) {
        setServiceEventFormError("Не удалось определить мотоцикл.");
        return;
      }

      if (!node.trim() || !serviceType.trim() || !eventDate.trim()) {
        setServiceEventFormError("Заполните node, тип сервиса и дату.");
        return;
      }

      if (!odometer.trim()) {
        setServiceEventFormError("Укажите пробег.");
        return;
      }

      setIsCreatingServiceEvent(true);

      const response = await fetch(`/api/vehicles/${vehicleId}/service-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          node: node.trim(),
          serviceType: serviceType.trim(),
          eventDate,
          odometer: Number(odometer),
          engineHours: engineHours.trim() ? Number(engineHours) : null,
          costAmount: costAmount.trim() ? Number(costAmount) : null,
          currency: currency.trim() || null,
          comment: comment.trim() || null,
          installedPartsJson: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServiceEventFormError(
          data.error || "Не удалось создать сервисное событие."
        );
        return;
      }

      setServiceEventFormSuccess("Сервисное событие добавлено.");
      resetServiceEventForm();
      await loadServiceEvents();
    } catch (createError) {
      console.error(createError);
      setServiceEventFormError("Произошла ошибка при создании события.");
    } finally {
      setIsCreatingServiceEvent(false);
    }
  };

  const title = vehicle?.nickname || `${vehicle?.brand.name || ""} ${vehicle?.model.name || ""}`.trim() || "Карточка мотоцикла";

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-gray-950">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/garage" className="transition hover:text-gray-950">
            Гараж
          </Link>{" "}
          <span className="text-gray-400">/</span>{" "}
          <span className="text-gray-900">Мотоцикл</span>
        </nav>

        <div className="mb-8">
          <Link
            href="/garage"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Назад в гараж
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-600">Загрузка мотоцикла...</p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Не удалось открыть мотоцикл
            </h1>
            <p className="mt-3 text-sm text-red-700">{error}</p>
            <p className="mt-2 text-xs text-red-600">ID: {vehicleId}</p>
          </div>
        ) : null}

        {!isLoading && !error && vehicle ? (
          <div className="space-y-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="text-sm text-gray-500">
                {vehicle.brand.name} | {vehicle.model.name}
              </div>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                {title}
              </h1>

              <p className="mt-3 text-base leading-7 text-gray-600">
                {vehicle.modelVariant.year} | {vehicle.modelVariant.versionName}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard label="Никнейм" value={vehicle.nickname || "Не задан"} />
                <InfoCard label="VIN" value={vehicle.vin || "Не указан"} />
                <InfoCard label="Пробег" value={`${vehicle.odometer} км`} />
                <InfoCard
                  label="Моточасы"
                  value={
                    vehicle.engineHours !== null
                      ? `${vehicle.engineHours}`
                      : "Не указаны"
                  }
                />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <h2 className="text-base font-semibold text-gray-950">
                    Профиль эксплуатации
                  </h2>

                  {vehicle.rideProfile ? (
                    <div className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                      <div>
                        <span className="font-medium text-gray-950">
                          Сценарий:
                        </span>{" "}
                        {formatUsageType(vehicle.rideProfile.usageType)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-950">Стиль:</span>{" "}
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
                        {formatUsageIntensity(vehicle.rideProfile.usageIntensity)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-600">
                      Профиль эксплуатации пока не задан.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="text-base font-semibold text-gray-950">
                    Техническая сводка
                  </h2>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                    <SpecCard
                      label="Шаг цепи"
                      value={vehicle.modelVariant.chainPitch || "Не указан"}
                    />
                    <SpecCard
                      label="Стоковые звезды"
                      value={vehicle.modelVariant.stockSprockets || "Не указаны"}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                Основные узлы
              </h2>

              {isTopNodesLoading ? (
                <p className="mt-4 text-sm text-gray-600">
                  Загрузка основных узлов...
                </p>
              ) : null}

              {!isTopNodesLoading && topNodesError ? (
                <p className="mt-4 text-sm text-red-600">{topNodesError}</p>
              ) : null}

              {!isTopNodesLoading && !topNodesError && topNodes.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Основные узлы пока не найдены.
                </p>
              ) : null}

              {!isTopNodesLoading && !topNodesError && topNodes.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {topNodes.map((topNode) => (
                    <div
                      key={topNode.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-gray-950">
                          {topNode.node.name}
                        </h3>
                        <span className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {formatTopNodeStatus(topNode.status)}
                        </span>
                      </div>

                      {topNode.note ? (
                        <p className="mt-3 text-sm text-gray-700">{topNode.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                Журнал обслуживания
              </h2>

              {isServiceEventsLoading ? (
                <p className="mt-4 text-sm text-gray-600">
                  Загрузка журнала обслуживания...
                </p>
              ) : null}

              {!isServiceEventsLoading && serviceEventsError ? (
                <p className="mt-4 text-sm text-red-600">{serviceEventsError}</p>
              ) : null}

              {!isServiceEventsLoading &&
              !serviceEventsError &&
              serviceEvents.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Сервисных событий пока нет.
                </p>
              ) : null}

              {!isServiceEventsLoading &&
              !serviceEventsError &&
              serviceEvents.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {serviceEvents.map((serviceEvent) => (
                    <div
                      key={serviceEvent.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-gray-950">
                          {serviceEvent.serviceType}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {formatDate(serviceEvent.eventDate)}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                        <div>
                          <span className="font-medium text-gray-950">Node:</span>{" "}
                          {serviceEvent.node}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Пробег:
                          </span>{" "}
                          {serviceEvent.odometer} км
                        </div>
                        {serviceEvent.engineHours !== null ? (
                          <div>
                            <span className="font-medium text-gray-950">
                              Моточасы:
                            </span>{" "}
                            {serviceEvent.engineHours}
                          </div>
                        ) : null}
                        {serviceEvent.costAmount !== null &&
                        serviceEvent.currency ? (
                          <div>
                            <span className="font-medium text-gray-950">
                              Стоимость:
                            </span>{" "}
                            {serviceEvent.costAmount} {serviceEvent.currency}
                          </div>
                        ) : null}
                      </div>

                      {serviceEvent.comment ? (
                        <p className="mt-3 text-sm text-gray-700">
                          <span className="font-medium text-gray-950">
                            Комментарий:
                          </span>{" "}
                          {serviceEvent.comment}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                Добавить сервисное событие
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InputField label="Node">
                  <input
                    value={node}
                    onChange={(event) => setNode(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Например: engine"
                  />
                </InputField>

                <InputField label="Тип сервиса">
                  <input
                    value={serviceType}
                    onChange={(event) => setServiceType(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Например: Oil change"
                  />
                </InputField>

                <InputField label="Дата события">
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  />
                </InputField>

                <InputField label="Пробег, км">
                  <input
                    value={odometer}
                    onChange={(event) => setOdometer(event.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Например: 15000"
                  />
                </InputField>

                <InputField label="Моточасы">
                  <input
                    value={engineHours}
                    onChange={(event) => setEngineHours(event.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Если применимо"
                  />
                </InputField>

                <InputField label="Стоимость">
                  <input
                    value={costAmount}
                    onChange={(event) => setCostAmount(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Например: 120.5"
                  />
                </InputField>

                <InputField label="Валюта">
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                  >
                    <option value="">Не выбрана</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </InputField>
              </div>

              <div className="mt-4">
                <InputField label="Комментарий">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Опционально"
                  />
                </InputField>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreateServiceEvent}
                  disabled={isCreatingServiceEvent}
                  className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingServiceEvent ? "Сохраняем..." : "Добавить событие"}
                </button>

                {serviceEventFormError ? (
                  <p className="mt-3 text-sm text-red-600">{serviceEventFormError}</p>
                ) : null}

                {serviceEventFormSuccess ? (
                  <p className="mt-3 text-sm text-green-600">
                    {serviceEventFormSuccess}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function InputField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900">
        {label}
      </label>
      {children}
    </div>
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU");
}

function formatTopNodeStatus(
  status: "OK" | "SOON" | "OVERDUE" | "RECENTLY_REPLACED"
) {
  switch (status) {
    case "OK":
      return "OK";
    case "SOON":
      return "Soon";
    case "OVERDUE":
      return "Overdue";
    case "RECENTLY_REPLACED":
      return "Recently replaced";
    default:
      return status;
  }
}
