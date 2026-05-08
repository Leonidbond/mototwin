"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues } from "@mototwin/types";
import { FIELD_IN_STACK, FOCUS_RING, LABEL_STYLE, SECTION_CARD_STYLE, sectionTitleStyle } from "../styles";
import { currencySuffix } from "../utils";

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
  const suffix = currencySuffix(form.currency);
  const costInfoTitle =
    "В быстром режиме укажите общую стоимость деталей и работы; в подробном режиме итог по узлам складывается отдельно.";

  return (
    <div style={SECTION_CARD_STYLE}>
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1" style={sectionTitleStyle()}>
          {`${sectionNumber}. Стоимость`}
        </h3>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full border text-[11px] font-bold leading-none outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            borderColor: productSemanticColors.border,
            color: productSemanticColors.textMuted,
            backgroundColor: productSemanticColors.cardMuted,
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
            {`Детали, ${suffix}`}
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
            {`Работа, ${suffix}`}
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
        className="mt-3 flex items-center justify-between gap-4 rounded-xl px-4 py-2.5"
        style={{
          backgroundColor: productSemanticColors.cardSubtle,
          borderTop: `2px solid ${productSemanticColors.primaryAction}`,
        }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: productSemanticColors.textPrimary }}
        >
          Итого
        </span>
        <span
          className="text-2xl font-bold tabular-nums tracking-tight"
          style={{ color: productSemanticColors.primaryAction }}
        >
          {totalLabel}
        </span>
      </div>
    </div>
  );
}
