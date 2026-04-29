"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildTrashedVehicleViewModel } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { BackButton } from "@/components/navigation/BackButton";

const trashApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export default function TrashPage() {
  const router = useRouter();
  const [items, setItems] = useState<Array<ReturnType<typeof buildTrashedVehicleViewModel>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyVehicleId, setBusyVehicleId] = useState("");

  const loadTrash = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await trashApi.getTrashedVehicles();
      setItems((response.vehicles ?? []).map((item) => buildTrashedVehicleViewModel(item)));
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить Свалку.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const restoreVehicle = async (vehicleId: string) => {
    try {
      setBusyVehicleId(vehicleId);
      await trashApi.restoreVehicleFromTrash(vehicleId);
      setItems((prev) => prev.filter((item) => item.id !== vehicleId));
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось восстановить мотоцикл.");
    } finally {
      setBusyVehicleId("");
    }
  };

  const permanentlyDeleteVehicle = async (vehicleId: string) => {
    const confirmed = window.confirm(
      "Удалить мотоцикл окончательно?\n\nЭто действие нельзя отменить."
    );
    if (!confirmed) {
      return;
    }
    try {
      setBusyVehicleId(vehicleId);
      await trashApi.permanentlyDeleteVehicle(vehicleId);
      setItems((prev) => prev.filter((item) => item.id !== vehicleId));
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось удалить мотоцикл окончательно.");
    } finally {
      setBusyVehicleId("");
    }
  };

  const isEmpty = useMemo(() => !isLoading && !error && items.length === 0, [isLoading, error, items.length]);
  const navigateBackWithFallback = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/garage");
  };

  return (
    <main
      className="mt-internal-page min-h-screen px-6 py-16 text-gray-950"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Свалка</h1>
            <p className="mt-2 text-sm text-gray-600">
              Здесь хранятся удаленные мотоциклы перед окончательным удалением
            </p>
          </div>
          <BackButton onClick={navigateBackWithFallback} />
        </div>

        {isLoading ? <p className="text-sm text-gray-600">Загрузка Свалки...</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {isEmpty ? <p className="text-sm text-gray-600">На Свалке пусто</p> : null}

        <div className="space-y-3">
          {items.map((item) => (
            <section
              key={item.id}
              className="rounded-2xl border p-4"
              style={{ borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.card }}
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="text-sm text-gray-600">{item.subtitle}</p>
              <div className="mt-3 grid gap-1 text-xs text-gray-500">
                <p>Перемещен: {item.trashedAtLabel}</p>
                <p>
                  Хранение до: {item.expiresAtLabel}{" "}
                  {item.isExpired ? "(Срок хранения истек)" : item.daysRemaining != null ? `(${item.daysRemaining} дн.)` : ""}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => void restoreVehicle(item.id)}
                    disabled={busyVehicleId === item.id}
                    title="Восстановить"
                    aria-label="Восстановить"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700"
                  >
                    <RestoreIcon />
                  </button>
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    Восстановить
                  </span>
                </div>
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => void permanentlyDeleteVehicle(item.id)}
                    disabled={busyVehicleId === item.id}
                    title="Удалить окончательно"
                    aria-label="Удалить окончательно"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700"
                  >
                    <TrashIcon />
                  </button>
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    Удалить окончательно
                  </span>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Восстановить</title>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h9a7 7 0 1 1 0 14h-2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Удалить окончательно</title>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}
