import {
  groupNodePickerOptionsByTopLevel,
  NODE_TREE_PLAN_LOCKED_HINT_RU,
  nodePickerGroupHeadingRu,
} from "@mototwin/domain";
import { SubscriptionLockBanner } from "../subscription/subscription-lock-banner";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getNodeTreeIconAsset } from "../../../../src/node-tree-icons";

export type MobileNodePickerOption = {
  id: string;
  name: string;
  pathLabel?: string;
  level?: number;
  code?: string;
  planLocked?: boolean;
};

type MobileNodePickerModalProps = {
  visible: boolean;
  title?: string;
  options: MobileNodePickerOption[];
  topOptions?: MobileNodePickerOption[];
  selectedId?: string | null;
  selectedIds?: string[];
  disabledIds?: Set<string>;
  searchPlaceholder?: string;
  emptyLabel?: string;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
  onConfirmSelection?: (nodeIds: string[]) => void;
};

export function MobileNodePickerModal({
  visible,
  title = "Выберите узел",
  options,
  topOptions,
  selectedId,
  selectedIds,
  disabledIds,
  searchPlaceholder = "Поиск по названию узла",
  emptyLabel = "Узлы не найдены",
  onClose,
  onSelect,
  onConfirmSelection,
}: MobileNodePickerModalProps) {
  const [query, setQuery] = useState("");
  const [topOnly, setTopOnly] = useState(false);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(() => new Set(selectedIds ?? []));

  useEffect(() => {
    if (!visible) return;
    setMultiSelected(new Set(selectedIds ?? []));
  }, [visible, selectedIds]);

  const showTopToggle = Boolean(topOptions && topOptions.length > 0);
  const hasPlanLockedLeaves = useMemo(
    () => options.some((option) => option.planLocked),
    [options]
  );
  const multi = Boolean(onConfirmSelection);
  const baseOptions = topOnly && topOptions?.length ? topOptions : options;

  useEffect(() => {
    if (!visible) return;
    if (hasPlanLockedLeaves && showTopToggle) {
      setTopOnly(true);
    }
  }, [hasPlanLockedLeaves, showTopToggle, visible]);

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
    setMultiSelected(new Set(selectedIds ?? []));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={resetAndClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.searchRow}>
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
          </View>
          {showTopToggle && !topOnly && hasPlanLockedLeaves ? (
            <SubscriptionLockBanner
              variant="surface"
              title="Полное дерево (просмотр)"
              description={NODE_TREE_PLAN_LOCKED_HINT_RU}
              requiredPlan="PRO"
            />
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
                    const active = multi ? multiSelected.has(option.id) : selectedId === option.id;
                    const planLocked = Boolean(option.planLocked);
                    const disabled = (disabledIds?.has(option.id) ?? false) || planLocked;
                    const rowAsset = option.code
                      ? (getNodeTreeIconAsset(option.code, option.name) as ImageSourcePropType | null)
                      : null;
                    return (
                      <Pressable
                        key={option.id}
                        style={[
                          styles.row,
                          active && styles.rowActive,
                          disabled && styles.rowDisabled,
                          planLocked && styles.rowPlanLocked,
                        ]}
                        disabled={disabled}
                        onPress={() => {
                          if (disabled) return;
                          if (multi) {
                            setMultiSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(option.id)) next.delete(option.id);
                              else next.add(option.id);
                              return next;
                            });
                            return;
                          }
                          onSelect(option.id);
                          resetAndClose();
                        }}
                      >
                        <View style={styles.rowBody}>
                          {rowAsset ? (
                            // eslint-disable-next-line jsx-a11y/alt-text -- decorative; row has name/path labels
                            <Image
                              source={rowAsset}
                              style={styles.rowIcon}
                              resizeMode="contain"
                              accessibilityIgnoresInvertColors
                              accessible={false}
                              importantForAccessibility="no-hide-descendants"
                            />
                          ) : null}
                          <View style={styles.rowTextCol}>
                            <View style={styles.rowHeader}>
                              <Text
                                style={[
                                  styles.rowTitle,
                                  active && styles.rowTitleActive,
                                  planLocked && styles.rowTitlePlanLocked,
                                ]}
                              >
                                {option.name}
                              </Text>
                              {multi ? (
                                <Text style={[styles.check, active && styles.checkActive]}>
                                  {active ? "✓" : ""}
                                </Text>
                              ) : null}
                            </View>
                            {option.pathLabel ? <Text style={styles.path}>{option.pathLabel}</Text> : null}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </Fragment>
              ))
            )}
          </ScrollView>
          {multi ? (
            <View style={styles.footerRow}>
              <Pressable style={styles.close} onPress={resetAndClose}>
                <Text style={styles.closeText}>Закрыть</Text>
              </Pressable>
              <Pressable
                style={styles.confirm}
                onPress={() => {
                  onConfirmSelection?.(Array.from(multiSelected));
                  resetAndClose();
                }}
              >
                <Text style={styles.confirmText}>Добавить выбранные</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.close} onPress={resetAndClose}>
              <Text style={styles.closeText}>Закрыть</Text>
            </Pressable>
          )}
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: { flex: 1 },
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
  searchRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.cardMuted,
    color: c.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topToggle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 10,
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
  rowBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    marginTop: 1,
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowActive: {
    borderColor: c.primaryAction,
    backgroundColor: "rgba(249, 115, 22, 0.10)",
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowPlanLocked: {
    opacity: 0.38,
    backgroundColor: c.cardSubtle,
  },
  rowTitlePlanLocked: {
    color: c.textMuted,
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
  check: {
    minWidth: 20,
    textAlign: "right",
    color: c.textMuted,
    fontWeight: "900",
  },
  checkActive: {
    color: c.primaryAction,
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  confirm: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: c.primaryAction,
  },
  confirmText: {
    color: c.onPrimaryAction,
    fontWeight: "800",
  },
});
