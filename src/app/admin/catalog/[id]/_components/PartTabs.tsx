"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface TabItem {
  key: string;
  label: string;
  badge?: number;
}

interface PartTabsProps {
  tabs: TabItem[];
}

export function PartTabs({ tabs }: PartTabsProps) {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const active = params?.get("tab") ?? tabs[0]?.key;
  return (
    <div role="tablist" style={tabsRow}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const href = `${pathname}?tab=${tab.key}`;
        return (
          <Link
            key={tab.key}
            href={href}
            prefetch={false}
            role="tab"
            aria-selected={isActive}
            style={isActive ? tabActive : tabIdle}
          >
            <span>{tab.label}</span>
            {typeof tab.badge === "number" && tab.badge > 0 ? (
              <span style={badge(isActive)}>{tab.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

const tabsRow: React.CSSProperties = {
  display: "flex",
  gap: 4,
  borderBottom: `1px solid ${productSemanticColors.border}`,
  paddingBottom: 0,
};

const tabIdle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  fontSize: 13,
  color: productSemanticColors.textMuted,
  textDecoration: "none",
  borderTopLeftRadius: radiusScale.sm,
  borderTopRightRadius: radiusScale.sm,
  borderBottom: "2px solid transparent",
};

const tabActive: React.CSSProperties = {
  ...tabIdle,
  color: productSemanticColors.textPrimary,
  fontWeight: 600,
  borderBottom: `2px solid ${productSemanticColors.primaryAction}`,
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
    color: active ? productSemanticColors.onPrimaryAction : productSemanticColors.textPrimary,
    backgroundColor: active
      ? productSemanticColors.primaryAction
      : productSemanticColors.cardSubtle,
  };
}
