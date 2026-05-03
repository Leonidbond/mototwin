import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { ServiceKitViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { PickerServiceKitRow } from "./picker-service-kit-row";

const VISIBLE_LIMIT = 3;

export function PickerKitsSection(props: {
  kits: ServiceKitViewModel[];
  draftKitCodes: Set<string>;
  addingKitCode: string | null;
  expandedKitCode: string | null;
  isLoading: boolean;
  onAddKit: (kit: ServiceKitViewModel) => void;
  onToggleExpand: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? props.kits : props.kits.slice(0, VISIBLE_LIMIT);
  const remaining = Math.max(0, props.kits.length - VISIBLE_LIMIT);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Комплекты обслуживания</Text>
          <Text style={styles.subtitle}>
            Готовые наборы для обслуживания узлов вашего мотоцикла
          </Text>
        </View>
      </View>

      {props.isLoading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.mutedText}>Загружаем комплекты…</Text>
        </View>
      ) : props.kits.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.mutedText}>
            Для текущего контекста нет подходящих комплектов.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visible.map((kit) => (
            <PickerServiceKitRow
              key={kit.code}
              kit={kit}
              isInDraft={props.draftKitCodes.has(kit.code)}
              isAdding={props.addingKitCode === kit.code}
              isExpanded={props.expandedKitCode === kit.code}
              onToggleExpand={() => props.onToggleExpand(kit.code)}
              onAddKit={() => props.onAddKit(kit)}
            />
          ))}
          {!expanded && remaining > 0 ? (
            <Pressable
              onPress={() => setExpanded(true)}
              style={({ pressed }) => [styles.showMoreBtn, pressed && styles.showMoreBtnPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.showMoreText}>
                Показать ещё комплекты ({remaining})
              </Text>
              <MaterialIcons name="expand-more" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
          {expanded && remaining > 0 ? (
            <Pressable
              onPress={() => setExpanded(false)}
              style={({ pressed }) => [styles.showMoreBtn, pressed && styles.showMoreBtnPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.showMoreText}>Свернуть список</Text>
              <MaterialIcons name="expand-less" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerTextCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  list: { gap: 8 },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
  },
  mutedText: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  showMoreBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: 4,
  },
  showMoreBtnPressed: { opacity: 0.85 },
  showMoreText: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },
});
