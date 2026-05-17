"use client";

import { type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "./icons";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface AdminFilterField {
  key: string;
  label: string;
  /** Static select options. Leave null for free-text search field. */
  options?: { value: string; label: string }[];
  /** When true, renders a search input rather than a select. */
  search?: boolean;
  placeholder?: string;
}

interface AdminFilterBarProps {
  fields: AdminFilterField[];
  rightSlot?: ReactNode;
}

/**
 * URL-driven filter bar — every change is mirrored to the page's
 * `searchParams`, allowing server components to render filtered results.
 */
export function AdminFilterBar({ fields, rightSlot }: AdminFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/admin";
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

  const setParam = (key: string, value: string) => {
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("cursor");
    const search = params.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}`);
  };

  return (
    <div style={containerStyle}>
      <div style={fieldsStyle}>
        {fields.map((field) => {
          const value = params.get(field.key) ?? "";
          if (field.search) {
            return (
              <label key={field.key} style={inputWrapStyle}>
                <Search size={14} aria-hidden style={{ color: productSemanticColors.textMuted }} />
                <input
                  defaultValue={value}
                  placeholder={field.placeholder ?? field.label}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setParam(field.key, (event.target as HTMLInputElement).value.trim());
                    }
                  }}
                  onBlur={(event) => setParam(field.key, event.target.value.trim())}
                  style={inputStyle}
                />
              </label>
            );
          }
          return (
            <label key={field.key} style={selectWrapStyle}>
              <span style={{ fontSize: 11, color: productSemanticColors.textMuted, fontWeight: 500 }}>
                {field.label}
              </span>
              <select
                value={value || "all"}
                onChange={(event) => setParam(field.key, event.target.value)}
                style={selectStyle}
              >
                <option value="all">— Все —</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      {rightSlot ? <div>{rightSlot}</div> : null}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "12px 14px",
  borderRadius: radiusScale.md,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
};

const fieldsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  flex: 1,
  minWidth: 0,
};

const inputWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 34,
  padding: "0 10px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  minWidth: 220,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
};

const selectWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 160,
};

const selectStyle: React.CSSProperties = {
  height: 34,
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  padding: "0 10px",
  fontSize: 13,
};
