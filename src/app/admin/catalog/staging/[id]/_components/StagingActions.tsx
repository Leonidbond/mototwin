"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReviewStatus } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

export function StagingActions(props: {
  id: string;
  reviewStatus: ReviewStatus;
  promotedSkuId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: "approve" | "reject") => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/catalog/staging/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError((json as { error?: string }).error ?? "Ошибка");
        return;
      }
      router.refresh();
    });
  };

  const alreadyApproved = props.reviewStatus === "MANUAL_APPROVED" || Boolean(props.promotedSkuId);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        type="button"
        disabled={pending || alreadyApproved}
        onClick={() => run("approve")}
        style={approveBtn}
      >
        {alreadyApproved ? "Одобрено" : pending ? "…" : "Approve + promote"}
      </button>
      <button type="button" disabled={pending} onClick={() => run("reject")} style={rejectBtn}>
        Reject
      </button>
      {error ? <span style={{ color: "#FCA5A5", fontSize: 12 }}>{error}</span> : null}
    </div>
  );
}

const approveBtn: React.CSSProperties = {
  height: 34,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  border: "none",
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const rejectBtn: React.CSSProperties = {
  ...approveBtn,
  backgroundColor: "transparent",
  color: productSemanticColors.textPrimary,
  border: `1px solid ${productSemanticColors.border}`,
};
