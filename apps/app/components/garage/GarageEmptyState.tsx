import { Image, StyleSheet, Text, View } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import emptyGarageImage from "../../../../images/empty_garage.png";

type GarageEmptyStateProps = {
  onOpenProfile?: () => void;
  onAddVehicle?: () => void;
  onReload?: () => void;
};

export function GarageEmptyState(_props: GarageEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Image source={emptyGarageImage} style={styles.image} resizeMode="contain" />
      <Text style={styles.text}>В вашем гараже пока нет мотоциклов</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 16,
  },
  image: {
    width: 260,
    height: 260,
  },
  text: {
    color: c.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 300,
  },
});
