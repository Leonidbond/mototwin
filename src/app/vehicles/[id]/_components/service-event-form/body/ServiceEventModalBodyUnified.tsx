"use client";

import { useLayoutEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

export type ServiceEventModalBodyUnifiedProps = {
  /** BASIC: «Быстро»; ADVANCED: «Подробно» — extended-блоки на той же сетке. */
  isBasic: boolean;
  basicInfoCard: ReactNode;
  costCard: ReactNode;
  /** «Дополнительно» — один блок для BASIC и ADVANCED (`AdditionalCardFast`). */
  additionalCard: ReactNode;
  preliminarySummary: ReactNode;
  bundleHeader: ReactNode;
  bundleBanner: ReactNode;
  actionTypeSelect?: ReactNode;
  bundleRowsFast: ReactNode;
  bundleNodeCards: ReactNode;
  bundleAddNodeFooter: ReactNode;
  bundleSkuPanel: ReactNode;
  bundleTotalsExtended: ReactNode;
};

/**
 * Единый main-layout под референс Service-event-fast.png (~40/60 от 1024px).
 * Двухколоночная сетка задаётся inline (matchMedia + useLayoutEffect): в бандле Tailwind v4
 * сочетание `flex` + `lg:grid` на одном узле не давало `display: grid` при широком viewport.
 */
export function ServiceEventModalBodyUnified({
  isBasic,
  basicInfoCard,
  costCard,
  additionalCard,
  bundleHeader,
  bundleBanner,
  actionTypeSelect,
  bundleRowsFast,
  bundleNodeCards,
  bundleSkuPanel,
  bundleTotalsExtended,
}: ServiceEventModalBodyUnifiedProps) {
  const [layoutWide, setLayoutWide] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setLayoutWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const rootStyle: CSSProperties = {
    WebkitOverflowScrolling: "touch",
    boxSizing: "border-box",
    flex: "1 1 0%",
    minHeight: 0,
    ...(layoutWide
      ? {
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
          gap: "1.125rem",
          alignItems: "stretch",
        }
      : {
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }),
  };

  return (
    <div suppressHydrationWarning className="min-h-0 flex-1" style={rootStyle}>
      <aside
        className="relative flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto lg:max-h-none lg:pr-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {basicInfoCard}
        {costCard}
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto lg:max-h-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="flex min-h-0 w-full flex-col gap-2.5 rounded-xl border p-4"
          style={{
            backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
            borderColor: SERVICE_EVENT_PARTS_UI.border,
          }}
        >
          {bundleHeader}
          {isBasic ? (
            <>
              {bundleBanner}
              {actionTypeSelect}
              <div className="min-h-0">{bundleRowsFast}</div>
            </>
          ) : (
            <>
              <div className="flex min-h-0 flex-col">{bundleNodeCards}</div>
              {bundleSkuPanel}
              {bundleTotalsExtended}
            </>
          )}
        </div>
        {additionalCard}
      </section>
    </div>
  );
}
