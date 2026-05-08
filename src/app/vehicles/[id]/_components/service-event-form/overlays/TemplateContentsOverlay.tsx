"use client";

import { getServiceActionTypeLabelRu } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { ServiceBundleTemplateWire } from "@mototwin/types";

export type TemplateContentsOverlayProps = {
  open: boolean;
  template: ServiceBundleTemplateWire | null;
  onClose: () => void;
};

export function TemplateContentsOverlay({ open, template, onClose }: TemplateContentsOverlayProps) {
  if (!open || !template) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ backgroundColor: productSemanticColors.overlayModal }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-5 shadow-2xl"
        style={{
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textPrimary,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Состав шаблона сервисного события"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Состав шаблона</h3>
            <p className="mt-1 text-sm" style={{ color: productSemanticColors.textSecondary }}>
              {template.title}
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90"
            style={{ borderColor: productSemanticColors.border, color: productSemanticColors.textPrimary }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ul className="mt-4 max-h-[min(360px,50vh)] space-y-2 overflow-y-auto text-sm">
          {[...template.items]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((it) => {
              const nodeLabel =
                it.node?.name?.trim() ||
                [it.node?.code, it.nodeId].filter(Boolean).join(" · ") ||
                it.nodeId;
              return (
                <li
                  key={it.id}
                  className="rounded-xl border px-3 py-2"
                  style={{
                    borderColor: productSemanticColors.border,
                    backgroundColor: productSemanticColors.cardMuted,
                  }}
                >
                  <div className="font-medium">{nodeLabel}</div>
                  <div className="mt-0.5 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    {getServiceActionTypeLabelRu(it.defaultActionType)}
                    {it.isRequired ? " · обязательный узел" : ""}
                  </div>
                </li>
              );
            })}
        </ul>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition hover:opacity-90"
            style={{
              backgroundColor: productSemanticColors.primaryAction,
              color: productSemanticColors.onPrimaryAction,
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
