"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createMotoTwinEndpoints } from "@mototwin/api-client";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { formatRideStyleChipRu, vehicleDetailFromApiRecord } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem, VehicleDetail, VehicleDetailApiRecord } from "@mototwin/types";
import { Button } from "@/components/ui";
import { SidebarVehiclePlaque } from "./SidebarVehiclePlaque";

type NavIconKind =
  | "home"
  | "nodes"
  | "journal"
  | "expenses"
  | "details";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKind;
  isActive: boolean;
};

const LAST_VIEWED_VEHICLE_ID_STORAGE_KEY = "mototwin.lastViewedVehicleId";

/** Если мотоцикл ещё не выбран — ведём в гараж (страниц `/vehicles`, `/service-log`, `/details` нет). */
const NAV_FALLBACK_HREF = "/garage";

const sidebarVehicleApi = createWebApiClient();

function formatSidebarUserLabel(displayName: string | null | undefined, email: string): string {
  const trimmed = displayName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const lastInitial = parts[parts.length - 1]!.charAt(0).toUpperCase();
      return `${parts[0]} ${lastInitial}.`;
    }
    return trimmed;
  }
  const local = email.split("@")[0]?.trim();
  return local || "Пользователь";
}

function formatPlanLabelRu(planType: "FREE" | "PRO"): string {
  return planType === "PRO" ? "Pro тариф" : "Free тариф";
}

function userAvatarInitial(displayName: string | null | undefined, email: string): string {
  const source = displayName?.trim() || email.trim();
  const letter = source.charAt(0).toUpperCase();
  return letter || "?";
}

function formatKmRu(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function getVehicleIdFromPathname(pathname: string): string | null {
  const matched = /^\/vehicles\/([^/]+)/.exec(pathname);
  if (!matched?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(matched[1]);
  } catch {
    return matched[1];
  }
}

/** Хвост пути после `/vehicles/:id` (например `/nodes`), пустая строка — дашборд мотоцикла. */
function getVehicleRelativePath(pathname: string): string {
  const m = /^\/vehicles\/[^/]+(\/.*)?$/.exec(pathname);
  if (!m) {
    return "";
  }
  return m[1] ?? "";
}

export function GarageSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathVehicleId = useMemo(() => getVehicleIdFromPathname(pathname), [pathname]);
  const [contextVehicleId, setContextVehicleId] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- контекст ТС из URL и localStorage для href навигации */
  useLayoutEffect(() => {
    if (pathVehicleId) {
      setContextVehicleId(pathVehicleId);
      try {
        localStorage.setItem(LAST_VIEWED_VEHICLE_ID_STORAGE_KEY, pathVehicleId);
      } catch {
        // Ignore local storage write failures.
      }
      return;
    }
    try {
      const stored = localStorage.getItem(LAST_VIEWED_VEHICLE_ID_STORAGE_KEY)?.trim();
      setContextVehicleId(stored || null);
    } catch {
      setContextVehicleId(null);
    }
  }, [pathVehicleId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const vehicleBaseHref = contextVehicleId ? `/vehicles/${encodeURIComponent(contextVehicleId)}` : null;
  const pathBaseHref = pathVehicleId ? `/vehicles/${encodeURIComponent(pathVehicleId)}` : null;

  const [sessionUser, setSessionUser] = useState<{
    label: string;
    planLabel: string;
    avatarInitial: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void sidebarVehicleApi
      .getAuthMe()
      .then((me) => {
        if (cancelled) {
          return;
        }
        const email = me.user.email;
        setSessionUser({
          label: formatSidebarUserLabel(me.user.displayName, email),
          planLabel: formatPlanLabelRu(me.planType),
          avatarInitial: userAvatarInitial(me.user.displayName, email),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSessionUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    void sidebarVehicleApi.getGarageVehicles().then((res) => {
      if (!cancelled) {
        setGarageVehicles(res.vehicles ?? []);
      }
    }).catch(() => {
      if (!cancelled) {
        setGarageVehicles([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectVehicle = useCallback(
    (newId: string) => {
      if (!newId.trim() || newId === contextVehicleId) {
        return;
      }
      try {
        localStorage.setItem(LAST_VIEWED_VEHICLE_ID_STORAGE_KEY, newId);
      } catch {
        // Ignore local storage write failures.
      }
      setContextVehicleId(newId);
      const tail = getVehicleRelativePath(pathname);
      router.push(`/vehicles/${encodeURIComponent(newId)}${tail}`);
    },
    [contextVehicleId, pathname, router]
  );

  const [sidebarVehicle, setSidebarVehicle] = useState<VehicleDetail | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- загрузка карточки ТС для плашки сайдбара */
  useEffect(() => {
    if (!contextVehicleId) {
      setSidebarVehicle(null);
      return;
    }
    let cancelled = false;
    void sidebarVehicleApi.getVehicleDetail(contextVehicleId).then((data) => {
      if (cancelled) {
        return;
      }
      const raw = data.vehicle as unknown as VehicleDetailApiRecord | null;
      setSidebarVehicle(raw ? vehicleDetailFromApiRecord(raw) : null);
    }).catch(() => {
      if (!cancelled) {
        setSidebarVehicle(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contextVehicleId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sidebarVehicleLabel = useMemo(
    () =>
      sidebarVehicle
        ? sidebarVehicle.nickname?.trim() ||
          `${sidebarVehicle.brandName} ${sidebarVehicle.modelFamilyName}`.trim()
        : "",
    [sidebarVehicle]
  );

  const sidebarVehicleSubtitle = useMemo(
    () =>
      sidebarVehicle
        ? `${sidebarVehicle.year} · ${formatKmRu(sidebarVehicle.odometer)} км${
            formatRideStyleChipRu(sidebarVehicle.rideProfile)
              ? ` · ${formatRideStyleChipRu(sidebarVehicle.rideProfile)}`
              : ""
          }`
        : "",
    [sidebarVehicle]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        href: "/garage",
        label: "Мой гараж",
        icon: "home",
        isActive: pathname === "/garage",
      },
      {
        href: vehicleBaseHref ? `${vehicleBaseHref}/nodes` : NAV_FALLBACK_HREF,
        label: "Узлы",
        icon: "nodes",
        isActive: Boolean(pathBaseHref) && pathname.startsWith(`${pathBaseHref}/nodes`),
      },
      {
        href: vehicleBaseHref ? `${vehicleBaseHref}/service-log` : NAV_FALLBACK_HREF,
        label: "Журнал",
        icon: "journal",
        isActive: Boolean(pathBaseHref) && pathname.startsWith(`${pathBaseHref}/service-log`),
      },
      {
        href: vehicleBaseHref ? `${vehicleBaseHref}/expenses` : NAV_FALLBACK_HREF,
        label: "Расходы",
        icon: "expenses",
        isActive: Boolean(pathBaseHref) && pathname.startsWith(`${pathBaseHref}/expenses`),
      },
      {
        href: vehicleBaseHref ? `${vehicleBaseHref}/parts` : NAV_FALLBACK_HREF,
        label: "Подбор деталей",
        icon: "details",
        isActive: Boolean(pathBaseHref) && pathname.startsWith(`${pathBaseHref}/parts`),
      },
    ],
    [pathname, vehicleBaseHref, pathBaseHref]
  );

  return (
    <aside style={{ ...asideStyle, padding: collapsed ? "14px 7px" : "18px 14px" }}>
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
            marginBottom: 22,
            minHeight: 42,
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
              opacity: 0.72,
            }}
          >
            <ChevronIcon direction={collapsed ? "right" : "left"} />
          </button>
        </div>
        {sidebarVehicle && vehicleBaseHref && contextVehicleId ? (
          <div style={{ marginBottom: collapsed ? 10 : 14, marginTop: collapsed ? 4 : 0 }}>
            <SidebarVehiclePlaque
              vehicle={sidebarVehicle}
              collapsed={collapsed}
              title={sidebarVehicleLabel}
              subtitle={sidebarVehicleSubtitle}
              href={vehicleBaseHref}
              vehicles={garageVehicles}
              currentVehicleId={contextVehicleId}
              onSelectVehicle={handleSelectVehicle}
            />
          </div>
        ) : null}
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {navItems.map((item) => (
            <NavLink key={item.label} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!collapsed ? (
          <div style={proCardStyle}>
            <div style={proTitleStyle}>
              <span style={{ color: productSemanticColors.textPrimary }}>MOTOTWIN</span>{" "}
              <span>PRO</span>
            </div>
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
          title={
            collapsed && sessionUser
              ? `${sessionUser.label} · ${sessionUser.planLabel}`
              : undefined
          }
        >
          <span style={avatarStyle}>{sessionUser?.avatarInitial ?? "…"}</span>
          {!collapsed ? (
            <div style={{ minWidth: 0 }}>
              <div style={userNameStyle}>{sessionUser?.label ?? "…"}</div>
              <div style={userPlanStyle}>{sessionUser?.planLabel ?? "…"}</div>
            </div>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const isActive = item.isActive;
  const color = isActive ? productSemanticColors.textPrimary : productSemanticColors.textMuted;
  const accent = isActive ? productSemanticColors.primaryAction : color;
  return (
    <Link
      href={item.href}
      className="no-underline"
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 10,
        minHeight: 42,
        padding: collapsed ? "9px 0" : "9px 10px 9px 12px",
        borderRadius: 0,
        color,
        backgroundColor: isActive ? "rgba(255,255,255,0.055)" : "transparent",
        border: `1px solid ${isActive ? "rgba(255,255,255,0.055)" : "transparent"}`,
        borderLeft: `3px solid ${isActive ? productSemanticColors.primaryAction : "transparent"}`,
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        letterSpacing: -0.1,
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
  }
}

const asideStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: "100vh",
  padding: 16,
  borderRight: `1px solid ${productSemanticColors.border}`,
  backgroundColor: "#070B10",
  gap: 24,
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
  letterSpacing: 1,
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
  background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))",
};

const proTitleStyle: CSSProperties = {
  color: productSemanticColors.primaryAction,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.5,
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
