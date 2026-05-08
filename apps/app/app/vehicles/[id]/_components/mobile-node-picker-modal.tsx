import { groupNodePickerOptionsByTopLevel, nodePickerGroupHeadingRu } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { Fragment, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export type MobileNodePickerOption = {
  id: string;
  name: string;
  pathLabel?: string;
  level?: number;
};

type MobileNodePickerModalProps = {
  visible: boolean;
  title?: string;
  options: MobileNodePickerOption[];
  topOptions?: MobileNodePickerOption[];
  selectedId?: string | null;
  searchPlaceholder?: string;
  emptyLabel?: string;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
};

export function MobileNodePickerModal({
  visible,
  title = "Выберите узел",
  options,
  topOptions,
  selectedId,
  searchPlaceholder = "Поиск по названию узла",
  emptyLabel = "Узлы не найдены",
  onClose,
  onSelect,
}: MobileNodePickerModalProps) {
  const [query, setQuery] = useState("");
  const [topOnly, setTopOnly] = useState(false);

  const showTopToggle = Boolean(topOptions && topOptions.length > 0);
  const baseOptions = topOnly && topOptions?.length ? topOptions : options;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter((option) =>
      `${option.name} ${option.pathLabel ?? ""} ${option.id}`.toLowerCase().includes(q)
    );
  }, [baseOptions, query]);

  const groupedList = useMemo(() => groupNodePickerOptionsByTopLevel(filtered), [filtered]);

  const resetAndClose = () => {
    setQuery("");
    setTopOnly(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={resetAndClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={c.textMuted}
            style={styles.search}
          />
          {showTopToggle ? (
            <Pressable
              onPress={() => setTopOnly((value) => !value)}
              style={[styles.topToggle, topOnly && styles.topToggleOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: topOnly }}
            >
              <Text style={[styles.topToggleText, topOnly && styles.topToggleTextOn]}>
                Топ-узлы
              </Text>
            </Pressable>
          ) : null}
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>{emptyLabel}</Text>
            ) : (
              groupedList.map(({ groupKey, items }, groupIndex) => (
                <Fragment key={groupKey}>
                  {groupIndex > 0 ? <View style={styles.groupSpacer} /> : null}
                  <Text style={styles.groupHeading}>{nodePickerGroupHeadingRu(groupKey)}</Text>
                  {items.map((option) => {
                    const active = selectedId === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.row, active && styles.rowActive]}
                        onPress={() => {
                          onSelect(option.id);
                          resetAndClose();
                        }}
                      >
                        <Text style={[styles.rowTitle, active && styles.rowTitleActive]}>
                          {option.name}
                        </Text>
                        {option.pathLabel ? (
                          <Text style={styles.path}>{option.pathLabel}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Fragment>
              ))
            )}
          </ScrollView>
          <Pressable style={styles.close} onPress={resetAndClose}>
            <Text style={styles.closeText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: c.overlayModal,
  },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    backgroundColor: c.card,
    padding: 16,
    gap: 12,
  },
  title: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  search: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.cardMuted,
    color: c.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topToggle: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topToggleOn: {
    borderColor: c.primaryAction,
    backgroundColor: "rgba(249, 115, 22, 0.12)",
  },
  topToggleText: {
    color: c.textSecondary,
    fontWeight: "700",
  },
  topToggleTextOn: {
    color: c.textPrimary,
  },
  list: {
    maxHeight: 360,
  },
  groupSpacer: {
    height: 6,
  },
  groupHeading: {
    color: c.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  row: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: c.cardSubtle,
  },
  rowActive: {
    borderColor: c.primaryAction,
    backgroundColor: "rgba(249, 115, 22, 0.10)",
  },
  rowTitle: {
    color: c.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  rowTitleActive: {
    color: c.textPrimary,
  },
  path: {
    color: c.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  empty: {
    color: c.textMuted,
    textAlign: "center",
    paddingVertical: 24,
  },
  close: {
    alignSelf: "flex-end",
    paddingVertical: 6,
  },
  closeText: {
    color: c.primaryAction,
    fontWeight: "800",
  },
});
