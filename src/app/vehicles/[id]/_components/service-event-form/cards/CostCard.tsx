"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues } from "@mototwin/types";
import {
  FIELD_IN_STACK,
  FOCUS_RING,
  LABEL_STYLE,
  SECTION_CARD_STYLE,
  SERVICE_EVENT_PARTS_UI,
  sectionTitleStyle,
} from "../styles";

export type CostCardProps = {
  sectionNumber: number;
  form: AddServiceEventFormValues;
  isEditing: boolean;
  totalLabel: string;
  isAdvanced: boolean;
  onPatch: (patch: Partial<AddServiceEventFormValues>) => void;
  /** Optional hint text below header for ADVANCED mode. */
  showAdvancedHint?: boolean;
};

export function CostCard({
  sectionNumber,
  form,
  totalLabel,
  isAdvanced,
  onPatch,
  showAdvancedHint = true,
}: CostCardProps) {
  const costInfoTitle =
    "В быстром режиме укажите общую стоимость деталей и работы; в подробном режиме итог по узлам складывается отдельно.";

  return (
    <div style={SECTION_CARD_STYLE}>
      <div className="flex flex-wrap items-start gap-3">
        <h3 className="min-w-0 flex-1" style={sectionTitleStyle()}>
          {`${sectionNumber}. Стоимость`}
        </h3>
        <label className="flex shrink-0 items-center gap-2 text-[11px] font-medium" style={LABEL_STYLE}>
          Валюта
          <select
            value={form.currency.trim().toUpperCase() || "RUB"}
            onChange={(e) => onPatch({ currency: e.target.value })}
            className={FOCUS_RING}
            style={{
              ...FIELD_IN_STACK,
              width: "8rem",
              minHeight: 28,
              padding: "5px 9px",
              fontSize: "0.75rem",
              colorScheme: "dark",
            }}
          >
            <option value="RUB">Рубли</option>
            <option value="USD">Доллары</option>
            <option value="EUR">Евро</option>
          </select>
        </label>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full border text-[11px] font-bold leading-none outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.border,
            color: SERVICE_EVENT_PARTS_UI.textMuted,
            backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          }}
          title={costInfoTitle}
          aria-label={costInfoTitle}
        >
          i
        </button>
      </div>
      {isAdvanced && showAdvancedHint ? (
        <p
          className="mt-2 text-[11px] leading-snug"
          style={{ color: productSemanticColors.textMuted }}
        >
          В подробном режиме итог считается из узлов; верхние поля прибавляются сверху.
        </p>
      ) : null}
      <div
        className="mt-3"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.5rem" }}
      >
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Детали
          </span>
          <input
            value={form.partsCost}
            onChange={(e) => onPatch({ partsCost: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            style={FIELD_IN_STACK}
            className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium leading-none" style={LABEL_STYLE}>
            Работа
          </span>
          <input
            value={form.laborCost}
            onChange={(e) => onPatch({ laborCost: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            style={FIELD_IN_STACK}
            className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
          />
        </label>
      </div>
      <div
        className="mt-3 flex items-center justify-between gap-4 rounded-xl px-4 py-3"
        style={{
          backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          border: `1px solid ${SERVICE_EVENT_PARTS_UI.orange}`,
        }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: SERVICE_EVENT_PARTS_UI.text }}
        >
          Итого
        </span>
        <span
          className="text-lg font-bold tabular-nums tracking-tight"
          style={{ color: SERVICE_EVENT_PARTS_UI.orange }}
        >
          {totalLabel}
        </span>
      </div>
    </div>
  );
}
