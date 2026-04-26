import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import { ActionIconButton } from "../../app/components/action-icon-button";
import { HelpTriggerButton } from "../../src/components/app-help-fab";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function GarageHeader(props: {
  trashCount: number;
  onOpenTrash: () => void;
  onOpenProfile: () => void;
  onAddVehicle: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>Мой гараж</Text>
          <Text style={styles.subtitle}>
            Ваши мотоциклы, обслуживание и расходы в одном месте.
          </Text>
        </View>
        <HelpTriggerButton size={36} />
      </View>
      <View style={styles.actionsRow}>
        <View style={styles.iconActions}>
          <View style={styles.badgedIcon}>
            <ActionIconButton
              onPress={props.onOpenTrash}
              accessibilityLabel={`Открыть Свалку (${props.trashCount})`}
              variant="subtle"
              icon={<MaterialIcons name="delete-outline" size={22} color={c.textPrimary} />}
              style={styles.roundAction}
            />
            {props.trashCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{props.trashCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Button
          variant="primary"
          size="md"
          onPress={props.onAddVehicle}
          style={styles.addButton}
          leadingIcon={<MaterialIcons name="add" size={20} color={c.onPrimaryAction} />}
        >
          Добавить мотоцикл
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCol: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: c.textPrimary,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: c.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconActions: {
    flexDirection: "row",
  },
  badgedIcon: {
    position: "relative",
  },
  roundAction: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
  },
  addButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#FF5148",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: c.canvas,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
