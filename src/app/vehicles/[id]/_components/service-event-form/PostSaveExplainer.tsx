"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { ReactNode } from "react";

const ITEMS: Array<{ icon: ReactNode; title: string; subtitle: string }> = [
  {
    title: "Обновим состояние выбранных узлов",
    subtitle: "Статусы узлов будут пересчитаны по пробегу и регламенту.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 12.5l2.6 2.6 5.4-5.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Пересчитаем регламенты и напоминания",
    subtitle: "Сроки следующего обслуживания будут обновлены для выбранных узлов.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Добавим событие в журнал обслуживания",
    subtitle: "Событие появится в истории с деталями и стоимостью.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 6h14M5 12h14M5 18h14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function PostSaveExplainer() {
  return (
    <div className="w-full">
      <p
        className="text-[13px] font-semibold tracking-tight"
        style={{ color: productSemanticColors.textPrimary }}
      >
        Что будет после сохранения
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: productSemanticColors.cardMuted,
            }}
          >
            <span
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: productSemanticColors.cardSubtle,
                color: productSemanticColors.textSecondary,
              }}
              aria-hidden
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold leading-tight"
                style={{ color: productSemanticColors.textPrimary }}
              >
                {item.title}
              </p>
              <p
                className="mt-1 text-[11px] leading-snug"
                style={{ color: productSemanticColors.textSecondary }}
              >
                {item.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
