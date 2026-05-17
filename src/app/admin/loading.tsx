import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

/**
 * Generic skeleton shown while admin pages stream their first server payload.
 * Layout intentionally mirrors the standard chrome (top bar + grid of cards)
 * so the visual jump is minimal.
 */
export default function AdminLoading() {
  return (
    <div style={containerStyle} aria-label="Загрузка раздела…">
      <div style={topBarStyle}>
        <Skeleton width={180} height={20} />
        <div style={{ flex: 1 }} />
        <Skeleton width={220} height={32} radius={999} />
        <Skeleton width={32} height={32} radius={999} />
        <Skeleton width={140} height={32} radius={radiusScale.sm} />
      </div>
      <div style={gridStyle}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} height={108} radius={radiusScale.lg} />
        ))}
      </div>
      <Skeleton height={260} radius={radiusScale.lg} />
      <div style={gridStyle}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} height={210} radius={radiusScale.lg} />
        ))}
      </div>
    </div>
  );
}

function Skeleton({
  width,
  height,
  radius = radiusScale.sm,
}: {
  width?: number | string;
  height: number;
  radius?: number | string;
}) {
  return (
    <div
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${productSemanticColors.cardSubtle} 0%, ${productSemanticColors.card} 50%, ${productSemanticColors.cardSubtle} 100%)`,
        backgroundSize: "200% 100%",
        animation: "mototwin-admin-skeleton 1.6s ease-in-out infinite",
      }}
    />
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: "20px 28px 32px",
  flex: 1,
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  height: 56,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};
