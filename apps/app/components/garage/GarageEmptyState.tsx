import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function GarageEmptyState(props: { onOpenProfile: () => void; onAddVehicle: () => void; onReload: () => void }) {
  return (
    <Card padding="lg" style={styles.wrap}>
      <Text style={styles.title}>Личный гараж пока пуст</Text>
      <Text style={styles.text}>Добавьте первый мотоцикл, чтобы начать вести обслуживание.</Text>
      <View style={styles.actions}>
        <Pressable onPress={props.onOpenProfile}><Button variant="secondary">Профиль</Button></Pressable>
        <Pressable onPress={props.onAddVehicle}><Button variant="primary">Добавить мотоцикл</Button></Pressable>
        <Pressable onPress={props.onReload}><Button variant="ghost">Обновить список</Button></Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { color: c.textPrimary, fontSize: 24, fontWeight: "700" },
  text: { color: c.textMuted, fontSize: 14, marginTop: 8 },
  actions: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
