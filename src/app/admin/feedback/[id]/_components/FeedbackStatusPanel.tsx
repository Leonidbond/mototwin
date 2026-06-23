"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackStatusWire } from "@mototwin/types";
import { FEEDBACK_STATUS_KEYS, getFeedbackStatusLabelRu } from "@mototwin/domain";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { formatDateTimeRu } from "../../../_components/format";
import { ruAdmin } from "../../../_locales/ru";

interface FeedbackStatusPanelProps {
  feedbackId: string;
  status: FeedbackStatusWire;
  adminNote: string | null;
  reviewedByLabel: string | null;
  reviewedAt: string | null;
}

export function FeedbackStatusPanel({
  feedbackId,
  status,
  adminNote,
  reviewedByLabel,
  reviewedAt,
}: FeedbackStatusPanelProps) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<FeedbackStatusWire>(status);
  const [note, setNote] = useState(adminNote ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/feedback/${encodeURIComponent(feedbackId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            adminNote: note.trim() || null,
          }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Не удалось сохранить.");
        }
        setSaved(ruAdmin.feedback.detail.saved);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить.");
      }
    });
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>{ruAdmin.feedback.detail.manage}</h3>

      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
        <span style={labelStyle}>{ruAdmin.feedback.columns.status}</span>
        <select
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as FeedbackStatusWire)}
          style={selectStyle}
        >
          {FEEDBACK_STATUS_KEYS.map((key) => (
            <option key={key} value={key}>
              {getFeedbackStatusLabelRu(key)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
        <span style={labelStyle}>{ruAdmin.feedback.detail.note}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={2000}
          style={textareaStyle}
        />
      </div>

      <button type="button" onClick={submit} disabled={pending} style={buttonStyle}>
        {pending ? "Сохраняем…" : ruAdmin.feedback.detail.save}
      </button>

      {error ? <div style={{ marginTop: 8, color: "#FCA5A5", fontSize: 12 }}>{error}</div> : null}
      {saved ? <div style={{ marginTop: 8, color: "#86EFAC", fontSize: 12 }}>{saved}</div> : null}

      {reviewedByLabel || reviewedAt ? (
        <div style={{ marginTop: 12, fontSize: 12, color: productSemanticColors.textMuted }}>
          {ruAdmin.feedback.detail.reviewedBy}: {reviewedByLabel ?? "—"}
          {reviewedAt ? ` · ${formatDateTimeRu(reviewedAt)}` : ""}
        </div>
      ) : null}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: productSemanticColors.textPrimary,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: productSemanticColors.textMuted,
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  height: 34,
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  padding: "0 10px",
  fontSize: 13,
};

const textareaStyle: React.CSSProperties = {
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  padding: 10,
  fontSize: 13,
  resize: "vertical",
  fontFamily: "inherit",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 14,
  height: 36,
  width: "100%",
  border: "none",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
