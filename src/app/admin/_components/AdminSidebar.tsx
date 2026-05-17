"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Bell,
  Bike,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  Combine,
  CreditCard,
  LayoutDashboard,
  Layers,
  Library,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { ADMIN_NAV_ITEMS, resolveActiveSection } from "./admin-nav-config";
import { ruAdmin } from "../_locales/ru";

const ICON_MAP = {
  BarChart3,
  Bell,
  Bike,
  Boxes,
  Combine,
  CreditCard,
  LayoutDashboard,
  Layers,
  Library,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Wrench,
} as const;

type IconKey = keyof typeof ICON_MAP;

const STORAGE_KEY = "mototwin.admin.sidebarCollapsed";

export function AdminSidebar() {
  const pathname = usePathname() || "/admin";
  const [collapsed, setCollapsed] = useState(false);
  const activeKey = resolveActiveSection(pathname);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const meta = isMac ? event.metaKey : event.ctrlKey;
      if (meta && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <aside
      style={{
        width: collapsed ? 72 : 240,
        flexShrink: 0,
        backgroundColor: productSemanticColors.cardSubtle,
        borderRight: `1px solid ${productSemanticColors.border}`,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        transition: "width 180ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "18px 16px" : "18px 22px",
          borderBottom: `1px solid ${productSemanticColors.border}`,
        }}
      >
        <BrandLogo />
        {!collapsed ? (
          <div style={{ lineHeight: 1.1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1.4,
                color: productSemanticColors.textPrimary,
              }}
            >
              {ruAdmin.brand.title}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.6,
                color: productSemanticColors.primaryAction,
              }}
            >
              {ruAdmin.brand.subtitle}
            </div>
          </div>
        ) : null}
      </div>
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = (ICON_MAP[item.icon as IconKey] ?? LayoutDashboard) as typeof LayoutDashboard;
          const isActive = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px 12px" : "10px 14px",
                borderRadius: radiusScale.md,
                backgroundColor: isActive ? "rgba(249,115,22,0.12)" : "transparent",
                color: isActive
                  ? productSemanticColors.primaryAction
                  : productSemanticColors.textSecondary,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                position: "relative",
                textDecoration: "none",
                transition: "background-color 120ms ease, color 120ms ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.7}
                aria-hidden
                style={{ flexShrink: 0 }}
              />
              {!collapsed ? <span>{item.label}</span> : null}
              {item.hasAlertDot && !collapsed ? (
                <span
                  aria-hidden
                  style={{
                    marginLeft: "auto",
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: "#FC6868",
                  }}
                />
              ) : null}
              {isActive ? (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 22,
                    borderRadius: 4,
                    backgroundColor: productSemanticColors.primaryAction,
                  }}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "12px 16px" : "12px 22px",
          borderTop: `1px solid ${productSemanticColors.border}`,
          background: "transparent",
          color: productSemanticColors.textMuted,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
        }}
        aria-label={collapsed ? ruAdmin.nav.expand : ruAdmin.nav.collapse}
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed ? <span>{ruAdmin.nav.collapse}</span> : null}
      </button>
    </aside>
  );
}

function BrandLogo() {
  return (
    <div
      aria-hidden
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background:
          "linear-gradient(135deg, rgba(249,115,22,1) 0%, rgba(217,98,23,1) 100%)",
        color: "#11161D",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 800,
        letterSpacing: 0.5,
        boxShadow: "0 0 0 1px rgba(249,115,22,0.35) inset",
      }}
    >
      M
    </div>
  );
}
