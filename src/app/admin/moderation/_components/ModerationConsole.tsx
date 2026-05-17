"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AdminModerationCountsWire,
  AdminModerationInspectorWire,
  AdminModerationItemWire,
  AdminModerationListResponse,
  AdminModerationQueueKey,
} from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { formatRelativeRu } from "../../_components/format";

const TABS: Array<{ key: AdminModerationQueueKey; label: string }> = [
  { key: "pendingMasters", label: "Новые детали" },
  { key: "pendingReports", label: "Reports на публикацию" },
  { key: "needsReviewReports", label: "Нужна проверка" },
  { key: "safetyCriticalReports", label: "Safety-critical" },
  { key: "mixedFitments", label: "Конфликтующие fitments" },
  { key: "hiddenReports", label: "Скрытые" },
  { key: "rejectedReports", label: "Отклонённые" },
];

interface ModerationConsoleProps {
  initial: AdminModerationListResponse;
  canMutate: boolean;
}

export function ModerationConsole({ initial, canMutate }: ModerationConsoleProps) {
  const router = useRouter();
  const [activeQueue, setActiveQueue] = useState<AdminModerationQueueKey>(initial.queue);
  const [items, setItems] = useState<AdminModerationItemWire[]>(initial.items);
  const [counts, setCounts] = useState<AdminModerationCountsWire>(initial.counts);
  const [selectedId, setSelectedId] = useState<string | null>(initial.items[0]?.id ?? null);
  const [inspector, setInspector] = useState<AdminModerationInspectorWire | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const loadQueue = useCallback(async (queue: AdminModerationQueueKey) => {
    setActiveQueue(queue);
    setError(null);
    try {
      const res = await fetch(`/api/admin/moderation/queue?queue=${queue}`);
      if (!res.ok) {
        setError("Не удалось загрузить очередь");
        return;
      }
      const data = (await res.json()) as AdminModerationListResponse;
      setItems(data.items);
      setCounts(data.counts);
      setSelectedId(data.items[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setError("Сетевая ошибка");
    }
  }, []);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setInspector(null);
      return;
    }
    let cancelled = false;
    setInspectorLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/moderation/inspector?kind=${selected.kind}&id=${selected.id}`
        );
        if (!res.ok) {
          if (!cancelled) setInspector(null);
          return;
        }
        const data = (await res.json()) as AdminModerationInspectorWire;
        if (!cancelled) setInspector(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setInspector(null);
      } finally {
        if (!cancelled) setInspectorLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const applyAction = async (actionId: string) => {
    if (!selected || !canMutate) return;
    setPendingAction(actionId);
    setError(null);
    try {
      const res = await fetch("/api/admin/moderation/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: selected.kind,
          id: selected.id,
          action: actionId,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(json?.error ?? "Не удалось применить действие");
        return;
      }
      setReason("");
      await loadQueue(activeQueue);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Сетевая ошибка");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div style={layoutStyle}>
      <div style={listColStyle}>
        <div style={tabsStyle}>
          {TABS.map((tab) => {
            const count = counts[tab.key];
            const active = tab.key === activeQueue;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => loadQueue(tab.key)}
                style={active ? tabActive : tabIdle}
              >
                <span>{tab.label}</span>
                {count > 0 ? <span style={badge(active)}>{count}</span> : null}
              </button>
            );
          })}
        </div>
        {error ? <div style={errorBox}>{error}</div> : null}
        <div style={listScrollStyle}>
          {items.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: productSemanticColors.textMuted,
                fontSize: 13,
              }}
            >
              Очередь пуста — отличная работа!
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={selectedId === item.id ? listItemActive : listItem}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: productSemanticColors.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: productSemanticColors.textMuted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.subtitle ?? "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {item.badges.map((b) => (
                        <span key={b} style={miniBadge}>
                          {b}
                        </span>
                      ))}
                      <span style={{ fontSize: 11, color: productSemanticColors.textMuted }}>
                        {formatRelativeRu(item.createdAt)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside style={inspectorColStyle}>
        {!selected ? (
          <div
            style={{
              padding: 32,
              color: productSemanticColors.textMuted,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Выберите запись слева
          </div>
        ) : inspectorLoading ? (
          <div style={{ padding: 24, color: productSemanticColors.textMuted }}>Загрузка…</div>
        ) : !inspector ? (
          <div style={{ padding: 24, color: productSemanticColors.textMuted }}>Не найдено</div>
        ) : (
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <header>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: productSemanticColors.textPrimary,
                }}
              >
                {inspector.heading}
              </div>
              <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                {inspector.subheading}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  height: 22,
                  padding: "0 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#A5B4FC",
                  backgroundColor: "rgba(99,102,241,0.16)",
                }}
              >
                {inspector.status}
              </div>
            </header>
            <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {inspector.fields.map((field) => (
                <div
                  key={field.label}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                >
                  <dt
                    style={{
                      fontSize: 12,
                      color: productSemanticColors.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    {field.label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: productSemanticColors.textPrimary,
                      textAlign: "right",
                    }}
                  >
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
            {inspector.notes ? (
              <div
                style={{
                  fontSize: 12,
                  color: productSemanticColors.textSecondary,
                  backgroundColor: productSemanticColors.cardSubtle,
                  padding: 10,
                  borderRadius: radiusScale.sm,
                  border: `1px solid ${productSemanticColors.border}`,
                  whiteSpace: "pre-wrap",
                }}
              >
                {inspector.notes}
              </div>
            ) : null}
            {inspector.links.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {inspector.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    style={smallLinkStyle}
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            ) : null}
            {inspector.actions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  placeholder="Обоснование (опционально, попадет в audit log)"
                  disabled={!canMutate}
                  style={textareaStyle}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {inspector.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => applyAction(action.id)}
                      disabled={!canMutate || pendingAction !== null}
                      style={
                        action.tone === "primary"
                          ? primaryButton
                          : action.tone === "danger"
                          ? dangerButton
                          : neutralButton
                      }
                    >
                      {pendingAction === action.id ? "…" : action.label}
                    </button>
                  ))}
                </div>
                {!canMutate ? (
                  <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                    Только просмотр (роль не позволяет менять статус)
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.1fr)",
  gap: 16,
};

const listColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const tabIdle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 30,
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 500,
  color: productSemanticColors.textSecondary,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: 999,
  cursor: "pointer",
};

const tabActive: React.CSSProperties = {
  ...tabIdle,
  color: productSemanticColors.onPrimaryAction,
  backgroundColor: productSemanticColors.primaryAction,
  borderColor: productSemanticColors.primaryAction,
};

function badge(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 18,
    padding: "0 6px",
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 999,
    color: active ? productSemanticColors.primaryAction : productSemanticColors.textPrimary,
    backgroundColor: active ? "rgba(255,255,255,0.85)" : productSemanticColors.cardSubtle,
  };
}

const listScrollStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  overflow: "hidden",
  maxHeight: "calc(100vh - 240px)",
  overflowY: "auto",
};

const listItem: React.CSSProperties = {
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${productSemanticColors.border}`,
  cursor: "pointer",
  color: productSemanticColors.textPrimary,
};

const listItemActive: React.CSSProperties = {
  ...listItem,
  backgroundColor: "rgba(56,189,248,0.08)",
  borderLeft: `3px solid ${productSemanticColors.primaryAction}`,
};

const inspectorColStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  minHeight: 200,
  position: "sticky",
  top: 16,
  alignSelf: "start",
};

const miniBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 18,
  padding: "0 6px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  color: "#FBBF24",
  backgroundColor: "rgba(251,191,36,0.14)",
};

const errorBox: React.CSSProperties = {
  color: "#FCA5A5",
  backgroundColor: "rgba(248,113,113,0.10)",
  border: `1px solid rgba(248,113,113,0.30)`,
  padding: "8px 10px",
  borderRadius: radiusScale.sm,
  fontSize: 12,
};

const textareaStyle: React.CSSProperties = {
  resize: "vertical",
  padding: "8px 10px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 12,
};

const baseButton: React.CSSProperties = {
  height: 32,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  border: "none",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
};

const dangerButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: "rgba(248,113,113,0.18)",
  color: "#FCA5A5",
  border: `1px solid rgba(248,113,113,0.30)`,
};

const neutralButton: React.CSSProperties = {
  ...baseButton,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  border: `1px solid ${productSemanticColors.border}`,
};

const smallLinkStyle: React.CSSProperties = {
  fontSize: 12,
  color: productSemanticColors.primaryAction,
  textDecoration: "none",
  border: `1px solid ${productSemanticColors.border}`,
  padding: "4px 8px",
  borderRadius: radiusScale.sm,
};
