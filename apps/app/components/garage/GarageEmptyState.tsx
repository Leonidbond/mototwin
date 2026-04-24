import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";

type GarageEmptyStateProps = {
  onOpenProfile: () => void;
  onAddVehicle: () => void;
  onReload: () => void;
};

export function GarageEmptyState(props: GarageEmptyStateProps) {
  return (
    <Card padding="lg" style={styles.wrap}>
      <Text style={styles.title}>Личный гараж пока пуст</Text>
      <Text style={styles.text}>Добавьте первый мотоцикл, чтобы начать вести обслуживание.</Text>
      <View style={styles.actions}>
        <EmptyStateAction onPress={props.onOpenProfile} label="Профиль" variant="secondary" />
        <EmptyStateAction
          onPress={props.onAddVehicle}
          label="Добавить мотоцикл"
          variant="primary"
        />
        <EmptyStateAction onPress={props.onReload} label="Обновить список" variant="ghost" />
      </View>
    </Card>
  );
}

function EmptyStateAction(props: {
  onPress: () => void;
  label: string;
  variant: "primary" | "secondary" | "ghost";
}) {
  return (
    <Pressable onPress={props.onPress}>
      <Button variant={props.variant}>{props.label}</Button>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { color: c.textPrimary, fontSize: 24, fontWeight: "700" },
  text: { color: c.textMuted, fontSize: 14, marginTop: 8 },
  actions: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
