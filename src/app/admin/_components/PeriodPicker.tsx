"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type { AdminPeriodKey } from "@mototwin/types";
import { ruAdmin } from "../_locales/ru";

const PERIOD_OPTIONS: AdminPeriodKey[] = ["1d", "7d", "14d", "30d", "90d"];
const DEFAULT_PERIOD: AdminPeriodKey = "7d";

export function getActivePeriod(searchParams: URLSearchParams | undefined): AdminPeriodKey {
  const value = searchParams?.get("period");
  return PERIOD_OPTIONS.includes(value as AdminPeriodKey)
    ? (value as AdminPeriodKey)
    : DEFAULT_PERIOD;
}

export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname() || "/admin";
  const searchParams = useSearchParams();
  const active = getActivePeriod(searchParams ?? undefined);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const select = (next: AdminPeriodKey) => {
    setOpen(false);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (next === DEFAULT_PERIOD) params.delete("period");
    else params.set("period", next);
    const search = params.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}`);
    router.refresh();
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Calendar size={14} aria-hidden style={{ color: productSemanticColors.textMuted }} />
        <span>{ruAdmin.dashboard.period[active]}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <ul role="listbox" style={menuStyle}>
          {PERIOD_OPTIONS.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => select(option)}
                style={{
                  ...optionStyle,
                  color:
                    option === active
                      ? productSemanticColors.primaryAction
                      : productSemanticColors.textPrimary,
                  fontWeight: option === active ? 600 : 500,
                }}
              >
                {ruAdmin.dashboard.period[option]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 36,
  padding: "0 12px",
  borderRadius: radiusScale.md,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: 160,
  margin: 0,
  padding: 6,
  listStyle: "none",
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.borderStrong}`,
  borderRadius: radiusScale.md,
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  zIndex: 60,
};

const optionStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  background: "transparent",
  border: "none",
  borderRadius: radiusScale.sm,
  textAlign: "left",
  cursor: "pointer",
  fontSize: 13,
};
