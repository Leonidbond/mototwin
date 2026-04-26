import Image from "next/image";
import { resolveGarageVehicleSilhouette } from "@mototwin/domain";
import type { GarageVehicleItem } from "@mototwin/types";
import adventureTouring from "../../../../images/Motocycles/adventure_touring.png";
import enduroDualSport from "../../../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadster from "../../../../images/Motocycles/naked_roadster.png";
import sportSupersport from "../../../../images/Motocycles/sport_supersport.png";
import cruiser from "../../../../images/Motocycles/cruiser.png";
import classicRetro from "../../../../images/Motocycles/classic_retro.png";
import scooterMaxiScooter from "../../../../images/Motocycles/scooter_maxi_scooter.png";

const SILHOUETTE_SRC = {
  adventure_touring: adventureTouring,
  enduro_dual_sport: enduroDualSport,
  naked_roadster: nakedRoadster,
  sport_supersport: sportSupersport,
  cruiser,
  classic_retro: classicRetro,
  scooter_maxi_scooter: scooterMaxiScooter,
};

export function VehicleSilhouette(props: {
  vehicle: GarageVehicleItem;
  silhouetteKey?: keyof typeof SILHOUETTE_SRC;
}) {
  const key = props.silhouetteKey ?? resolveGarageVehicleSilhouette(props.vehicle);
  const src = SILHOUETTE_SRC[key] ?? SILHOUETTE_SRC.naked_roadster;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 170,
        overflow: "hidden",
      }}
    >
      <Image
        src={src}
        alt={`Мотоцикл класса ${key.replaceAll("_", " ")}`}
        fill
        sizes="(min-width: 1024px) 360px, 100vw"
        style={{ objectFit: "contain", opacity: 0.94 }}
      />
    </div>
  );
}
