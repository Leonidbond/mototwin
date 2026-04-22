import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, SectionHeader, Button } from "../ui";
import { ActionIconButton } from "../../app/components/action-icon-button";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function GarageHeader(props: {
  trashCount: number;
  onOpenTrash: () => void;
  onOpenProfile: () => void;
  onAddVehicle: () => void;
}) {
  return (
    <View>
      <SectionHeader
        titleVisual="page"
        eyebrow={<Chip tone="accent">MotoTwin | Личный гараж</Chip>}
        title="Мой гараж"
        subtitle="Все мотоциклы, обслуживание и покупки в одном месте"
        actions={
          <View style={styles.actions}>
            <ActionIconButton
              onPress={props.onOpenTrash}
              accessibilityLabel={`Открыть Свалку (${props.trashCount})`}
              variant="subtle"
              icon={<MaterialIcons name="delete-outline" size={18} color={c.textMeta} />}
            />
            <ActionIconButton
              onPress={props.onOpenProfile}
              accessibilityLabel="Открыть профиль"
              icon={<MaterialIcons name="person-outline" size={18} color={c.textMeta} />}
            />
          </View>
        }
      />
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Свалка: {props.trashCount}</Text>
        <Pressable onPress={props.onAddVehicle}>
          <Button variant="primary" size="sm">Добавить мотоцикл</Button>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: { color: c.textMuted, fontSize: 12, fontWeight: "500" },
});
