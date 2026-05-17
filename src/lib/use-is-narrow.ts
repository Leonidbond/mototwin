"use client";

import { useEffect, useState } from "react";

/**
 * Слушает `window.matchMedia("(max-width: ${maxWidthPx}px)")` и возвращает true,
 * когда viewport уже или равен `maxWidthPx`.
 *
 * Использовать для перехода многоколоночных layout’ов в одну колонку / модалку на
 * мобильных. Дефолтный порог 1023 px соответствует Tailwind v4 breakpoint `lg`,
 * т. е. ширине, начиная с которой в проекте устойчиво работают двухколоночные сетки.
 */
export function useIsNarrow(maxWidthPx: number = 1023): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidthPx]);

  return isNarrow;
}
