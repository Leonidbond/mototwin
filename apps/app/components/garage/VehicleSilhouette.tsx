import { Image, StyleSheet, View } from "react-native";
import { resolveGarageVehicleSilhouette } from "@mototwin/domain";
import type { GarageVehicleItem } from "@mototwin/types";
import adventureTouring from "../../../../images/motorcycle-class-silhouettes/adventure_touring.png";
import enduroDualSport from "../../../../images/motorcycle-class-silhouettes/enduro_dual_sport.png";
import nakedRoadster from "../../../../images/motorcycle-class-silhouettes/naked_roadster.png";
import sportSupersport from "../../../../images/motorcycle-class-silhouettes/sport_supersport.png";
import cruiser from "../../../../images/motorcycle-class-silhouettes/cruiser.png";
import classicRetro from "../../../../images/motorcycle-class-silhouettes/classic_retro.png";
import scooterMaxiScooter from "../../../../images/motorcycle-class-silhouettes/scooter_maxi_scooter.png";

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
      <Image source={source} style={styles.image} resizeMode="contain" accessible accessibilityLabel="Силуэт класса мотоцикла" />
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
    opacity: 0.62,
  },
});
