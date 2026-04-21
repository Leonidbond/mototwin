"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildGarageCardProps,
  buildGarageDashboardSummary,
  filterMeaningfulGarageSpecHighlights,
} from "@mototwin/domain";
import { productSemanticColors, statusSemanticTokens } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";

const garageApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUsageProfileExpanded, setIsUsageProfileExpanded] = useState(false);
  const [isTechnicalSummaryExpanded, setIsTechnicalSummaryExpanded] = useState(false);
  const [hasLoadedCollapsePrefs, setHasLoadedCollapsePrefs] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const loadGarage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [data, trashData] = await Promise.all([
        garageApi.getGarageVehicles(),
        garageApi.getTrashedVehicles(),
      ]);
      setVehicles(data.vehicles ?? []);
      setTrashCount(trashData.vehicles?.length ?? 0);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Произошла ошибка при загрузке гаража."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGarage();
  }, [loadGarage]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadGarage();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadGarage]);

  useEffect(() => {
    try {
      const usageRaw = localStorage.getItem("garage.usageProfile.expanded");
      const techRaw = localStorage.getItem("garage.technicalSummary.expanded");
      if (usageRaw === "true" || usageRaw === "false") {
        setIsUsageProfileExpanded(usageRaw === "true");
      }
      if (techRaw === "true" || techRaw === "false") {
        setIsTechnicalSummaryExpanded(techRaw === "true");
      }
    } catch {
      // Ignore localStorage failures for local UI prefs.
    } finally {
      setHasLoadedCollapsePrefs(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    try {
      localStorage.setItem("garage.usageProfile.expanded", String(isUsageProfileExpanded));
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [hasLoadedCollapsePrefs, isUsageProfileExpanded]);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    try {
      localStorage.setItem("garage.technicalSummary.expanded", String(isTechnicalSummaryExpanded));
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [hasLoadedCollapsePrefs, isTechnicalSummaryExpanded]);

  const dashboardSummary = useMemo(
    () => buildGarageDashboardSummary(vehicles),
    [vehicles]
  );

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
              MotoTwin | Личный гараж
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Мой гараж
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
              Все мотоциклы, обслуживание и покупки в одном месте.
            </p>
            <p className="mt-2 text-sm text-gray-500">Профиль: Гость</p>
            <p className="mt-1 text-xs text-gray-400">Авторизация пока не реализована</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href="/trash"
              className="rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-white"
              style={{ borderColor: productSemanticColors.borderStrong }}
            >
              Свалка ({trashCount})
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-lg shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow"
              style={{
                borderColor: productSemanticColors.borderStrong,
                backgroundColor: productSemanticColors.card,
                color: productSemanticColors.textPrimary,
              }}
              aria-label="Открыть профиль"
              title="Профиль"
            >
              <ProfileIcon />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: productSemanticColors.primaryAction }}
            >
              Добавить мотоцикл
            </Link>
          </div>
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

        {!isLoading && !error && vehicles.length > 0 ? (
          <section
            className="mb-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-3"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: productSemanticColors.card,
            }}
          >
            <InfoCard
              label="Мотоциклы"
              value={String(dashboardSummary.motorcyclesCount)}
            />
            <InfoCard
              label="Требуют внимания"
              value={String(dashboardSummary.motorcyclesWithAttentionCount)}
            />
            <InfoCard
              label="Активные сигналы внимания"
              value={String(dashboardSummary.attentionItemsTotalCount)}
            />
          </section>
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
              Личный гараж пока пуст
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              Добавьте первый мотоцикл, чтобы начать вести обслуживание.
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

                    <div className="mt-3 flex min-w-0 flex-nowrap items-center gap-2">
                      <h2 className="min-w-0 flex-1 text-3xl font-semibold leading-tight tracking-tight text-gray-950">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="block truncate transition hover:text-gray-700 hover:underline"
                        >
                          {card.summary.title}
                        </Link>
                      </h2>
                      {card.attentionIndicator.isVisible ? (
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-semibold tabular-nums leading-none transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/35 focus-visible:ring-offset-1"
                          style={{
                            borderColor: statusSemanticTokens[card.attentionIndicator.semanticKey].border,
                            backgroundColor:
                              statusSemanticTokens[card.attentionIndicator.semanticKey].background,
                            color: statusSemanticTokens[card.attentionIndicator.semanticKey].foreground,
                          }}
                          title="Требует внимания — открыть мотоцикл"
                          aria-label={`Требует внимания, ${card.attentionIndicator.totalCount}: открыть карточку мотоцикла`}
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90"
                            aria-hidden
                          />
                          {card.attentionIndicator.totalCount}
                        </Link>
                      ) : null}
                    </div>

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
                    <button
                      type="button"
                      onClick={() => setIsUsageProfileExpanded((prev) => !prev)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg text-left"
                      aria-expanded={isUsageProfileExpanded}
                    >
                      <h3 className="text-base font-semibold text-gray-950">Профиль эксплуатации</h3>
                      <span className="text-sm text-gray-500" aria-hidden>
                        {isUsageProfileExpanded ? "▾" : "▸"}
                      </span>
                    </button>

                    {isUsageProfileExpanded ? (
                      card.rideProfile ? (
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
                      )
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => setIsTechnicalSummaryExpanded((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg text-left"
                    aria-expanded={isTechnicalSummaryExpanded}
                  >
                    <h3 className="text-base font-semibold text-gray-950">Техническая сводка</h3>
                    <span className="text-sm text-gray-500" aria-hidden>
                      {isTechnicalSummaryExpanded ? "▾" : "▸"}
                    </span>
                  </button>
                  {isTechnicalSummaryExpanded ? (
                    specHighlights.length > 0 ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {specHighlights.map((spec) => (
                          <SpecCard key={spec.label} label={spec.label} value={spec.value} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">Технические параметры пока не заполнены.</p>
                    )
                  ) : null}
                </div>
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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
