"use client";

import type { AdminRoleWire, AdminTeamMemberWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminRoleAssignmentControl } from "../../_components/AdminRoleAssignmentControl";
import { ruAdmin } from "../../_locales/ru";
import { formatDateRu } from "../../_components/format";

interface TeamRoleEditorProps {
  currentUserId: string;
  members: AdminTeamMemberWire[];
}

export function TeamRoleEditor({ currentUserId, members }: TeamRoleEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                    <AdminRoleAssignmentControl
                      userId={member.id}
                      currentUserId={currentUserId}
                      adminRole={member.adminRole}
                      isModerator={member.isModerator}
                    />
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
