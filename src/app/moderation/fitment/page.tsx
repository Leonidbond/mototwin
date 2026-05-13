"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Queue = {
  pendingMasters: Array<{ id: string; brandName: string; sku: string; title: string; status: string }>;
  pendingReports: Array<{ id: string; fitmentResult: string; partMaster: { brandName: string; sku: string } }>;
  safetyCriticalPending: Array<{ id: string; fitmentResult: string; partMaster: { brandName: string; sku: string } }>;
};

export default function ModerationFitmentPage() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/moderation/fitment");
    const json = (await res.json()) as Queue & { error?: string };
    if (!res.ok) {
      setError(json.error || "Нет доступа");
      return;
    }
    setQueue(json);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publishReport = async (id: string) => {
    const res = await fetch(`/api/fitment/reports/${encodeURIComponent(id)}/moderation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moderationStatus: "PUBLISHED" }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setError(j.error || "Ошибка публикации");
      return;
    }
    await load();
  };

  const activateMaster = async (id: string) => {
    const res = await fetch(`/api/moderation/part-masters/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setError(j.error || "Ошибка активации");
      return;
    }
    await load();
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/garage">← В гараж</Link>
      </p>
      <h1 style={{ fontSize: 22 }}>Модерация: fitment</h1>
      {error ? <p style={{ color: "#c53030" }}>{error}</p> : null}
      {!queue ? <p>Загрузка…</p> : null}
      {queue ? (
        <div style={{ display: "grid", gap: 28, marginTop: 16 }}>
          <section>
            <h2>Новые детали (PartMaster)</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {queue.pendingMasters.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span>
                    {m.brandName} {m.sku} — {m.title}
                  </span>
                  <button type="button" onClick={() => void activateMaster(m.id)}>
                    Активировать
                  </button>
                </li>
              ))}
              {queue.pendingMasters.length === 0 ? <li>Очередь пуста</li> : null}
            </ul>
          </section>
          <section>
            <h2>Отчёты (ожидают публикации)</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {queue.pendingReports.map((r) => (
                <li
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span>
                    {r.partMaster.brandName} {r.partMaster.sku} — {r.fitmentResult}
                  </span>
                  <button type="button" onClick={() => void publishReport(r.id)}>
                    Опубликовать
                  </button>
                </li>
              ))}
              {queue.pendingReports.length === 0 ? <li>Очередь пуста</li> : null}
            </ul>
          </section>
          <section>
            <h2>Safety-critical (ожидают)</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {queue.safetyCriticalPending.map((r) => (
                <li key={r.id} style={{ padding: "6px 0" }}>
                  {r.partMaster.brandName} {r.partMaster.sku} — {r.fitmentResult}{" "}
                  <button type="button" onClick={() => void publishReport(r.id)}>
                    Опубликовать
                  </button>
                </li>
              ))}
              {queue.safetyCriticalPending.length === 0 ? <li>Нет отдельной очереди</li> : null}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
