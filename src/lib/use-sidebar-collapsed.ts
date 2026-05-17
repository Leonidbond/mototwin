"use client";

import { useCallback, useState } from "react";
import { useIsNarrow } from "./use-is-narrow";

function readUserCollapsedFromStorage(storageKey?: string): boolean {
  if (!storageKey || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

/**
 * Управляет состоянием свёрнутости `GarageSidebar` единым для всего приложения образом:
 *
 * - На узком viewport (`useIsNarrow`, по умолчанию ≤ 1023 px) сайдбар всегда отдаётся
 *   как `collapsed=true`, чтобы освободить место под основной контент мобильного браузера.
 * - На широком — берётся пользовательский выбор, опционально сохраняемый в `localStorage`
 *   по ключу `storageKey` (если задан).
 * - `toggle()` на узком экране — no-op (на мобильном пока нет смысла раскрывать
 *   плашку до 204 px, она перекроет почти всю ширину).
 *
 * Хук-обёртка над повторяющимся паттерном `useState/useEffect/localStorage/matchMedia`,
 * который раньше копировался в каждой странице.
 */
export function useSidebarCollapsed(
  storageKey?: string,
  options?: { narrowMaxWidthPx?: number }
): readonly [boolean, () => void] {
  const isNarrow = useIsNarrow(options?.narrowMaxWidthPx ?? 1023);
  const [userCollapsed, setUserCollapsed] = useState(() =>
    readUserCollapsedFromStorage(storageKey)
  );

  const toggle = useCallback(() => {
    if (isNarrow) {
      return;
    }
    setUserCollapsed((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // Игнорируем ошибки записи (например, превышен квота).
        }
      }
      return next;
    });
  }, [isNarrow, storageKey]);

  return [isNarrow || userCollapsed, toggle] as const;
}
