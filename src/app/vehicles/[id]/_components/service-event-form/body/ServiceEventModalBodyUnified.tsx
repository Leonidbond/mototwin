"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import { useLayoutEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type ServiceEventModalBodyUnifiedProps = {
  /** BASIC: «Быстро»; ADVANCED: «Подробно» — extended-блоки на той же сетке. */
  isBasic: boolean;
  basicInfoCard: ReactNode;
  costCard: ReactNode;
  additionalCardFast: ReactNode;
  additionalCardExtended: ReactNode;
  preliminarySummary: ReactNode;
  bundleHeader: ReactNode;
  bundleBanner: ReactNode;
  actionTypeSelect?: ReactNode;
  bundleRowsFast: ReactNode;
  bundleTotalsFast: ReactNode;
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
  additionalCardFast,
  additionalCardExtended,
  preliminarySummary,
  bundleHeader,
  bundleBanner,
  actionTypeSelect,
  bundleRowsFast,
  bundleTotalsFast,
  bundleNodeCards,
  bundleAddNodeFooter,
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
        className="relative flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto lg:max-h-none lg:pr-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {basicInfoCard}
        {costCard}
        {!isBasic ? (
          <>
            {additionalCardExtended}
            <div
              className="sticky bottom-0 z-[2] mt-auto -mx-1 shrink-0 px-1 pb-1 pt-2 lg:mx-0 lg:px-0 lg:pb-0 lg:pt-1.5"
              style={{
                backgroundColor: productSemanticColors.card,
              }}
            >
              {preliminarySummary}
            </div>
          </>
        ) : null}
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto lg:max-h-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="flex min-h-0 w-full flex-col gap-2.5 rounded-xl border p-4"
          style={{
            backgroundColor: productSemanticColors.cardMuted,
            borderColor: productSemanticColors.border,
          }}
        >
          {bundleHeader}
          {isBasic ? (
            <>
              {bundleBanner}
              {actionTypeSelect}
              <div className="min-h-0">{bundleRowsFast}</div>
              {bundleTotalsFast}
            </>
          ) : (
            <>
              <div className="space-y-2.5">{bundleNodeCards}</div>
              {bundleSkuPanel}
              {bundleAddNodeFooter}
            </>
          )}
        </div>
        {!isBasic ? bundleTotalsExtended : null}
        {isBasic ? additionalCardFast : null}
      </section>
    </div>
  );
}
