"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InternalPageChrome } from "@/components/navigation/InternalPageChrome";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  FitmentReportResultWire,
  PartCompatibilityRideProfileInsightWire,
  PartCompatibilityReportWire,
} from "@mototwin/types";
import {
  buildRideProfileViewModel,
  COMPATIBILITY_CONFIDENCE_TOOLTIP_LINES_RU,
  deriveDominantFitmentResult,
  fitmentReportResultHeadlineRu,
  formatFitmentConfidenceStatusRu,
  isSafetyCriticalNodeContext,
} from "@mototwin/domain";
import {
  evidenceTypeShortRu,
  installationStatusLabelRu,
  isBrakesSafetyContext,
  ownerCountLabelRu,
  sourcePriorityVariantLabelRu,
  trustBadgeShortRu,
  verdictSupportParagraphsRu,
} from "./_components/part-compatibility-report-helpers";

const BG = "#0B0F14";
const PANEL = "#12161C";
const BORDER = "#2D3748";
const TEXT = "#E2E8F0";
const MUTED = "#94A3B8";
const GREEN = "#22C55E";
const AMBER = "#EAB308";
const RED = "#EF4444";
const BLUE = "#3B82F6";

const RESULT_ORDER: FitmentReportResultWire[] = [
  "DIRECT_FIT",
  "FIT_WITH_MODIFICATION",
  "PARTIAL_FIT",
  "DOES_NOT_FIT",
  "OEM_REPLACEMENT",
];

const BAR_COLORS: Record<FitmentReportResultWire, string> = {
  DIRECT_FIT: GREEN,
  FIT_WITH_MODIFICATION: AMBER,
  PARTIAL_FIT: "#F97316",
  DOES_NOT_FIT: RED,
  OEM_REPLACEMENT: BLUE,
};

function voteTypeLabelRu(t: string): string {
  switch (t) {
    case "CONFIRM":
      return "Подтвердить";
    case "REJECT":
      return "Опровергнуть";
    case "SAME_EXPERIENCE":
      return "Такой же опыт";
    case "DIFFERENT_EXPERIENCE":
      return "Другой опыт";
    case "HELPFUL":
      return "Полезно";
    default:
      return t;
  }
}

function voteSummaryLine(votes: Array<{ voteType: string }>): string {
  let c = 0;
  let r = 0;
  let o = 0;
  for (const v of votes) {
    if (v.voteType === "CONFIRM" || v.voteType === "SAME_EXPERIENCE") c += 1;
    else if (v.voteType === "REJECT" || v.voteType === "DIFFERENT_EXPERIENCE") r += 1;
    else o += 1;
  }
  const p: string[] = [];
  if (c) p.push(`+${c}`);
  if (r) p.push(`−${r}`);
  if (o) p.push(`проч. ${o}`);
  return p.length ? p.join(" · ") : "нет голосов";
}

function voteHelpfulScore(votes: Array<{ voteType: string }>): number {
  let s = 0;
  for (const v of votes) {
    if (v.voteType === "HELPFUL" || v.voteType === "CONFIRM" || v.voteType === "SAME_EXPERIENCE") s += 1;
  }
  return s;
}

/** Короткая строка для hero / aside (§19). */
function rideProfileInsightShortRu(ins: PartCompatibilityRideProfileInsightWire): string {
  const parts = ins.topTags.slice(0, 2).map((t) => `${t.labelRu} (${t.percent}%)`);
  return parts.join(" · ");
}

export function PartCompatibilityReportPageClient(props: {
  vehicleId: string;
  partMasterId: string;
  nodeId: string;
}) {
  const router = useRouter();
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed("fitment-report.sidebar.collapsed");
  const [data, setData] = useState<PartCompatibilityReportWire | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [reportFilter, setReportFilter] = useState<"ALL" | FitmentReportResultWire>("ALL");
  const [mediaExtra, setMediaExtra] = useState<"all" | "photo" | "service">("all");
  const [sortKey, setSortKey] = useState<"new" | "helpful" | "negative_first">("new");
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const u = new URL(
          `/api/vehicles/${encodeURIComponent(props.vehicleId)}/part-compatibility-report`,
          typeof window !== "undefined" ? window.location.origin : "http://local"
        );
        u.searchParams.set("partMasterId", props.partMasterId);
        u.searchParams.set("nodeId", props.nodeId);
        const res = await fetch(u.toString());
        const json = (await res.json()) as PartCompatibilityReportWire & { error?: string };
        if (!res.ok) {
          if (!cancelled) setLoadError(json.error || "Не удалось загрузить отчёт.");
          if (!cancelled) setData(null);
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setLoadError("Сеть недоступна");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.nodeId, props.partMasterId, props.vehicleId]);

  const backToPicker = useCallback(() => {
    const q = new URLSearchParams({ nodeId: props.nodeId });
    router.push(`/vehicles/${encodeURIComponent(props.vehicleId)}/parts/picker?${q.toString()}`);
  }, [props.nodeId, props.vehicleId, router]);

  const sharePage = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: document.title, url }).catch(() => {
        void navigator.clipboard?.writeText(url);
      });
    } else {
      void navigator.clipboard?.writeText(url);
    }
  }, []);

  const reportProblem = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    void navigator.clipboard?.writeText(url);
    window.alert("Ссылка на страницу скопирована. Отправьте её вместе с описанием проблемы в поддержку MotoTwin.");
  }, []);

  const communityHref = useMemo(() => {
    const q = new URLSearchParams({
      nodeId: props.nodeId,
      partMasterId: props.partMasterId,
    });
    return `/vehicles/${encodeURIComponent(props.vehicleId)}/parts/community?${q.toString()}`;
  }, [props.nodeId, props.partMasterId, props.vehicleId]);

  const returnToForServiceLog = useMemo(() => {
    const path = `/vehicles/${props.vehicleId}/parts/fitment-report`;
    const q = new URLSearchParams({ partMasterId: props.partMasterId, nodeId: props.nodeId });
    return encodeURIComponent(`${path}?${q.toString()}`);
  }, [props.nodeId, props.partMasterId, props.vehicleId]);

  const pickerHref = useMemo(() => {
    const q = new URLSearchParams({ nodeId: props.nodeId });
    return `/vehicles/${encodeURIComponent(props.vehicleId)}/parts/picker?${q.toString()}`;
  }, [props.nodeId, props.vehicleId]);

  const processedReports = useMemo(() => {
    if (!data) return [];
    let list =
      reportFilter === "ALL" ? data.reports : data.reports.filter((r) => r.fitmentResult === reportFilter);
    if (mediaExtra === "photo") list = list.filter((r) => r.evidence.length > 0);
    if (mediaExtra === "service") list = list.filter((r) => r.serviceEventId);
    const sorted = [...list];
    if (sortKey === "new") {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortKey === "helpful") {
      sorted.sort((a, b) => voteHelpfulScore(b.votes) - voteHelpfulScore(a.votes));
    } else if (sortKey === "negative_first") {
      sorted.sort((a, b) => {
        const neg = (x: typeof a) => (x.fitmentResult === "DOES_NOT_FIT" ? 1 : 0);
        return neg(b) - neg(a) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }
    return sorted;
  }, [data, mediaExtra, reportFilter, sortKey]);

  const modificationInsights = useMemo(() => {
    if (!data) return null;
    const mod = data.reports.filter((r) => r.fitmentResult === "FIT_WITH_MODIFICATION");
    if (mod.length === 0) return null;
    const map = new Map<string, number>();
    for (const r of mod) {
      const raw = r.modificationDetails?.trim() || r.comment?.trim() || "Без описания доработки";
      const key = raw.length > 90 ? `${raw.slice(0, 87)}…` : raw;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const totalMod = mod.length;
    const totalAll = data.breakdown.totalReports || 1;
    const rare = totalMod / totalAll < 0.15 || totalMod <= 2;
    return { rows: rows.slice(0, 8), rare };
  }, [data]);

  const negativeSnippets = useMemo(() => {
    if (!data || data.breakdown.doesNotFitCount === 0) return [];
    const neg = data.reports.filter((r) => r.fitmentResult === "DOES_NOT_FIT");
    const map = new Map<string, number>();
    for (const r of neg) {
      const raw = r.comment?.trim() || r.modificationDetails?.trim() || "Без пояснения в отчёте";
      const key = raw.length > 70 ? `${raw.slice(0, 67)}…` : raw;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [data]);

  const evidenceGallery = useMemo(() => {
    if (!data) return [];
    const out: Array<{
      id: string;
      type: string;
      fileUrl: string;
      reportId: string;
      result: FitmentReportResultWire;
    }> = [];
    for (const r of data.reports) {
      for (const e of r.evidence) {
        out.push({ ...e, reportId: r.id, result: r.fitmentResult });
      }
    }
    return out;
  }, [data]);

  const evidenceTypesDistinct = useMemo(() => {
    const s = new Set(evidenceGallery.map((e) => e.type));
    return ["ALL", ...[...s].sort()];
  }, [evidenceGallery]);

  const filteredEvidenceGallery = useMemo(() => {
    if (evidenceTypeFilter === "ALL") return evidenceGallery;
    return evidenceGallery.filter((e) => e.type === evidenceTypeFilter);
  }, [evidenceGallery, evidenceTypeFilter]);

  const safety = data
    ? isSafetyCriticalNodeContext({ serviceGroup: data.node.serviceGroup, nodeCode: data.node.code })
    : false;
  const brakesExtra = data
    ? isBrakesSafetyContext(data.node.code, data.node.serviceGroup)
    : false;

  const partTitle =
    data != null ? `${data.partMaster.brandName} · ${data.partMaster.title}`.trim() : "Совместимость детали";

  const verdictTitle =
    data?.confidence != null
      ? formatFitmentConfidenceStatusRu(data.confidence.status)
      : data?.sourcePriority.titleRu ?? "Совместимость";

  const verdictTierLine =
    data?.confidence != null ? data.confidence.tierLabelRu : data && data.breakdown.totalReports === 0
      ? "Нет отчётов владельцев"
      : "Оценка по отчётам владельцев";

  const dominant = data ? deriveDominantFitmentResult(data.breakdown) : null;

  const headerActions = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={sharePage}
        style={headerGhostBtn}
      >
        Поделиться
      </button>
      <button type="button" onClick={reportProblem} style={headerGhostBtn}>
        Сообщить о проблеме
      </button>
    </div>
  );

  const withShell = (content: ReactNode) => (
    <main className="min-h-screen" style={{ backgroundColor: BG }}>
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 220}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
        }}
      >
        <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <section style={{ minWidth: 0 }}>{content}</section>
      </div>
    </main>
  );

  if (loading) {
    return withShell(
      <div style={{ minHeight: "100vh", backgroundColor: BG, padding: 24 }}>
        <InternalPageChrome
          variant="garageDark"
          onBack={backToPicker}
          backLabel="К подбору"
          breadcrumbs={[{ label: "Совместимость" }]}
          title="Загрузка…"
        />
        <div style={{ marginTop: 24, display: "grid", gap: 12, maxWidth: 960 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 72,
                borderRadius: 12,
                background: PANEL,
                border: `1px solid ${BORDER}`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return withShell(
      <div style={{ minHeight: "100vh", backgroundColor: BG, padding: 24 }}>
        <InternalPageChrome
          variant="garageDark"
          onBack={backToPicker}
          backLabel="К подбору"
          breadcrumbs={[{ label: "Совместимость" }]}
          title="Ошибка"
        />
        <p style={{ color: productSemanticColors.error, marginTop: 16 }}>{loadError || "Нет данных."}</p>
      </div>
    );
  }

  const bd = data.breakdown;
  const segments = RESULT_ORDER.filter((k) => countFor(bd, k) > 0).map((k) => ({
    key: k,
    pct: pctFor(bd, k),
    color: BAR_COLORS[k],
    count: countFor(bd, k),
  }));

  const verdictParagraphs = verdictSupportParagraphsRu(data);
  const variantLine = [
    String(data.vehicle.variantYear),
    data.vehicle.variantName,
    data.vehicle.market,
  ]
    .filter(Boolean)
    .join(" · ");

  const mainGrid: CSSProperties = narrow
    ? { display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }
    : {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 300px",
        gap: 24,
        alignItems: "start",
        marginTop: 20,
      };

  const heroGrid: CSSProperties = narrow
    ? { display: "flex", flexDirection: "column", gap: 16 }
    : {
        display: "grid",
        gridTemplateColumns: "160px minmax(0, 1fr) minmax(220px, 280px)",
        gap: 20,
        alignItems: "start",
      };

  return withShell(
    <div style={{ minHeight: "100vh", backgroundColor: BG, padding: "16px 20px 96px", boxSizing: "border-box" }}>
      <InternalPageChrome
        variant="garageDark"
        onBack={backToPicker}
        backLabel="К подбору"
        navRowEnd={headerActions}
        breadcrumbs={[
          { label: "Гараж", href: "/garage" },
          { label: `${data.vehicle.brandName} ${data.vehicle.modelName}`.trim(), href: `/vehicles/${encodeURIComponent(props.vehicleId)}` },
          { label: "Подбор", href: pickerHref },
          { label: data.node.name, href: pickerHref },
          { label: data.partMaster.sku },
        ]}
        title={partTitle}
      />

      <div style={mainGrid}>
        <div style={{ minWidth: 0 }}>
          {/* §9 Hero */}
          <section style={sectionCard}>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: 0.6 }}>ДЕТАЛЬ И КОНТЕКСТ</div>
            <div style={{ ...heroGrid, marginTop: 14 }}>
              <div>
                <div
                  style={{
                    width: narrow ? 120 : 140,
                    height: narrow ? 120 : 140,
                    borderRadius: 12,
                    border: `1px dashed ${BORDER}`,
                    background: "#0f141a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: MUTED,
                    fontSize: 11,
                    textAlign: "center",
                    padding: 8,
                  }}
                >
                  Нет фото
                </div>
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: TEXT }}>{data.partMaster.brandName}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: TEXT, marginTop: 4 }}>{data.partMaster.sku}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 1.35 }}>{data.partMaster.title}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Категория: не указана в каталоге</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 800 }}>МОТОЦИКЛ И УЗЕЛ</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, color: TEXT }}>
                  {data.vehicle.brandName} {data.vehicle.modelName}
                </div>
                <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{variantLine}</div>
                {data.vehicle.nickname ? (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{data.vehicle.nickname}</div>
                ) : null}
                <div style={{ marginTop: 14, fontSize: 13, color: TEXT }}>
                  <span style={{ color: MUTED }}>Узел: </span>
                  {data.node.name}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Код узла: {data.node.code}</div>
                <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>
                  Конфигурация по каталогу:{" "}
                  {data.structured.catalogLineRu?.trim() || "нет явной строки применимости к этой модификации"}
                </div>
              </div>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  background: "#0f141a",
                }}
              >
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 800 }}>КРАТКО В HERO</div>
                <div style={{ marginTop: 8, fontSize: 16, fontWeight: 900, color: TEXT }}>{verdictTitle}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: GREEN, fontWeight: 700 }}>{verdictTierLine}</div>
                <div style={{ marginTop: 10, fontSize: 13, color: MUTED }}>
                  {data.serviceStatistics.totalReportEntries} записей ·{" "}
                  {ownerCountLabelRu(data.serviceStatistics.uniqueAuthorCount)}
                  {data.serviceStatistics.repeatReportCount > 0
                    ? ` · повторных записей: ${data.serviceStatistics.repeatReportCount}`
                    : ""}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, letterSpacing: 0.4 }}>ПРОФИЛЬ ЕЗДЫ</div>
                  {data.rideProfileInsight ? (
                    <>
                      <div style={{ marginTop: 6, fontSize: 12, color: TEXT, lineHeight: 1.45, fontWeight: 600 }}>
                        {rideProfileInsightShortRu(data.rideProfileInsight)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: MUTED, lineHeight: 1.35 }}>
                        Положительные отчёты с указанным профилем: {data.rideProfileInsight.sampleSize}. Подробнее в
                        разделе ниже.
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: 6, fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
                      Сводка по рекомендуемым профилям недоступна: нужно не меньше трёх положительных отчётов с
                      заполненным профилем езды.
                    </div>
                  )}
                </div>
                <Link href={communityHref} style={{ ...primaryLinkBtn, marginTop: 14, fontSize: 13, padding: "10px 12px" }}>
                  Добавить свой опыт
                </Link>
              </div>
            </div>
          </section>

          {/* §10 Verdict */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Итог по совместимости</h2>
            <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900, color: TEXT }}>{verdictTitle}</div>
            {verdictParagraphs.map((p) => (
              <p key={p} style={{ margin: "10px 0 0", fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
                {p}
              </p>
            ))}
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${data.rideProfileInsight ? "rgba(59,130,246,0.35)" : BORDER}`,
                background: data.rideProfileInsight ? "rgba(59,130,246,0.07)" : "#0f141a",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TEXT }}>Саммари по рекомендуемым профилям езды</h3>
              {data.rideProfileInsight ? (
                <>
                  <p style={{ margin: "8px 0 0", fontSize: 14, color: TEXT, lineHeight: 1.55 }}>
                    {data.rideProfileInsight.headlineRu}
                  </p>
                  <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                    {data.rideProfileInsight.topTags.map((t) => (
                      <li
                        key={t.labelRu}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          fontSize: 13,
                          color: MUTED,
                        }}
                      >
                        <span style={{ color: TEXT }}>{t.labelRu}</span>
                        <span style={{ flexShrink: 0 }}>
                          {t.count} отч. · {t.percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: MUTED, lineHeight: 1.45 }}>
                    Учитываются только положительные исходы установки с известным профилем езды (§19). Полный разбор —
                    в отдельном разделе страницы.
                  </p>
                </>
              ) : (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                  Пока нельзя вывести рекомендуемый профиль езды: в выборке меньше трёх подходящих отчётов с указанным
                  профилем. При добавлении опыта укажите профиль в форме — так сводка появится быстрее.
                </p>
              )}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: MUTED }}>
              <div>
                <strong style={{ color: TEXT }}>Уверенность: </strong>
                <span title={COMPATIBILITY_CONFIDENCE_TOOLTIP_LINES_RU.join("\n")}>{verdictTierLine}</span>
              </div>
              <div>
                <strong style={{ color: TEXT }}>Источник: </strong>
                {data.sourcePriority.titleRu}
              </div>
              {data.sourcePriority.kind === "conflict" ? (
                <div style={{ color: "#BFDBFE" }}>
                  Возможная причина расхождений: различия по году, рынку или комплектации — сверяйте с сервисной
                  документацией.
                </div>
              ) : null}
            </div>
            {data.confidence ? (
              <p
                style={{ margin: "12px 0 0", fontSize: 11, color: MUTED, opacity: 0.85 }}
                title={COMPATIBILITY_CONFIDENCE_TOOLTIP_LINES_RU.join("\n")}
              >
                Технический индекс (не главный для решения): {data.confidence.confidenceScore}/100 · в агрегате
                уверенности: {data.confidence.reportCount} отчёт(ов)
              </p>
            ) : null}
          </section>

          {/* §12 Small sample */}
          {data.smallSample ? (
            <section
              style={{
                ...sectionCard,
                marginTop: 16,
                borderColor: AMBER,
                background: "rgba(234,179,8,0.08)",
              }}
            >
              <h2 style={{ ...h2, color: "#FDE68A" }}>Данных пока мало</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#FEF3C7", lineHeight: 1.5 }}>
                Отчётов недостаточно для уверенного вывода.
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#FDE68A", lineHeight: 1.5 }}>
                Добавьте свой опыт, если вы уже устанавливали эту деталь. Не используем формулировки вроде «деталь точно
                подходит».
              </p>
            </section>
          ) : null}

          {/* §11 Breakdown */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Распределение отчётов владельцев</h2>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.45 }}>
              По оси распределения — каждая <strong style={{ color: TEXT }}>запись</strong> в журнале (обновление опыта
              тоже считается). Уникальных владельцев: <strong style={{ color: TEXT }}>{data.serviceStatistics.uniqueAuthorCount}</strong>
              {data.serviceStatistics.repeatReportCount > 0 ? (
                <>
                  ; повторных записей от тех же владельцев (повторная установка / апдейт отчёта):{" "}
                  <strong style={{ color: TEXT }}>{data.serviceStatistics.repeatReportCount}</strong> (
                  {data.serviceStatistics.authorsWithMultipleEntriesCount}{" "}
                  {data.serviceStatistics.authorsWithMultipleEntriesCount === 1 ? "владелец" : "владельцев"} с
                  несколькими записями)
                </>
              ) : null}
              .
            </p>
            {bd.totalReports === 0 ? (
              <p style={{ color: MUTED, fontSize: 14, margin: "12px 0 0" }}>
                Пользовательских отчётов по этой модификации и узлу пока нет.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    height: 16,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#1e293b",
                    marginTop: 12,
                    opacity: data.smallSample ? 0.75 : 1,
                  }}
                >
                  {segments.map((s) => (
                    <div
                      key={s.key}
                      title={`${fitmentReportResultHeadlineRu(s.key)}: ${s.count} (${s.pct}%)`}
                      style={{ width: `${s.pct}%`, backgroundColor: s.color, minWidth: s.count ? 4 : 0 }}
                    />
                  ))}
                </div>
                <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                  {RESULT_ORDER.map((k) => {
                    const n = countFor(bd, k);
                    if (n === 0) return null;
                    return (
                      <li
                        key={k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 13,
                          color: TEXT,
                        }}
                      >
                        <span style={{ color: BAR_COLORS[k], fontWeight: 700 }}>●</span>
                        <span style={{ flex: 1 }}>{fitmentReportResultHeadlineRu(k)}</span>
                        <span style={{ color: MUTED, textAlign: "right" as const }}>
                          {ownerCountLabelRu(n)} · {pctFor(bd, k)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(5, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {RESULT_ORDER.map((k) => {
                    const n = countFor(bd, k);
                    if (n === 0) return null;
                    return (
                      <div
                        key={`card-${k}`}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1px solid ${BORDER}`,
                          background: "#0f141a",
                          minHeight: 72,
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 800, color: BAR_COLORS[k] }}>
                          {fitmentReportResultHeadlineRu(k)}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: TEXT, marginTop: 6 }}>{n}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{pctFor(bd, k)}%</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* §13 Confidence — детально */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Уровень уверенности</h2>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: TEXT, fontWeight: 700 }}>{verdictTierLine}</p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.45 }}>
              Не выносим сырой балл как главный ответ — см. список факторов ниже (спека §13).
            </p>
            <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>
              <div style={{ fontWeight: 700, color: TEXT, marginBottom: 6 }}>Учитываются:</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                {COMPATIBILITY_CONFIDENCE_TOOLTIP_LINES_RU.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* §14 Source */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Источник совместимости</h2>
            <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 800, color: BLUE }}>
              {sourcePriorityVariantLabelRu(data.sourcePriority.kind)}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 700, color: TEXT }}>{data.sourcePriority.titleRu}</p>
            {data.sourcePriority.detailRu ? (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{data.sourcePriority.detailRu}</p>
            ) : null}
            <div style={{ marginTop: 12, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              <strong style={{ color: TEXT }}>Каталог (structured): </strong>
              {data.structured.catalogLineRu ?? "Явных строк применимости к модификации не найдено."}
            </div>
          </section>

          {/* §15 Configuration (MVP: текущая модификация) */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Совместимость по конфигурациям</h2>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              Полная матрица по годам и рынкам требует отдельной агрегации в API. Ниже — ваша текущая модификация и
              сигнал по отчётам на странице.
            </p>
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
                <thead>
                  <tr style={{ color: MUTED, textAlign: "left" as const }}>
                    <th style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>Конфигурация</th>
                    <th style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>Сигнал</th>
                    <th style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>Отчётов</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
                      {data.vehicle.variantYear} · {data.vehicle.variantName}
                      {data.vehicle.market ? ` · ${data.vehicle.market}` : ""}
                    </td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER}`, color: TEXT }}>{verdictTitle}</td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{bd.totalReports}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* §16 Modification insights */}
          {modificationInsights ? (
            <section style={{ ...sectionCard, marginTop: 16 }}>
              <h2 style={h2}>Какие доработки встречались</h2>
              {modificationInsights.rare ? (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED }}>
                  Есть отдельные отчёты о доработках, но они не являются массовыми.
                </p>
              ) : null}
              <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {modificationInsights.rows.map(([label, n]) => (
                  <li
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 13,
                      color: TEXT,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "#0f141a",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
                    <span style={{ color: MUTED, flexShrink: 0 }}>{n} отч.</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* §17 Negative */}
          {negativeSnippets.length > 0 ? (
            <section style={{ ...sectionCard, marginTop: 16, borderColor: RED, background: "rgba(239,68,68,0.06)" }}>
              <h2 style={{ ...h2, color: "#FECACA" }}>Почему деталь не подошла</h2>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED }}>
                Сводка по формулировкам из отчётов «Не подошла» (не скрываем негатив, спека §17).
              </p>
              <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {negativeSnippets.map(([label, n]) => (
                  <li
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: TEXT,
                    }}
                  >
                    <span style={{ flex: 1, paddingRight: 12 }}>{label}</span>
                    <span style={{ color: MUTED }}>{n} отч.</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* §18 Safety */}
          {safety ? (
            <section
              style={{
                ...sectionCard,
                marginTop: 16,
                borderColor: AMBER,
                background: "rgba(234,179,8,0.08)",
              }}
            >
              <h2 style={{ ...h2, color: "#FDE68A" }}>Ответственный узел</h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#FEF3C7", lineHeight: 1.55 }}>
                Перед установкой проверьте совместимость по сервисной документации. Community reports помогают оценить
                опыт владельцев, но не заменяют техническую проверку.
              </p>
              {brakesExtra ? (
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "#FDE68A", lineHeight: 1.55 }}>
                  Тормозная система влияет на безопасность. Установка несовместимых деталей может быть опасна.
                </p>
              ) : null}
            </section>
          ) : null}

          {data.sourcePriority.kind === "conflict" ? (
            <section style={{ ...sectionCard, marginTop: 16, borderColor: BLUE, background: "rgba(59,130,246,0.08)" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#BFDBFE", lineHeight: 1.55 }}>
                Внимание: часть пользовательских отчётов противоречит правилам совместимости. Для ответственных узлов
                приоритет имеют проверенные правила MotoTwin.
              </p>
            </section>
          ) : null}

          {/* §19 Ride profile (community) */}
          {data.rideProfileInsight ? (
            <section style={{ ...sectionCard, marginTop: 16 }}>
              <h2 style={h2}>Лучше всего подходит для</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: TEXT, lineHeight: 1.55 }}>
                {data.rideProfileInsight.headlineRu}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED }}>
                По положительным отчётам с указанным профилем езды (§19). Порог: не менее 3 наблюдений.
              </p>
              <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {data.rideProfileInsight.topTags.map((t) => (
                  <li
                    key={t.labelRu}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 13,
                      color: TEXT,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "#0f141a",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{t.labelRu}</span>
                    <span style={{ color: MUTED, flexShrink: 0 }}>
                      {t.count} отч. · {t.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* §20–21 Owner reports */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Отчёты владельцев</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <FilterChip active={reportFilter === "ALL"} onClick={() => setReportFilter("ALL")} label="Все" />
              {RESULT_ORDER.map((k) => (
                <FilterChip
                  key={k}
                  active={reportFilter === k}
                  onClick={() => setReportFilter(k)}
                  label={fitmentReportResultHeadlineRu(k)}
                />
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <FilterChip active={mediaExtra === "all"} onClick={() => setMediaExtra("all")} label="Все медиа" />
              <FilterChip active={mediaExtra === "photo"} onClick={() => setMediaExtra("photo")} label="Только с фото" />
              <FilterChip
                active={mediaExtra === "service"}
                onClick={() => setMediaExtra("service")}
                label="С Service Event"
              />
              <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>Сортировка:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                style={{
                  background: PANEL,
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                }}
              >
                <option value="new">Новые</option>
                <option value="helpful">Самые полезные</option>
                <option value="negative_first">Негативные сначала</option>
              </select>
            </div>
            {processedReports.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13 }}>Нет отчётов по выбранным фильтрам.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {processedReports.map((r) => (
                  <article
                    key={r.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${BORDER}`,
                      background: "#0f141a",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: BAR_COLORS[r.fitmentResult] }}>
                        {fitmentReportResultHeadlineRu(r.fitmentResult)}
                      </div>
                      {r.moderationStatus === "PENDING" ? (
                        <span style={pendingBadge}>На проверке</span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: TEXT }}>
                      {r.vehicleLabel ?? `${data.vehicle.brandName} ${data.vehicle.modelName}`}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>{variantLine}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>
                      {installationStatusLabelRu(r.installationStatus)}
                      {r.installedAtMileage != null
                        ? ` · на пробеге: ${r.installedAtMileage.toLocaleString("ru-RU")} км`
                        : ""}
                    </div>
                    {(() => {
                      const rpVm = buildRideProfileViewModel(r.rideProfileAtReport);
                      return rpVm ? (
                        <div style={{ marginTop: 6, fontSize: 12, color: MUTED, lineHeight: 1.45 }}>
                          Профиль езды в отчёте: {rpVm.usageType} · {rpVm.ridingStyle} · {rpVm.loadType} ·{" "}
                          {rpVm.usageIntensity}
                        </div>
                      ) : null;
                    })()}
                    {r.serviceEventId ? (
                      <div style={{ marginTop: 8 }}>
                        <Link
                          href={`/vehicles/${encodeURIComponent(props.vehicleId)}/service-events/${encodeURIComponent(r.serviceEventId)}/edit?returnTo=${returnToForServiceLog}`}
                          style={{ fontSize: 12, color: BLUE, fontWeight: 700 }}
                        >
                          Service Event{r.serviceEventTitle ? `: ${r.serviceEventTitle}` : ""}
                        </Link>
                      </div>
                    ) : null}
                    {r.comment ? (
                      <p style={{ margin: "10px 0 0", fontSize: 14, color: TEXT, lineHeight: 1.45 }}>{r.comment}</p>
                    ) : null}
                    {typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5 ? (
                      <div style={{ marginTop: 8, fontSize: 13, color: AMBER, fontWeight: 700 }}>
                        Оценка опыта: {r.rating} / 5
                      </div>
                    ) : null}
                    {r.modificationDetails ? (
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED }}>
                        Доработка: {r.modificationDetails}
                      </p>
                    ) : null}
                    {r.evidence.length > 0 ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: MUTED }}>Evidence:</span>
                        {r.evidence.slice(0, 4).map((e) => (
                          <a
                            key={e.id}
                            href={e.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: BLUE }}
                          >
                            {evidenceTypeShortRu(e.type)}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 10, fontSize: 11, color: MUTED }}>
                      {new Date(r.updatedAt).toLocaleString("ru-RU")} · {voteSummaryLine(r.votes)}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: MUTED, fontStyle: "italic" }}>
                      Голосование по отчётам открывается из общего потока сообщества (MVP: только просмотр).
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* §22 Evidence gallery */}
          {evidenceGallery.length > 0 ? (
            <section style={{ ...sectionCard, marginTop: 16 }}>
              <h2 style={h2}>Фото и подтверждения</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {evidenceTypesDistinct.map((t) => (
                  <FilterChip
                    key={t}
                    active={evidenceTypeFilter === t}
                    onClick={() => setEvidenceTypeFilter(t)}
                    label={t === "ALL" ? "Все типы" : evidenceTypeShortRu(t)}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 12, paddingBottom: 6 }}>
                {filteredEvidenceGallery.map((e) => (
                  <a
                    key={`${e.reportId}-${e.id}`}
                    href={e.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flexShrink: 0, textDecoration: "none" }}
                    title={`${evidenceTypeShortRu(e.type)} · ${fitmentReportResultHeadlineRu(e.result)}`}
                  >
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 10,
                        overflow: "hidden",
                        border: `1px solid ${BORDER}`,
                        position: "relative",
                        background: "#000",
                      }}
                    >
                      <Image
                        src={e.fileUrl}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 4, maxWidth: 96 }}>{evidenceTypeShortRu(e.type)}</div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {/* §23 Service statistics */}
          <section style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={h2}>Статистика эксплуатации</h2>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              Метрики по <strong>всем</strong> отчётам по этой связке (не только по 50 в списке ниже). «Пробег после
              установки» оценивается как прирост <code style={{ color: TEXT }}>installedAtMileage</code> между
              последовательными отчётами <strong>одного и того же</strong> автора.
            </p>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: MUTED, fontSize: 13, lineHeight: 1.65 }}>
              <li>
                Записей в журнале: {data.serviceStatistics.totalReportEntries} · Уникальных владельцев:{" "}
                {data.serviceStatistics.uniqueAuthorCount}
              </li>
              {data.serviceStatistics.repeatReportCount > 0 ? (
                <li>
                  Повторных записей от того же владельца: {data.serviceStatistics.repeatReportCount} (
                  {data.serviceStatistics.authorsWithMultipleEntriesCount}{" "}
                  {data.serviceStatistics.authorsWithMultipleEntriesCount === 1 ? "владелец" : "владельцев"} с
                  несколькими записями)
                </li>
              ) : (
                <li>Ни у одного владельца больше одной записи по этой связке.</li>
              )}
              {data.serviceStatistics.averageRating != null ? (
                <li>
                  Средняя оценка: {data.serviceStatistics.averageRating} / 5 (оценок:{" "}
                  {data.serviceStatistics.ratedReportCount})
                </li>
              ) : (
                <li>Средняя оценка: нет данных (поле rating не заполнено в отчётах).</li>
              )}
              {data.serviceStatistics.averageInstalledAtMileageKm != null ? (
                <li>
                  Средний пробег в момент описания:{" "}
                  {data.serviceStatistics.averageInstalledAtMileageKm.toLocaleString("ru-RU")} км (макс.{" "}
                  {data.serviceStatistics.maxInstalledAtMileageKm?.toLocaleString("ru-RU")} км)
                </li>
              ) : (
                <li>Средний пробег в момент описания: нет заполненных значений.</li>
              )}
              {data.serviceStatistics.mileageAfterInstallSamplePairs > 0 ? (
                <li>
                  Оценка пробега после установки (между парами отчётов одного автора): в среднем{" "}
                  {data.serviceStatistics.averageMileageAfterInstallKm?.toLocaleString("ru-RU")} км, максимум{" "}
                  {data.serviceStatistics.maxMileageAfterInstallKm?.toLocaleString("ru-RU")} км (пар для расчёта:{" "}
                  {data.serviceStatistics.mileageAfterInstallSamplePairs})
                </li>
              ) : (
                <li>
                  Пробег после установки по парам отчётов: нет пар с двумя указанными пробегами у одного автора —
                  добавьте пробег в последующих отчётах.
                </li>
              )}
              {data.serviceStatistics.reportsWithServiceEventCount > 0 ? (
                <li>Отчётов с Service Event: {data.serviceStatistics.reportsWithServiceEventCount}</li>
              ) : (
                <li>Отчётов с Service Event: 0</li>
              )}
            </ul>
          </section>

          {/* §24 Related */}
          {data.relatedParts.length > 0 ? (
            <section style={{ ...sectionCard, marginTop: 16 }}>
              <h2 style={h2}>Похожие детали для этого узла</h2>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                {data.relatedParts.map((rp) => {
                  const tb = trustBadgeShortRu(rp.trustBadge);
                  return (
                    <Link
                      key={rp.partMasterId}
                      href={`/vehicles/${encodeURIComponent(props.vehicleId)}/parts/fitment-report?partMasterId=${encodeURIComponent(rp.partMasterId)}&nodeId=${encodeURIComponent(props.nodeId)}`}
                      style={{
                        minWidth: 200,
                        maxWidth: 240,
                        padding: 12,
                        borderRadius: 12,
                        border: `1px solid ${BORDER}`,
                        background: PANEL,
                        textDecoration: "none",
                        color: TEXT,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800 }}>{rp.brandName}</div>
                      <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.3 }}>{rp.title}</div>
                      {tb ? (
                        <div style={{ fontSize: 10, color: GREEN, marginTop: 6, fontWeight: 700 }}>{tb}</div>
                      ) : null}
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{rp.summaryLineRu}</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <aside
          style={
            narrow
              ? { position: "relative" as const, width: "100%" }
              : { position: "sticky" as const, top: 16, alignSelf: "start" }
          }
        >
          <div style={{ ...sectionCard, padding: 16 }}>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>МОТОЦИКЛ</div>
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: TEXT }}>
              {data.vehicle.brandName} {data.vehicle.modelName}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{variantLine}</div>
            {data.vehicle.nickname ? <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{data.vehicle.nickname}</div> : null}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 12, color: MUTED }}>Записей в журнале (все)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>{data.serviceStatistics.totalReportEntries}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Уникальных владельцев</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{data.serviceStatistics.uniqueAuthorCount}</div>
              {data.serviceStatistics.repeatReportCount > 0 ? (
                <div style={{ marginTop: 10, fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
                  Повторных записей: {data.serviceStatistics.repeatReportCount}
                </div>
              ) : null}
            </div>

            {dominant && bd.totalReports > 0 ? (
              <div style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
                Чаще всего в отчётах:{" "}
                <strong style={{ color: TEXT }}>{fitmentReportResultHeadlineRu(dominant)}</strong>
              </div>
            ) : null}

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Профиль езды</div>
              {data.rideProfileInsight ? (
                <>
                  <div style={{ marginTop: 6, fontSize: 12, color: TEXT, lineHeight: 1.4, fontWeight: 600 }}>
                    {rideProfileInsightShortRu(data.rideProfileInsight)}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: MUTED, lineHeight: 1.35 }}>
                    Размер выборки для профиля: {data.rideProfileInsight.sampleSize} (положительные исходы с
                    заполненным профилем езды).
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 6, fontSize: 11, color: MUTED, lineHeight: 1.35 }}>
                  Нет саммари: мало отчётов с профилем (≥3).
                </div>
              )}
            </div>

            {data.voteTotals.length > 0 ? (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Голоса по всем отчётам</div>
                {data.voteTotals.map((v) => (
                  <div key={v.voteType} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: MUTED }}>{voteTypeLabelRu(v.voteType)}</span>
                    <span style={{ color: TEXT, fontWeight: 700 }}>{v.count}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href={communityHref} style={primaryLinkBtn}>
                Добавить свой опыт
              </Link>
              <button type="button" disabled title="Скоро: корзина замен" style={secondaryGhostBtn}>
                Добавить в корзину замен
              </button>
            </div>
          </div>

          <div style={{ ...sectionCard, marginTop: 12, padding: 14, fontSize: 13, color: MUTED }}>
            <div style={{ fontWeight: 700, color: TEXT }}>Итог</div>
            <div style={{ marginTop: 6 }}>{verdictTitle}</div>
            <div style={{ marginTop: 4 }}>{verdictTierLine}</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {data.serviceStatistics.totalReportEntries} записей · {ownerCountLabelRu(data.serviceStatistics.uniqueAuthorCount)}
            </div>
          </div>
        </aside>
      </div>

      {narrow ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            padding: "10px 12px",
            background: PANEL,
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            gap: 8,
          }}
        >
          <Link href={communityHref} style={{ ...primaryLinkBtn, flex: 1, textAlign: "center", fontSize: 13 }}>
            Опыт
          </Link>
          <button type="button" onClick={backToPicker} style={{ ...secondaryGhostBtn, flex: 1 }}>
            К подбору
          </button>
        </div>
      ) : null}
    </div>
  );
}

function countFor(
  bd: PartCompatibilityReportWire["breakdown"],
  k: FitmentReportResultWire
): number {
  switch (k) {
    case "DIRECT_FIT":
      return bd.directFitCount;
    case "FIT_WITH_MODIFICATION":
      return bd.fitWithModificationCount;
    case "PARTIAL_FIT":
      return bd.partialFitCount;
    case "DOES_NOT_FIT":
      return bd.doesNotFitCount;
    case "OEM_REPLACEMENT":
      return bd.oemReplacementCount;
    default:
      return 0;
  }
}

function pctFor(bd: PartCompatibilityReportWire["breakdown"], k: FitmentReportResultWire): number {
  const n = countFor(bd, k);
  if (bd.totalReports === 0 || n === 0) return 0;
  return Math.max(0, Math.round((1000 * n) / bd.totalReports) / 10);
}

const sectionCard: CSSProperties = {
  padding: 18,
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  backgroundColor: PANEL,
  boxSizing: "border-box",
};

const h2: CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: TEXT,
  fontWeight: 800,
};

const headerGhostBtn: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 10px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: "transparent",
  color: MUTED,
  cursor: "pointer",
};

const primaryLinkBtn: CSSProperties = {
  display: "block",
  textAlign: "center",
  padding: "12px 14px",
  borderRadius: 10,
  background: BLUE,
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  textDecoration: "none",
};

const secondaryGhostBtn: CSSProperties = {
  padding: "12px 8px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: "transparent",
  color: TEXT,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const pendingBadge: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(234,179,8,0.2)",
  color: AMBER,
  border: `1px solid ${AMBER}`,
};

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${props.active ? BLUE : BORDER}`,
        background: props.active ? "rgba(59,130,246,0.2)" : "transparent",
        color: props.active ? TEXT : MUTED,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {props.label}
    </button>
  );
}
