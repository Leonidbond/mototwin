"use client";

import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem, VehicleDetail } from "@mototwin/types";
import { getVehicleDetailSilhouetteStaticSrc } from "@/lib/vehicle-detail-silhouette";

const SILHOUETTE_W_EXPANDED = 76;
const SILHOUETTE_H_EXPANDED = 52;
const SILHOUETTE_W_MODAL_COMPACT = 60;
const SILHOUETTE_H_MODAL_COMPACT = 40;
const SILHOUETTE_W_COLLAPSED = 40;
const SILHOUETTE_H_COLLAPSED = 28;

export type SidebarVehiclePlaqueProps = {
  vehicle: VehicleDetail;
  title: string;
  subtitle: string;
  /** Карточка мотоцикла (дашборд). В режиме `modalPicker` не используется. */
  href: string;
  collapsed: boolean;
  vehicles: GarageVehicleItem[];
  currentVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  /**
   * `modalPicker` — клик по плашке только открывает список мото из гаража (без ссылок на дашборд).
   * Выпадающий список ренерится в `document.body`, чтобы не обрезался модалками с overflow.
   */
  variant?: "default" | "modalPicker";
  /** Растянуть плашку на высоту ячейки грида (одинаковая высота с соседними колонками). */
  fillGridCellHeight?: boolean;
  /** Компактная высота (ряд контекста в модалке «добавить деталь»). */
  compactTile?: boolean;
};

function labelForGarageVehicle(v: GarageVehicleItem): string {
  return (
    v.nickname?.trim() ||
    `${v.motorcycleBrand.name} ${v.motorcycleModelFamily.name}`.trim()
  );
}

/**
 * Контекст мотоцикла над меню: силуэт, ссылка на ТС, выбор другого мотоцикла из гаража.
 */
export function SidebarVehiclePlaque({
  vehicle,
  title,
  subtitle,
  href,
  collapsed,
  vehicles,
  currentVehicleId,
  onSelectVehicle,
  variant = "default",
  fillGridCellHeight = false,
  compactTile = false,
}: SidebarVehiclePlaqueProps) {
  const isModalPicker = variant === "modalPicker";
  const src = getVehicleDetailSilhouetteStaticSrc(vehicle);
  const fullTitle = `${title} — ${subtitle}`.trim();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      const t = e.target as Node;
      if (isModalPicker && (e.target as HTMLElement).closest?.("[data-mt-sidebar-vehicle-dropdown]")) {
        return;
      }
      if (el && !el.contains(t)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, isModalPicker]);

  useLayoutEffect(() => {
    if (!open || !isModalPicker) {
      setAnchorRect(null);
      return;
    }
    const measure = () => {
      const el = rootRef.current;
      if (el) {
        setAnchorRect(el.getBoundingClientRect());
      }
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, isModalPicker]);

  const canPick = vehicles.length > 1;
  const menuOpenableModal = isModalPicker && vehicles.length > 0;

  const onPick = useCallback(
    (id: string) => {
      if (id !== currentVehicleId) {
        onSelectVehicle(id);
      }
      close();
    },
    [close, currentVehicleId, onSelectVehicle]
  );

  const dropdownItems = vehicles.map((v) => {
    const active = v.id === currentVehicleId;
    return (
      <li key={v.id} role="option" aria-selected={active}>
        <button
          type="button"
          onClick={() => onPick(v.id)}
          style={{
            ...dropdownRowStyle,
            backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
            color: productSemanticColors.textPrimary,
          }}
        >
          {labelForGarageVehicle(v)}
        </button>
      </li>
    );
  });

  if (collapsed) {
    return (
      <div ref={rootRef} style={{ position: "relative" }}>
        {canPick ? (
          <>
            <select
              aria-label="Выбрать мотоцикл"
              title={fullTitle}
              value={currentVehicleId}
              onChange={(e) => onPick(e.target.value)}
              style={collapsedSelectOverlayStyle}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {labelForGarageVehicle(v)}
                </option>
              ))}
            </select>
            <div style={collapsedLinkStyle} aria-hidden>
              <SilhouetteImg src={src} width={SILHOUETTE_W_COLLAPSED} height={SILHOUETTE_H_COLLAPSED} />
            </div>
          </>
        ) : (
          <Link
            href={href}
            className="no-underline"
            title={fullTitle}
            aria-label={fullTitle}
            style={collapsedLinkStyle}
          >
            <SilhouetteImg src={src} width={SILHOUETTE_W_COLLAPSED} height={SILHOUETTE_H_COLLAPSED} />
          </Link>
        )}
      </div>
    );
  }

  if (isModalPicker) {
    const siloW = compactTile ? SILHOUETTE_W_MODAL_COMPACT : SILHOUETTE_W_EXPANDED;
    const siloH = compactTile ? SILHOUETTE_H_MODAL_COMPACT : SILHOUETTE_H_EXPANDED;
    let rowStyle: CSSProperties = expandedRowStyle;
    if (fillGridCellHeight) {
      rowStyle = { ...expandedRowStyle, alignItems: "flex-start", flex: 1, minHeight: 0 };
    }
    if (compactTile) {
      rowStyle = { ...rowStyle, gap: 6 };
    }
    const rootStyle: CSSProperties = fillGridCellHeight
      ? { position: "relative", alignSelf: "stretch", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }
      : { position: "relative" };
    const buttonStyle: CSSProperties = {
      ...expandedCardStyle,
      ...modalPickerPlaqueButtonReset,
      width: "100%",
      cursor: menuOpenableModal ? "pointer" : "default",
      opacity: menuOpenableModal ? 1 : 0.65,
      ...(compactTile ? { padding: "6px 8px" } : {}),
      ...(fillGridCellHeight
        ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
        : {}),
    };
    const titleStyleResolved: CSSProperties =
      fillGridCellHeight && compactTile
        ? {
            ...titleStyle,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            textOverflow: "clip",
            fontSize: 12,
          }
        : fillGridCellHeight
          ? { ...titleStyle, whiteSpace: "normal", overflowWrap: "anywhere", textOverflow: "clip" }
          : titleStyle;
    const subtitleStyleResolved: CSSProperties =
      fillGridCellHeight && compactTile
        ? {
            ...subtitleStyle,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            textOverflow: "clip",
            fontSize: 10,
            marginTop: 1,
          }
        : fillGridCellHeight
          ? { ...subtitleStyle, whiteSpace: "normal", overflowWrap: "anywhere", textOverflow: "clip" }
          : subtitleStyle;
    const chevronSpanStyle: CSSProperties = compactTile
      ? { ...chevronButtonStyle, pointerEvents: "none", width: 26, height: 28 }
      : { ...chevronButtonStyle, pointerEvents: "none" };

    return (
      <div ref={rootRef} style={rootStyle}>
        <button
          type="button"
          disabled={!menuOpenableModal}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Выбрать мотоцикл из гаража"
          onClick={() => menuOpenableModal && setOpen((o) => !o)}
          style={buttonStyle}
        >
          <div style={rowStyle}>
            <div style={silhouetteLinkStyle} aria-hidden>
              <SilhouetteImg src={src} width={siloW} height={siloH} />
            </div>
            <div style={{ ...textBlockStyle, minWidth: 0, flex: 1 }} title={fullTitle}>
              <div style={titleStyleResolved}>{title}</div>
              <div style={subtitleStyleResolved}>{subtitle}</div>
            </div>
            {menuOpenableModal ? (
              <span style={chevronSpanStyle} aria-hidden>
                <ChevronDown open={open} />
              </span>
            ) : null}
          </div>
        </button>
        {open && menuOpenableModal && anchorRect && typeof document !== "undefined"
          ? createPortal(
              <ul
                role="listbox"
                data-mt-sidebar-vehicle-dropdown
                style={{
                  ...dropdownStyle,
                  position: "fixed",
                  top: anchorRect.bottom + 6,
                  left: anchorRect.left,
                  width: anchorRect.width,
                  right: "auto",
                  zIndex: 120,
                }}
              >
                {dropdownItems}
              </ul>,
              document.body
            )
          : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div style={expandedCardStyle}>
        <div style={expandedRowStyle}>
          <Link href={href} className="no-underline" style={silhouetteLinkStyle} title="Открыть мотоцикл">
            <SilhouetteImg src={src} width={SILHOUETTE_W_EXPANDED} height={SILHOUETTE_H_EXPANDED} />
          </Link>
          <Link href={href} className="no-underline" style={{ ...textBlockStyle, minWidth: 0, flex: 1 }} title={fullTitle}>
            <div style={titleStyle}>{title}</div>
            <div style={subtitleStyle}>{subtitle}</div>
          </Link>
          {canPick ? (
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label="Выбрать другой мотоцикл"
              onClick={() => setOpen((o) => !o)}
              style={chevronButtonStyle}
            >
              <ChevronDown open={open} />
            </button>
          ) : null}
        </div>
      </div>
      {open && canPick ? <ul role="listbox" style={dropdownStyle}>{dropdownItems}</ul> : null}
    </div>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={productSemanticColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SilhouetteImg(props: { src: StaticImageData; width: number; height: number }) {
  return (
    <Image
      src={props.src}
      alt=""
      width={props.src.width}
      height={props.src.height}
      sizes={`${props.width}px`}
      style={{
        width: "auto",
        height: "auto",
        maxWidth: props.width,
        maxHeight: props.height,
        objectFit: "contain",
        opacity: 0.94,
        display: "block",
      }}
    />
  );
}

const collapsedSelectOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
  zIndex: 2,
  fontSize: 16,
};

const collapsedLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 4px",
  borderRadius: 12,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: "rgba(255,255,255,0.03)",
};

const expandedCardStyle: CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: "10px 10px",
  color: productSemanticColors.textPrimary,
};

const modalPickerPlaqueButtonReset: CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  margin: 0,
  textAlign: "left",
  font: "inherit",
  boxSizing: "border-box",
};

const expandedRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const silhouetteLinkStyle: CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "inherit",
};

const textBlockStyle: CSSProperties = {
  color: "inherit",
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: -0.1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const subtitleStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  fontWeight: 500,
  color: productSemanticColors.textMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chevronButtonStyle: CSSProperties = {
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 36,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  cursor: "pointer",
  color: productSemanticColors.textMuted,
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "calc(100% + 6px)",
  margin: 0,
  padding: 6,
  listStyle: "none",
  borderRadius: 12,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: "#0B1018",
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  maxHeight: 280,
  overflowY: "auto",
  zIndex: 50,
};

const dropdownRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
