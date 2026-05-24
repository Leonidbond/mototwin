import type { CSSProperties } from "react";
import type { AdminWorkQueueStatusKey, AdminSupportLevel } from "@mototwin/types";
import { ruAdmin } from "../../_locales/ru";

type ChipPaint = { fg: string; bg: string; border: string };

const STATUS_PAINT: Record<AdminWorkQueueStatusKey, ChipPaint> = {
  "safety-critical": { fg: "#FCA5A5", bg: "rgba(248,113,113,0.14)", border: "rgba(248,113,113,0.32)" },
  pending: { fg: "#FBBF24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.28)" },
  "mixed-reports": { fg: "#93C5FD", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.30)" },
  "low-confidence": { fg: "#FDE68A", bg: "rgba(253,230,138,0.10)", border: "rgba(253,230,138,0.28)" },
  verified: { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)", border: "rgba(34,197,94,0.30)" },
  community: { fg: "#A5B4FC", bg: "rgba(99,102,241,0.16)", border: "rgba(99,102,241,0.32)" },
  rejected: { fg: "#F87171", bg: "rgba(248,113,113,0.14)", border: "rgba(248,113,113,0.30)" },
};

const SUPPORT_PAINT: Record<AdminSupportLevel, ChipPaint> = {
  MVP_CORE: { fg: "#86EFAC", bg: "rgba(34,197,94,0.14)", border: "rgba(34,197,94,0.30)" },
  MVP_CORE_LEGACY: { fg: "#FACC15", bg: "rgba(250,204,21,0.16)", border: "rgba(250,204,21,0.32)" },
  COMMUNITY_SUPPORT: { fg: "#A5B4FC", bg: "rgba(99,102,241,0.16)", border: "rgba(99,102,241,0.32)" },
  EARLY_BETA: { fg: "#FBBF24", bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.32)" },
  NO_FITMENT_DATA_YET: { fg: "#94A3B8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.22)" },
};

interface StatusChipProps {
  paint: ChipPaint;
  children: React.ReactNode;
}

function chipStyle(paint: ChipPaint): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 22,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: paint.fg,
    backgroundColor: paint.bg,
    border: `1px solid ${paint.border}`,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
  };
}

function StatusChip({ paint, children }: StatusChipProps) {
  return <span style={chipStyle(paint)}>{children}</span>;
}

export function WorkQueueStatusChip({ statusKey }: { statusKey: AdminWorkQueueStatusKey }) {
  const paint = STATUS_PAINT[statusKey] ?? STATUS_PAINT.pending;
  return <StatusChip paint={paint}>{ruAdmin.status[statusKey] ?? statusKey}</StatusChip>;
}

export function SupportLevelChip({ level }: { level: AdminSupportLevel }) {
  const paint = SUPPORT_PAINT[level] ?? SUPPORT_PAINT.NO_FITMENT_DATA_YET;
  return <StatusChip paint={paint}>{ruAdmin.support[level] ?? level}</StatusChip>;
}
