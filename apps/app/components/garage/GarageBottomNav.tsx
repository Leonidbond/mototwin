import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { productSemanticColors as c } from "@mototwin/design-tokens";

type BottomNavKey = "garage" | "nodes" | "journal" | "expenses" | "profile";

type NavItem = {
  key: BottomNavKey;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
};

export function GarageBottomNav(props: {
  activeKey?: BottomNavKey;
  onOpenGarage: () => void;
  onOpenNodes: () => void;
  onOpenJournal: () => void;
  onOpenExpenses: () => void;
  onOpenProfile: () => void;
  hasVehicleContext: boolean;
}) {
  const insets = useSafeAreaInsets();
  const items: NavItem[] = [
    {
      key: "garage",
      label: "Мой гараж",
      icon: "home",
      onPress: props.onOpenGarage,
      active: true,
    },
    {
      key: "nodes",
      label: "Узлы",
      icon: "device-hub",
      onPress: props.onOpenNodes,
      disabled: !props.hasVehicleContext,
    },
    {
      key: "journal",
      label: "Журнал",
      icon: "menu-book",
      onPress: props.onOpenJournal,
      disabled: !props.hasVehicleContext,
    },
    {
      key: "expenses",
      label: "Расходы",
      icon: "account-balance-wallet",
      onPress: props.onOpenExpenses,
      disabled: !props.hasVehicleContext,
    },
    {
      key: "profile",
      label: "Профиль",
      icon: "person-outline",
      onPress: props.onOpenProfile,
    },
  ];

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const active = props.activeKey ? props.activeKey === item.key : !!item.active;
          const foreground = item.disabled
            ? c.textTertiary
            : active
              ? c.primaryAction
              : c.textMuted;
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              disabled={item.disabled}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                active && styles.itemActive,
                pressed && !item.disabled && styles.itemPressed,
                item.disabled && styles.itemDisabled,
              ]}
            >
              <MaterialIcons name={item.icon} size={20} color={foreground} />
              <Text style={[styles.label, { color: foreground }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: c.canvas,
  },
  bar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 14,
  },
  itemActive: {
    backgroundColor: c.cardMuted,
  },
  itemPressed: {
    opacity: 0.85,
  },
  itemDisabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
  },
});
