"use client";

import { useEffect, useRef, useState } from "react";

/** Waits until the chart wrapper has a real layout size (avoids Recharts width/height -1 warnings). */
export function useChartContainerSize(fallbackHeight: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const width = Math.floor(el.clientWidth);
      const height = Math.floor(el.clientHeight) || fallbackHeight;
      if (width <= 0 || height <= 0) return;
      setSize((prev) =>
        prev?.width === width && prev?.height === height ? prev : { width, height }
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallbackHeight]);

  return { ref, size };
}
