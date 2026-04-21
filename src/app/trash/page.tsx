"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildTrashedVehicleViewModel } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";

const trashApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

export default function TrashPage() {
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

  return (
    <main
      className="min-h-screen px-6 py-16 text-gray-950"
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
          <Link
            href="/garage"
            className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white"
            style={{ borderColor: productSemanticColors.borderStrong }}
          >
            Вернуться в гараж
          </Link>
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
                <button
                  type="button"
                  onClick={() => void restoreVehicle(item.id)}
                  disabled={busyVehicleId === item.id}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                >
                  Восстановить
                </button>
                <button
                  type="button"
                  onClick={() => void permanentlyDeleteVehicle(item.id)}
                  disabled={busyVehicleId === item.id}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                >
                  Удалить окончательно
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
