"use client";

import type { AdminRoleWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminRoleAssignmentControl } from "../../../_components/AdminRoleAssignmentControl";
import { ruAdmin } from "../../../_locales/ru";

interface UserAdminRolePanelProps {
  userId: string;
  currentUserId: string;
  adminRole: AdminRoleWire | null;
  isModerator: boolean;
}

export function UserAdminRolePanel({
  userId,
  currentUserId,
  adminRole,
  isModerator,
}: UserAdminRolePanelProps) {
  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <h3 style={titleStyle}>Права админки</h3>
        {adminRole ? (
          <span style={chipStyle}>{ruAdmin.topbar.role[adminRole] ?? adminRole}</span>
        ) : isModerator ? (
          <span style={chipMutedStyle}>Legacy moderator</span>
        ) : (
          <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>Нет доступа</span>
        )}
      </div>
      <p style={metaStyle}>
        Только SUPER_ADMIN может назначать или снимать роли. Действие записывается в audit log.
      </p>
      <AdminRoleAssignmentControl
        userId={userId}
        currentUserId={currentUserId}
        adminRole={adminRole}
        isModerator={isModerator}
      />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
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

const metaStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  fontSize: 12,
  color: productSemanticColors.textSecondary,
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

const chipMutedStyle: React.CSSProperties = {
  ...chipStyle,
  color: "#86EFAC",
  backgroundColor: "rgba(34,197,94,0.14)",
};
