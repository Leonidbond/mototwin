"use client";

import { Area, AreaChart } from "recharts";
import type { AdminSparklinePoint } from "@mototwin/types";
import { useChartContainerSize } from "./use-chart-container-size";

interface SparklineProps {
  data: AdminSparklinePoint[];
  color: string;
  height?: number;
  fillOpacity?: number;
}

/** Tiny axis-less area chart used inside KPI cards. */
export function Sparkline({ data, color, height = 36, fillOpacity = 0.18 }: SparklineProps) {
  const { ref, size } = useChartContainerSize(height);

  if (!data || data.length < 2) {
    return <div ref={ref} style={{ height, width: "100%", minWidth: 0 }} aria-hidden />;
  }

  const id = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div ref={ref} style={{ height, width: "100%", minWidth: 0 }} aria-hidden>
      {size ? (
        <AreaChart
          width={size.width}
          height={size.height}
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : null}
    </div>
  );
}
