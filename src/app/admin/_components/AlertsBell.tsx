"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type { AdminAlertsResponse } from "@mototwin/types";
import { ruAdmin, formatNumber } from "../_locales/ru";

export function AlertsBell() {
  const [data, setData] = useState<AdminAlertsResponse | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard/alerts", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as AdminAlertsResponse;
        if (!cancelled) setData(json);
      } catch {
        /* surfaced to the user only via empty bell state */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const total = data?.total ?? 0;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ruAdmin.topbar.notifications}
        style={triggerStyle}
      >
        <Bell size={18} aria-hidden />
        {total > 0 ? (
          <span aria-label={`${total} новых уведомлений`} style={badgeStyle}>
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>
      {open ? (
        <div style={popoverStyle}>
          <div style={popoverHeader}>{ruAdmin.alerts.title}</div>
          {!data || data.items.length === 0 ? (
            <div style={emptyStyle}>{ruAdmin.alerts.empty}</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {data.items.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={alertItemStyle}
                  >
                    <span>{ruAdmin.alerts.keys[item.key] ?? item.label}</span>
                    <span
                      style={{
                        color: productSemanticColors.primaryAction,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {formatNumber(item.count)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

const triggerStyle: React.CSSProperties = {
  position: "relative",
  width: 38,
  height: 38,
  borderRadius: radiusScale.md,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textPrimary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: -6,
  right: -6,
  minWidth: 22,
  height: 20,
  padding: "0 6px",
  borderRadius: 999,
  backgroundColor: "#FC4949",
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "20px",
  textAlign: "center",
  boxShadow: "0 0 0 2px #11161D",
};

const popoverStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: 320,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.borderStrong}`,
  borderRadius: radiusScale.md,
  boxShadow: "0 16px 32px rgba(0,0,0,0.4)",
  padding: 8,
  zIndex: 60,
};

const popoverHeader: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
};

const emptyStyle: React.CSSProperties = {
  padding: "16px 10px",
  fontSize: 13,
  color: productSemanticColors.textSecondary,
};

const alertItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: radiusScale.sm,
  color: productSemanticColors.textPrimary,
  fontSize: 13,
  textDecoration: "none",
};
