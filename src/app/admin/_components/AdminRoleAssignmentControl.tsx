"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminRoleWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { ruAdmin } from "../_locales/ru";

const ROLES: AdminRoleWire[] = ["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR", "ANALYST"];

export interface AdminRoleAssignmentControlProps {
  userId: string;
  currentUserId: string;
  adminRole: AdminRoleWire | null;
  /** Shown when `adminRole` is null but legacy `isModerator` is still set. */
  isModerator?: boolean;
  onSaved?: () => void;
}

export function AdminRoleAssignmentControl({
  userId,
  currentUserId,
  adminRole,
  isModerator = false,
  onSaved,
}: AdminRoleAssignmentControlProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<AdminRoleWire | "">((adminRole ?? "") as AdminRoleWire | "");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft((adminRole ?? "") as AdminRoleWire | "");
    setSaved(false);
  }, [adminRole, userId]);

  const dirty = draft !== (adminRole ?? "");
  const isSelf = userId === currentUserId;

  const save = () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Укажите краткое обоснование");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/team", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId,
            adminRole: draft === "" ? null : draft,
            reason: trimmedReason,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось сохранить");
          return;
        }
        setReason("");
        setSaved(true);
        onSaved?.();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!adminRole && isModerator ? (
        <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
          Legacy moderator без роли админки — назначьте роль ниже.
        </div>
      ) : null}
      <select
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value as AdminRoleWire | "");
          setSaved(false);
        }}
        style={selectStyle}
      >
        <option value="">— нет доступа —</option>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ruAdmin.topbar.role[role] ?? role}
          </option>
        ))}
      </select>
      {isSelf && draft !== "" && draft !== "SUPER_ADMIN" ? (
        <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
          Нельзя понизить собственную роль ниже SUPER_ADMIN.
        </div>
      ) : null}
      {dirty ? (
        <>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Обоснование (audit log)"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || (isSelf && draft !== "" && draft !== "SUPER_ADMIN")}
            style={primaryButton}
          >
            {pending ? "Сохраняем…" : "Сохранить роль"}
          </button>
        </>
      ) : null}
      {error ? <div style={errorBox}>{error}</div> : null}
      {saved && !dirty ? <span style={{ color: "#86EFAC", fontSize: 12 }}>Роль сохранена</span> : null}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  height: 30,
  padding: "0 10px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 12,
};

const primaryButton: React.CSSProperties = {
  height: 30,
  padding: "0 12px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  border: "none",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  color: "#FCA5A5",
  backgroundColor: "rgba(248,113,113,0.10)",
  border: `1px solid rgba(248,113,113,0.30)`,
  padding: "8px 10px",
  borderRadius: radiusScale.sm,
  fontSize: 12,
};
