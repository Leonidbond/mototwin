"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type { AdminSearchResponse } from "@mototwin/types";
import { ruAdmin } from "../_locales/ru";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 200;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminSearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const meta = isMac ? event.metaKey : event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `/api/admin/search?q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as AdminSearchResponse;
        setData(json);
        setActiveIndex(0);
      } catch {
        /* aborted */
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const flatHits = data?.groups.flatMap((g) => g.hits) ?? [];

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const onInputKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatHits.length - 1)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = flatHits[activeIndex];
      if (target) navigateTo(target.href);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={triggerStyle}
        aria-label={ruAdmin.search.title}
      >
        <Search size={15} aria-hidden style={{ color: productSemanticColors.textMuted }} />
        <span style={{ flex: 1, textAlign: "left", color: productSemanticColors.textMuted }}>
          {ruAdmin.topbar.searchPlaceholder}
        </span>
        <kbd style={kbdStyle}>{ruAdmin.topbar.searchHint}</kbd>
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" style={overlayStyle} onClick={() => setOpen(false)}>
          <div onClick={(event) => event.stopPropagation()} style={paletteStyle}>
            <div style={inputWrapStyle}>
              <Search size={18} aria-hidden style={{ color: productSemanticColors.textMuted }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKey}
                placeholder={ruAdmin.search.placeholder}
                style={inputStyle}
              />
            </div>
            <div style={resultsStyle}>
              {!data || flatHits.length === 0 ? (
                <div style={emptyStyle}>
                  {query.trim().length < MIN_QUERY_LENGTH
                    ? ruAdmin.search.placeholder
                    : ruAdmin.search.empty}
                </div>
              ) : (
                data.groups
                  .filter((group) => group.hits.length > 0)
                  .map((group) => (
                    <div key={group.kind}>
                      <div style={groupHeader}>
                        {ruAdmin.search.groups[group.kind] ?? group.label}
                      </div>
                      {group.hits.map((hit) => {
                        const flatIndex = flatHits.findIndex((h) => h.id === hit.id && h.kind === hit.kind);
                        const isActive = flatIndex === activeIndex;
                        return (
                          <button
                            key={`${group.kind}-${hit.id}`}
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            onClick={() => navigateTo(hit.href)}
                            style={{
                              ...hitStyle,
                              backgroundColor: isActive
                                ? productSemanticColors.cardMuted
                                : "transparent",
                              borderColor: isActive
                                ? productSemanticColors.borderStrong
                                : "transparent",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: productSemanticColors.textPrimary,
                              }}
                            >
                              {hit.title}
                            </div>
                            {hit.subtitle ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: productSemanticColors.textMuted,
                                  marginTop: 2,
                                }}
                              >
                                {hit.subtitle}
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: 480,
  maxWidth: "100%",
  height: 38,
  padding: "0 14px",
  borderRadius: radiusScale.md,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textMuted,
  cursor: "pointer",
  fontSize: 13,
};

const kbdStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 8px",
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
  color: productSemanticColors.textSecondary,
  fontSize: 11,
  fontFamily: "var(--font-mono), monospace",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: 96,
  zIndex: 100,
};

const paletteStyle: React.CSSProperties = {
  width: 640,
  maxWidth: "calc(100vw - 32px)",
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.borderStrong}`,
  borderRadius: radiusScale.lg,
  boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
  overflow: "hidden",
};

const inputWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 16,
  color: productSemanticColors.textPrimary,
};

const resultsStyle: React.CSSProperties = {
  maxHeight: 460,
  overflowY: "auto",
  padding: 6,
};

const groupHeader: React.CSSProperties = {
  padding: "10px 12px 6px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
};

const hitStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: radiusScale.sm,
  border: "1px solid transparent",
  cursor: "pointer",
  background: "transparent",
};

const emptyStyle: React.CSSProperties = {
  padding: "32px 16px",
  textAlign: "center",
  color: productSemanticColors.textMuted,
  fontSize: 13,
};
