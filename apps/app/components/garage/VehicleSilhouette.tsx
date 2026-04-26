import { Image, StyleSheet, View } from "react-native";
import { resolveGarageVehicleSilhouette } from "@mototwin/domain";
import type { GarageVehicleItem } from "@mototwin/types";
import adventureTouring from "../../../../images/Motocycles/adventure_touring.png";
import enduroDualSport from "../../../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadster from "../../../../images/Motocycles/naked_roadster.png";
import sportSupersport from "../../../../images/Motocycles/sport_supersport.png";
import cruiser from "../../../../images/Motocycles/cruiser.png";
import classicRetro from "../../../../images/Motocycles/classic_retro.png";
import scooterMaxiScooter from "../../../../images/Motocycles/scooter_maxi_scooter.png";

const SILHOUETTES = {
  adventure_touring: adventureTouring,
  enduro_dual_sport: enduroDualSport,
  naked_roadster: nakedRoadster,
  sport_supersport: sportSupersport,
  cruiser,
  classic_retro: classicRetro,
  scooter_maxi_scooter: scooterMaxiScooter,
} as const;

export function VehicleSilhouette({ vehicle }: { vehicle: GarageVehicleItem }) {
  const key = resolveGarageVehicleSilhouette(vehicle);
  const source = SILHOUETTES[key] ?? SILHOUETTES.naked_roadster;
  return (
    <View style={styles.wrap}>
      <Image
        source={source}
        style={styles.image}
        resizeMode="contain"
        accessible
        accessibilityLabel="Изображение класса мотоцикла"
        alt="Изображение класса мотоцикла"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 156,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    opacity: 0.94,
  },
});
