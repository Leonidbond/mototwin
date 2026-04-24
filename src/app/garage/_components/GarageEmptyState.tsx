import Image from "next/image";
import type { CSSProperties } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";
import emptyGarageImage from "../../../../images/empty_garage.png";

type GarageEmptyStateProps = {
  onReload: () => void;
};

export function GarageEmptyState(_props: GarageEmptyStateProps) {
  return (
    <div style={wrapperStyle}>
      <div style={imageWrapStyle}>
        <Image
          src={emptyGarageImage}
          alt="Пустой гараж"
          fill
          sizes="(min-width: 1024px) 320px, 70vw"
          style={{ objectFit: "contain" }}
          priority
        />
      </div>
      <p style={titleStyle}>В вашем гараже пока нет мотоциклов</p>
    </div>
  );
}

const wrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: "32px 16px 24px",
  textAlign: "center",
};

const imageWrapStyle: CSSProperties = {
  position: "relative",
  width: "min(320px, 70vw)",
  aspectRatio: "1 / 1",
};

const titleStyle: CSSProperties = {
  color: productSemanticColors.textSecondary,
  fontSize: 16,
  lineHeight: "22px",
  fontWeight: 500,
  maxWidth: 420,
};
