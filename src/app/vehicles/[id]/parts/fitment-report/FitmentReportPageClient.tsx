"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { InternalPageChrome } from "@/components/navigation/InternalPageChrome";
import { productSemanticColors } from "@mototwin/design-tokens";
import { formatFitmentConfidenceStatusRu } from "@mototwin/domain";
import type { FitmentConfidenceStatus } from "@mototwin/types";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #2D3748",
  backgroundColor: "#0d1118",
  color: "#e2e8f0",
  fontSize: 14,
  boxSizing: "border-box",
};

const sectionBox: CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #2D3748",
  backgroundColor: "#0d1118",
  maxWidth: 720,
};

function fitmentResultRu(result: string): string {
  switch (result) {
    case "DIRECT_FIT":
      return "Прямая посадка";
    case "FIT_WITH_MODIFICATION":
      return "С доработкой";
    case "PARTIAL_FIT":
      return "Частично / не уверен";
    case "DOES_NOT_FIT":
      return "Не подошло";
    case "OEM_REPLACEMENT":
      return "OEM-эквивалент";
    default:
      return result;
  }
}

function installationStatusRu(s: string): string {
  switch (s) {
    case "INSTALLED":
      return "Установлено";
    case "PURCHASED_NOT_INSTALLED":
      return "Куплено, не установлено";
    case "TESTED_NOT_INSTALLED":
      return "Пробовал без установки";
    default:
      return s;
  }
}

type SheetConfidence = {
  confidenceScore: number;
  reportCount: number;
  confirmationCount: number;
  rejectionCount: number;
  modificationCount: number;
  status: FitmentConfidenceStatus;
  isStaffVerified: boolean;
};

type SheetReport = {
  id: string;
  fitmentResult: string;
  installationStatus: string;
  modificationRequired: boolean;
  modificationDetails: string | null;
  comment: string | null;
  updatedAt: string;
  votes: Array<{ voteType: string }>;
};

type SheetPayload = {
  partMaster: { id: string; brandName: string; title: string; sku: string } | null;
  node: { id: string; code: string; name: string } | null;
  catalogLineRu: string | null;
  confidence: SheetConfidence | null;
  reports: SheetReport[];
};

function voteSummaryRu(votes: Array<{ voteType: string }>): string {
  let confirm = 0;
  let reject = 0;
  let other = 0;
  for (const v of votes) {
    if (v.voteType === "CONFIRM" || v.voteType === "SAME_EXPERIENCE") confirm += 1;
    else if (v.voteType === "REJECT" || v.voteType === "DIFFERENT_EXPERIENCE") reject += 1;
    else other += 1;
  }
  const parts: string[] = [];
  if (confirm) parts.push(`подтверждений: ${confirm}`);
  if (reject) parts.push(`опровержений: ${reject}`);
  if (other) parts.push(`прочих голосов: ${other}`);
  return parts.length ? parts.join(" · ") : "голосов пока нет";
}

export function FitmentReportPageClient(props: {
  vehicleId: string;
  partMasterId: string;
  nodeId: string;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetPayload | null>(null);
  const [sheetError, setSheetError] = useState("");
  const [sheetLoading, setSheetLoading] = useState(true);

  const [fitmentResult, setFitmentResult] = useState("DIRECT_FIT");
  const [installationStatus, setInstallationStatus] = useState("INSTALLED");
  const [modificationRequired, setModificationRequired] = useState(false);
  const [modificationDetails, setModificationDetails] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const backToPicker = useCallback(() => {
    const q = new URLSearchParams({ nodeId: props.nodeId });
    router.push(`/vehicles/${encodeURIComponent(props.vehicleId)}/parts/picker?${q.toString()}`);
  }, [props.nodeId, props.vehicleId, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSheetLoading(true);
      setSheetError("");
      try {
        const u = new URL(
          `/api/vehicles/${encodeURIComponent(props.vehicleId)}/fitment-report-sheet`,
          typeof window !== "undefined" ? window.location.origin : "http://local"
        );
        u.searchParams.set("partMasterId", props.partMasterId);
        u.searchParams.set("nodeId", props.nodeId);
        const res = await fetch(u.toString(), { method: "GET" });
        const json = (await res.json()) as SheetPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setSheetError(json.error || "Не удалось загрузить сводку.");
          if (!cancelled) setSheet(null);
          return;
        }
        if (!cancelled) {
          setSheet({
            partMaster: json.partMaster ?? null,
            node: json.node ?? null,
            catalogLineRu: json.catalogLineRu ?? null,
            confidence: json.confidence ?? null,
            reports: Array.isArray(json.reports) ? json.reports : [],
          });
        }
      } catch {
        if (!cancelled) {
          setSheetError("Сеть недоступна");
          setSheet(null);
        }
      } finally {
        if (!cancelled) setSheetLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.nodeId, props.partMasterId, props.vehicleId]);

  const onSubmit = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(props.vehicleId)}/fitment-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partMasterId: props.partMasterId,
          nodeId: props.nodeId,
          fitmentResult,
          installationStatus,
          modificationRequired,
          modificationDetails: modificationRequired ? modificationDetails.trim() || null : null,
          comment: comment.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить отчёт");
        return;
      }
      setDone(true);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [
    props.vehicleId,
    props.partMasterId,
    props.nodeId,
    fitmentResult,
    installationStatus,
    modificationRequired,
    modificationDetails,
    comment,
  ]);

  const partTitle =
    sheet?.partMaster != null
      ? `${sheet.partMaster.brandName} · ${sheet.partMaster.title}`.trim()
      : "Отчёт о совместимости";
  const nodeLine = sheet?.node ? `${sheet.node.name} (${sheet.node.code})` : props.nodeId;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070B10", padding: "20px 24px 40px" }}>
      <InternalPageChrome
        variant="garageDark"
        onBack={backToPicker}
        backLabel="К подбору"
        breadcrumbs={[{ label: "Совместимость" }, { label: partTitle }]}
        title={partTitle}
      />

      {sheetLoading ? (
        <p style={{ color: "#a0aec0", marginTop: 16 }}>Загружаем сводку…</p>
      ) : sheetError ? (
        <p style={{ color: productSemanticColors.error, marginTop: 16 }}>{sheetError}</p>
      ) : null}

      {!sheetLoading && sheet && !sheetError ? (
        <>
          <p style={{ color: "#a0aec0", marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>
            Узел: <span style={{ color: "#e2e8f0" }}>{nodeLine}</span>
          </p>

          <section style={sectionBox}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#e2e8f0" }}>Каталог и применимость</h2>
            {sheet.catalogLineRu ? (
              <p style={{ margin: 0, color: "#cbd5e0", fontSize: 14, lineHeight: 1.5 }}>{sheet.catalogLineRu}</p>
            ) : (
              <p style={{ margin: 0, color: "#718096", fontSize: 13 }}>
                Явных строк каталога по вашей модификации не найдено — ориентируйтесь на артикул и спецификацию.
              </p>
            )}
          </section>

          <section style={sectionBox}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#e2e8f0" }}>MotoTwin и сообщество</h2>
            {sheet.confidence ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: 0, color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>
                  {formatFitmentConfidenceStatusRu(sheet.confidence.status)}
                </p>
                <p style={{ margin: 0, color: "#a0aec0", fontSize: 13, lineHeight: 1.5 }}>
                  Индекс уверенности: {sheet.confidence.confidenceScore}/100 · опубликованных отчётов в расчёте:{" "}
                  {sheet.confidence.reportCount}
                  <br />
                  Подтверждений: {sheet.confidence.confirmationCount} · опровержений: {sheet.confidence.rejectionCount}{" "}
                  · с доработкой: {sheet.confidence.modificationCount}
                </p>
                {sheet.confidence.isStaffVerified ? (
                  <p style={{ margin: 0, color: "#9ae6b4", fontSize: 13 }}>
                    Статус учитывает проверку MotoTwin (staff-verified): агрегат не понижается автоматически.
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "#718096", fontSize: 12 }}>
                    Публикация отчётов и голосов проходит модерацию; агрегат пересчитывается при новых данных.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#718096", fontSize: 13 }}>
                Для этой комбинации детали и узла ещё нет агрегата сообщества — ваш отчёт поможет следующим
                владельцам.
              </p>
            )}
          </section>

          <section style={sectionBox}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, color: "#e2e8f0" }}>Опубликованные отчёты по модели</h2>
            {sheet.reports.length === 0 ? (
              <p style={{ margin: 0, color: "#718096", fontSize: 13 }}>Пока нет опубликованных отчётов.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e0", fontSize: 13, lineHeight: 1.45 }}>
                {sheet.reports.map((r) => (
                  <li key={r.id} style={{ marginBottom: 10 }}>
                    <strong style={{ color: "#e2e8f0" }}>{fitmentResultRu(r.fitmentResult)}</strong>
                    {" · "}
                    {installationStatusRu(r.installationStatus)}
                    {r.modificationRequired && r.modificationDetails ? (
                      <span>
                        {" "}
                        — доработка: {r.modificationDetails}
                      </span>
                    ) : null}
                    {r.comment ? (
                      <span>
                        {" "}
                        — {r.comment}
                      </span>
                    ) : null}
                    <div style={{ marginTop: 4, fontSize: 12, color: "#718096" }}>
                      Обновлено {new Date(r.updatedAt).toLocaleString("ru-RU")} · {voteSummaryRu(r.votes)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <section style={{ ...sectionBox, marginTop: 28 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 15, color: "#e2e8f0" }}>Ваш отчёт</h2>
        {done ? (
          <p style={{ color: "#9ae6b4", margin: 0 }}>Отчёт сохранён и ожидает публикации модератором.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
            <label style={{ color: "#e2e8f0", fontSize: 13 }}>
              Результат
              <select
                style={{ ...inputStyle, marginTop: 6 }}
                value={fitmentResult}
                onChange={(e) => setFitmentResult(e.target.value)}
              >
                <option value="DIRECT_FIT">Прямая посадка</option>
                <option value="FIT_WITH_MODIFICATION">С доработкой</option>
                <option value="PARTIAL_FIT">Частично / не уверен</option>
                <option value="DOES_NOT_FIT">Не подошло</option>
                <option value="OEM_REPLACEMENT">OEM-эквивалент</option>
              </select>
            </label>
            <label style={{ color: "#e2e8f0", fontSize: 13 }}>
              Статус установки
              <select
                style={{ ...inputStyle, marginTop: 6 }}
                value={installationStatus}
                onChange={(e) => setInstallationStatus(e.target.value)}
              >
                <option value="INSTALLED">Установлено</option>
                <option value="PURCHASED_NOT_INSTALLED">Куплено, не установлено</option>
                <option value="TESTED_NOT_INSTALLED">Пробовал без установки</option>
              </select>
            </label>
            <label style={{ color: "#e2e8f0", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={modificationRequired}
                onChange={(e) => setModificationRequired(e.target.checked)}
              />
              Нужна доработка
            </label>
            {modificationRequired ? (
              <textarea
                style={{ ...inputStyle, minHeight: 72 }}
                placeholder="Опишите доработку"
                value={modificationDetails}
                onChange={(e) => setModificationDetails(e.target.value)}
              />
            ) : null}
            <textarea
              style={{ ...inputStyle, minHeight: 72 }}
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error ? (
              <p style={{ color: productSemanticColors.error, margin: 0, fontSize: 13 }}>{error}</p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSubmit()}
              style={{
                marginTop: 8,
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                backgroundColor: "#3182ce",
                color: "#fff",
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Отправить отчёт
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
