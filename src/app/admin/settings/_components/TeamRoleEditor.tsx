"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminRoleWire, AdminTeamMemberWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { ruAdmin } from "../../_locales/ru";
import { formatDateRu } from "../../_components/format";

const ROLES: AdminRoleWire[] = ["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR", "ANALYST"];

interface TeamRoleEditorProps {
  currentUserId: string;
  members: AdminTeamMemberWire[];
}

export function TeamRoleEditor({ currentUserId, members }: TeamRoleEditorProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, AdminRoleWire | "">>(() =>
    Object.fromEntries(members.map((m) => [m.id, (m.adminRole ?? "") as AdminRoleWire | ""]))
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const setDraft = (userId: string, value: AdminRoleWire | "") =>
    setDrafts((prev) => ({ ...prev, [userId]: value }));
  const setReason = (userId: string, value: string) =>
    setReasons((prev) => ({ ...prev, [userId]: value }));

  const save = (userId: string) => {
    const reason = (reasons[userId] ?? "").trim();
    if (reason.length < 3) {
      setError("Укажите краткое обоснование");
      return;
    }
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/team", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId,
            adminRole: drafts[userId] === "" ? null : drafts[userId],
            reason,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось сохранить");
          return;
        }
        setSavedId(userId);
        setReason(userId, "");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error ? <div style={errorBox}>{error}</div> : null}
      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Сотрудник</th>
              <th style={thStyle}>Роль</th>
              <th style={thStyle}>Зарегистрирован</th>
              <th style={thStyle}>Изменить</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              const dirty = (drafts[member.id] ?? "") !== (member.adminRole ?? "");
              return (
                <tr
                  key={member.id}
                  style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {member.displayName ?? member.email ?? "—"}
                      {isSelf ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: productSemanticColors.textMuted,
                          }}
                        >
                          (вы)
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                      {member.email}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {member.adminRole ? (
                      <span style={chipStyle}>
                        {ruAdmin.topbar.role[member.adminRole] ?? member.adminRole}
                      </span>
                    ) : member.isModerator ? (
                      <span style={chipStyleMuted}>Moderator</span>
                    ) : (
                      <span style={{ color: productSemanticColors.textMuted }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>{formatDateRu(member.createdAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <select
                        value={drafts[member.id] ?? ""}
                        onChange={(e) =>
                          setDraft(member.id, e.target.value as AdminRoleWire | "")
                        }
                        style={selectStyle}
                      >
                        <option value="">— нет —</option>
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ruAdmin.topbar.role[role] ?? role}
                          </option>
                        ))}
                      </select>
                      {dirty ? (
                        <>
                          <input
                            value={reasons[member.id] ?? ""}
                            onChange={(e) => setReason(member.id, e.target.value)}
                            placeholder="Обоснование (audit log)"
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            onClick={() => save(member.id)}
                            disabled={pendingId !== null}
                            style={primaryButton}
                          >
                            {pendingId === member.id ? "Сохраняем…" : "Сохранить"}
                          </button>
                        </>
                      ) : null}
                      {savedId === member.id && !dirty ? (
                        <span style={{ color: "#86EFAC", fontSize: 11 }}>сохранено</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableCardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
  verticalAlign: "top",
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color: "#A5B4FC",
  backgroundColor: "rgba(99,102,241,0.16)",
};

const chipStyleMuted: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color: "#86EFAC",
  backgroundColor: "rgba(34,197,94,0.14)",
};

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
