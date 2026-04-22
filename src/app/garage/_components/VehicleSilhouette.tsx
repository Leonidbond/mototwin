import Image from "next/image";
import { resolveGarageVehicleSilhouette } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";

const SILHOUETTE_SRC: Record<string, string> = {
  adventure_touring: "/images/motorcycle-class-silhouettes/adventure_touring.png",
  enduro_dual_sport: "/images/motorcycle-class-silhouettes/enduro_dual_sport.png",
  naked_roadster: "/images/motorcycle-class-silhouettes/naked_roadster.png",
  sport_supersport: "/images/motorcycle-class-silhouettes/sport_supersport.png",
  cruiser: "/images/motorcycle-class-silhouettes/cruiser.png",
  classic_retro: "/images/motorcycle-class-silhouettes/classic_retro.png",
  scooter_maxi_scooter: "/images/motorcycle-class-silhouettes/scooter_maxi_scooter.png",
};

export function VehicleSilhouette({ vehicle }: { vehicle: GarageVehicleItem }) {
  const key = resolveGarageVehicleSilhouette(vehicle);
  const src = SILHOUETTE_SRC[key] ?? SILHOUETTE_SRC.naked_roadster;
  return (
    <div
      className="relative h-24 w-full overflow-hidden rounded-xl border"
      style={{
        borderColor: productSemanticColors.border,
        backgroundColor: productSemanticColors.cardSubtle,
      }}
    >
      <Image
        src={src}
        alt={`Силуэт класса ${key.replaceAll("_", " ")}`}
        fill
        className="object-contain p-2"
        sizes="280px"
      />
    </div>
  );
}
