"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";

type NavIconKind =
  | "home"
  | "nodes"
  | "journal"
  | "expenses"
  | "details"
  | "reminders"
  | "profile"
  | "settings";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKind;
  active?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/garage", label: "Мой гараж", icon: "home", active: true },
  { href: "/vehicles", label: "Узлы", icon: "nodes" },
  { href: "/service-log", label: "Журнал", icon: "journal" },
  { href: "/expenses", label: "Расходы", icon: "expenses" },
  { href: "/details", label: "Детали", icon: "details" },
  { href: "/reminders", label: "Напоминания", icon: "reminders" },
  { href: "/profile", label: "Профиль", icon: "profile" },
  { href: "/settings", label: "Настройки", icon: "settings" },
];

export function GarageSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside style={{ ...asideStyle, padding: collapsed ? "16px 8px" : 16 }}>
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
            marginBottom: 20,
            minHeight: 36,
          }}
        >
          {collapsed ? (
            <span style={logoMarkStyle}>M</span>
          ) : (
            <div>
              <div style={brandStyle}>MOTOTWIN</div>
              <div style={subBrandStyle}>DIGITAL GARAGE</div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
            style={{
              ...toggleButtonStyle,
              position: collapsed ? "absolute" : "static",
              top: collapsed ? 12 : undefined,
              right: collapsed ? -14 : undefined,
              backgroundColor: collapsed
                ? productSemanticColors.card
                : productSemanticColors.cardSubtle,
            }}
          >
            <ChevronIcon direction={collapsed ? "right" : "left"} />
          </button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.label} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!collapsed ? (
          <div style={proCardStyle}>
            <div style={proTitleStyle}>PRO</div>
            <div style={{ marginTop: 4, ...proTextStyle }}>
              Больше возможностей для вашего гаража
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/pro" className="no-underline">
                <Button variant="ghost" size="sm" block style={proButtonStyle}>
                  Перейти на Pro
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        <Link
          href="/profile"
          className="no-underline"
          style={{
            ...userCardStyle,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 6 : 10,
          }}
          title={collapsed ? "Алексей К. · Free тариф" : undefined}
        >
          <span style={avatarStyle}>А</span>
          {!collapsed ? (
            <div style={{ minWidth: 0 }}>
              <div style={userNameStyle}>Алексей К.</div>
              <div style={userPlanStyle}>Free тариф</div>
            </div>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const isActive = !!item.active;
  const color = isActive ? productSemanticColors.textPrimary : productSemanticColors.textMuted;
  const accent = isActive ? productSemanticColors.primaryAction : color;
  return (
    <Link
      href={item.href}
      className="no-underline"
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 12,
        padding: collapsed ? "9px 0" : "9px 12px",
        borderRadius: 12,
        color,
        backgroundColor: isActive ? productSemanticColors.cardSubtle : "transparent",
        border: `1px solid ${isActive ? productSemanticColors.borderStrong : "transparent"}`,
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
      }}
    >
      <IconBox>
        <NavIcon kind={item.icon} color={accent} />
      </IconBox>
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const points = direction === "left" ? "14 6 8 12 14 18" : "10 6 16 12 10 18";
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke={productSemanticColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points={points} />
    </svg>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </span>
  );
}

function NavIcon({ kind, color }: { kind: NavIconKind; color: string }) {
  const common = {
    width: 18,
    height: 18,
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "nodes":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 6h8M6 8v8M18 8v8M8 18h8" />
        </svg>
      );
    case "journal":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
          <path d="M9 9h6M9 13h6" />
        </svg>
      );
    case "expenses":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9h4.5a2 2 0 1 1 0 4H9m0 0h5M10 16V8" />
        </svg>
      );
    case "details":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 0 0-3-1.7L13 2h-2l-.5 2.6a7 7 0 0 0-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 3 1.7L11 22h2l.5-2.6a7 7 0 0 0 3-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z" />
        </svg>
      );
    case "reminders":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M4 12a8 8 0 0 1 .2-1.7L3 9l1.5-2.6 1.8.7a8 8 0 0 1 2.9-1.7L9.5 4h5l.3 1.4a8 8 0 0 1 2.9 1.7l1.8-.7L21 9l-1.2 1.3c.1.5.2 1.1.2 1.7s-.1 1.2-.2 1.7L21 15l-1.5 2.6-1.8-.7a8 8 0 0 1-2.9 1.7l-.3 1.4h-5l-.3-1.4a8 8 0 0 1-2.9-1.7l-1.8.7L3 15l1.2-1.3A8 8 0 0 1 4 12z" />
        </svg>
      );
  }
}

const asideStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: "calc(100vh - 32px)",
  padding: 16,
  borderRight: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  gap: 20,
  transition: "padding 0.18s ease",
};

const toggleButtonStyle: CSSProperties = {
  display: "inline-flex",
  width: 26,
  height: 26,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: `1px solid ${productSemanticColors.borderStrong}`,
  color: productSemanticColors.textMuted,
  cursor: "pointer",
  flexShrink: 0,
  backgroundColor: productSemanticColors.cardSubtle,
  zIndex: 2,
};

const logoMarkStyle: CSSProperties = {
  display: "inline-flex",
  width: 32,
  height: 32,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  backgroundColor: productSemanticColors.primaryAction,
  color: "#0B0E14",
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: 0.2,
};

const brandStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: 1.6,
};

const subBrandStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.6,
  marginTop: 2,
};

const proCardStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
};

const proTitleStyle: CSSProperties = {
  color: productSemanticColors.primaryAction,
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0.8,
};

const proTextStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 12,
  lineHeight: "16px",
};

const proButtonStyle: CSSProperties = {
  color: productSemanticColors.primaryAction,
  borderColor: productSemanticColors.primaryAction,
};

const userCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  borderRadius: 14,
  backgroundColor: productSemanticColors.cardSubtle,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
};

const avatarStyle: CSSProperties = {
  display: "inline-flex",
  flex: "0 0 auto",
  width: 36,
  height: 36,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  backgroundColor: productSemanticColors.chipBackground,
  color: productSemanticColors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
};

const userNameStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 13,
  fontWeight: 700,
};

const userPlanStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 11,
  marginTop: 1,
};
