import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { createMobileApiClient, clearMobileSession } from "../src/create-mobile-api-client";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  buildTopNodeProfileGroups,
  getDevUserOptions,
  isDevLoginEnabled,
  mergeUserLocalSettings,
  normalizeDevUserEmail,
  resolveEditableFavoriteNodeCodes,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import {
  DEFAULT_DEV_USER_EMAIL,
  MAX_FAVORITE_NODE_CODES,
  type ServiceNodeItem,
  type TopServiceNodeItem,
  type UserLocalSettings,
  type UserLocalSettingsNodeView,
} from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";
import { readDevUserSelection, writeDevUserSelection } from "../src/ui-dev-user-selection";
import {
  readUserLocalSettingsForIdentity,
  writeUserLocalSettingsForIdentity,
} from "../src/ui-user-local-settings";
import { ScreenHeader } from "../components/expo-shell/screen-header";

function buildProfileData(selectedDevUserEmail: string) {
  const option = getDevUserOptions().find((item) => item.email === selectedDevUserEmail);
  return {
    displayName: option?.label ?? "Владелец",
    email: option?.email ?? "demo@mototwin.local",
    createdAtLabel: "Не указана",
    garageTitle: option?.garageTitle ?? "Мой гараж",
  };
}

export default function ProfileScreen() {
  const apiBaseUrl = getApiBaseUrl();
  const [userSettings, setUserSettings] = useState<UserLocalSettings>({
    ...DEFAULT_USER_LOCAL_SETTINGS,
  });
  const [settingsSavedNotice, setSettingsSavedNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [selectedDevUserEmail, setSelectedDevUserEmail] = useState(DEFAULT_DEV_USER_EMAIL);
  const [apiProfile, setApiProfile] = useState<ReturnType<typeof buildProfileData> | null>(null);

  const [serviceNodes, setServiceNodes] = useState<ServiceNodeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [topNodesExpanded, setTopNodesExpanded] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace">("add");
  const [replaceTargetCode, setReplaceTargetCode] = useState<string | null>(null);

  const devLoginEnabled = isDevLoginEnabled();
  const devUserOptions = getDevUserOptions();
  const profile = useMemo(
    () => apiProfile ?? buildProfileData(selectedDevUserEmail),
    [apiProfile, selectedDevUserEmail]
  );
  const resolvedProfileIdentity = useMemo(() => {
    const identity = apiProfile?.email ?? selectedDevUserEmail;
    return identity?.trim().toLowerCase() || null;
  }, [apiProfile?.email, selectedDevUserEmail]);

  const router = useRouter();

  const loadProfileAndSettings = useCallback(async () => {
    const endpoints = createMobileApiClient();
    try {
      const [settingsResponse, profileResponse] = await Promise.all([
        endpoints.getUserSettings(),
        endpoints.getProfile(),
      ]);
      const resolvedSettings = mergeUserLocalSettings(
        DEFAULT_USER_LOCAL_SETTINGS,
        settingsResponse.settings
      );
      setUserSettings(resolvedSettings);
      setApiProfile({
        displayName: profileResponse.profile.displayName,
        email: profileResponse.profile.email,
        createdAtLabel: profileResponse.profile.createdAt
          ? new Date(profileResponse.profile.createdAt).toLocaleDateString("ru-RU")
          : "Не указана",
        garageTitle: profileResponse.profile.garageTitle,
      });
      await writeUserLocalSettingsForIdentity(resolvedSettings, profileResponse.profile.email);
      try {
        const topResponse = await endpoints.getTopServiceNodes();
        setTopServiceNodes(topResponse.nodes);
      } catch {
        setTopServiceNodes([]);
      }
      setSettingsError("");
    } catch {
      const fallback = await readUserLocalSettingsForIdentity(resolvedProfileIdentity);
      setUserSettings(fallback);
      setSettingsError("Не удалось загрузить настройки с сервера, использован локальный кэш.");
    }
  }, [apiBaseUrl, resolvedProfileIdentity]);

  useEffect(() => {
    void (async () => {
      if (devLoginEnabled) {
        setSelectedDevUserEmail(await readDevUserSelection());
      }
      await loadProfileAndSettings();
    })();
  }, [devLoginEnabled, loadProfileAndSettings]);

  const updateUserSettings = async (patch: Partial<UserLocalSettings>) => {
    const next = mergeUserLocalSettings(userSettings, patch);
    setUserSettings(next);
    try {
      const endpoints = createMobileApiClient();
      const response = await endpoints.updateUserSettings(next);
      const resolved = mergeUserLocalSettings(DEFAULT_USER_LOCAL_SETTINGS, response.settings);
      setUserSettings(resolved);
      await writeUserLocalSettingsForIdentity(resolved, resolvedProfileIdentity);
      try {
        const topResponse = await endpoints.getTopServiceNodes();
        setTopServiceNodes(topResponse.nodes);
      } catch {
        // keep previous top nodes preview
      }
      setSettingsError("");
      setSettingsSavedNotice("Настройки сохранены");
      setTimeout(() => setSettingsSavedNotice(""), 1800);
    } catch {
      setSettingsError("Не удалось сохранить настройки на сервере.");
    }
  };

  const updateDevUser = async (email: string) => {
    const selected = await writeDevUserSelection(normalizeDevUserEmail(email));
    setSelectedDevUserEmail(selected);
    setApiProfile(null);
    await loadProfileAndSettings();
  };

  const effectiveTopNodeCodes = useMemo(
    () => topServiceNodes.map((node) => node.code),
    [topServiceNodes]
  );

  const editableFavoriteCodes = useMemo(
    () =>
      resolveEditableFavoriteNodeCodes(
        userSettings.favoriteNodeCodes,
        effectiveTopNodeCodes
      ),
    [userSettings.favoriteNodeCodes, effectiveTopNodeCodes]
  );

  const topNodeProfileGroups = useMemo(
    () => buildTopNodeProfileGroups(topServiceNodes),
    [topServiceNodes]
  );

  const ensureServiceNodesLoaded = async () => {
    if (serviceNodes.length > 0) {
      return;
    }
    try {
      const endpoints = createMobileApiClient();
      const response = await endpoints.getServiceNodes();
      setServiceNodes(response.nodes);
    } catch {
      // picker will show empty state
    }
  };

  const applyFavoriteNodeCodes = (nextCodes: string[]) => {
    void updateUserSettings({ favoriteNodeCodes: nextCodes });
  };

  const openAddNodePicker = async () => {
    setTopNodesExpanded(true);
    setPickerMode("add");
    setReplaceTargetCode(null);
    await ensureServiceNodesLoaded();
    setIsPickerVisible(true);
  };

  const openReplaceNodePicker = async (code: string) => {
    setTopNodesExpanded(true);
    setPickerMode("replace");
    setReplaceTargetCode(code);
    await ensureServiceNodesLoaded();
    setIsPickerVisible(true);
  };

  const toggleFavoriteNode = (code: string) => {
    const base = resolveEditableFavoriteNodeCodes(
      userSettings.favoriteNodeCodes,
      effectiveTopNodeCodes
    );
    const next = base.includes(code)
      ? base.filter((item) => item !== code)
      : base.length < MAX_FAVORITE_NODE_CODES
        ? [...base, code]
        : base;
    applyFavoriteNodeCodes(next);
  };

  const removeFavoriteNode = (code: string) => {
    const base = resolveEditableFavoriteNodeCodes(
      userSettings.favoriteNodeCodes,
      effectiveTopNodeCodes
    );
    applyFavoriteNodeCodes(base.filter((item) => item !== code));
  };

  const replaceFavoriteNode = (oldCode: string, newCode: string) => {
    if (oldCode === newCode) {
      return;
    }
    const base = resolveEditableFavoriteNodeCodes(
      userSettings.favoriteNodeCodes,
      effectiveTopNodeCodes
    );
    if (base.includes(newCode)) {
      return;
    }
    applyFavoriteNodeCodes(base.map((item) => (item === oldCode ? newCode : item)));
  };

  const resetFavoriteNodes = () => {
    void updateUserSettings({ favoriteNodeCodes: [] });
  };

  const isUsingCustomNodes = userSettings.favoriteNodeCodes.length > 0;
  const isAtMaxNodes = editableFavoriteCodes.length >= MAX_FAVORITE_NODE_CODES;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader title="Профиль" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          <InfoRow label="Имя" value={profile.displayName} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Дата регистрации" value={profile.createdAtLabel} />
          <InfoRow label="Гараж" value={profile.garageTitle} />
          {!__DEV__ ? (
            <Pressable
              style={styles.logoutButton}
              onPress={async () => {
                await clearMobileSession();
                router.replace("/login");
              }}
            >
              <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.settingsHeader}>
            <Text style={styles.sectionTitle}>Настройки</Text>
            {settingsSavedNotice ? <Text style={styles.savedText}>{settingsSavedNotice}</Text> : null}
          </View>
          {settingsError ? <Text style={styles.errorText}>{settingsError}</Text> : null}
          <SettingRow
            label="Валюта по умолчанию"
            options={["RUB", "USD", "EUR"]}
            value={userSettings.defaultCurrency}
            onSelect={(value) =>
              void updateUserSettings({
                defaultCurrency: value as UserLocalSettings["defaultCurrency"],
              })
            }
          />
          <SettingRow
            label="Единицы пробега"
            options={["km", "mi"]}
            value={userSettings.distanceUnit}
            onSelect={(value) =>
              void updateUserSettings({
                distanceUnit: value as UserLocalSettings["distanceUnit"],
              })
            }
          />
          <SettingRow
            label="Формат даты"
            options={["DD.MM.YYYY", "YYYY-MM-DD"]}
            value={userSettings.dateFormat}
            onSelect={(value) =>
              void updateUserSettings({
                dateFormat: value as UserLocalSettings["dateFormat"],
              })
            }
          />
          <SettingRow
            label="Напоминание по умолчанию"
            options={["7", "14", "30"]}
            value={String(userSettings.defaultSnoozeDays)}
            onSelect={(value) =>
              void updateUserSettings({
                defaultSnoozeDays: Number(value) as UserLocalSettings["defaultSnoozeDays"],
              })
            }
            optionLabelSuffix=" дней"
          />
          <SettingRow
            label="Срок хранения мотоцикла на Свалке"
            options={["7", "14", "30", "60", "90"]}
            value={String(userSettings.vehicleTrashRetentionDays)}
            onSelect={(value) =>
              void updateUserSettings({
                vehicleTrashRetentionDays: Number(
                  value
                ) as UserLocalSettings["vehicleTrashRetentionDays"],
              })
            }
            optionLabelSuffix=" дней"
          />
          <SettingRow
            label="Вид узлов по умолчанию"
            options={["top", "all"]}
            value={userSettings.defaultNodeView}
            onSelect={(value) =>
              void updateUserSettings({
                defaultNodeView: value as UserLocalSettingsNodeView,
              })
            }
            optionLabels={{ top: "ТОП-узлы", all: "Все узлы" }}
          />
          <InfoRow label="Единицы моточасов" value={userSettings.engineHoursUnit} />
        </View>

        <View style={styles.section}>
          <View style={styles.topNodesHeader}>
            <Pressable
              style={({ pressed }) => [styles.topNodesHeaderToggle, pressed && styles.topNodesHeaderTogglePressed]}
              onPress={() => setTopNodesExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: topNodesExpanded }}
            >
              <Text style={styles.topNodesChevron}>{topNodesExpanded ? "▼" : "▶"}</Text>
              <View style={styles.topNodesHeaderText}>
                <Text style={styles.sectionTitle}>Мой ТОП узлов</Text>
                <Text style={styles.topNodesSubtitle}>
                  {`${effectiveTopNodeCodes.length} / ${MAX_FAVORITE_NODE_CODES} узлов`}
                  {isUsingCustomNodes ? " · персональный" : " · стандартный"}
                </Text>
              </View>
            </Pressable>
            {isUsingCustomNodes ? (
              <Pressable
                style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                onPress={resetFavoriteNodes}
              >
                <Text style={styles.resetButtonText}>Сбросить</Text>
              </Pressable>
            ) : null}
          </View>

          {topNodesExpanded ? (
          <>
          <Text style={styles.topNodesHint}>
            {isUsingCustomNodes
              ? "Ваш набор ТОП-узлов. Группы совпадают с дашбордом мотоцикла."
              : "Стандартный набор ТОП-узлов. Любое изменение сохранит персональный список."}
          </Text>

          {topNodeProfileGroups.length === 0 ? (
            <Text style={styles.topNodesEmptyText}>Не удалось загрузить список узлов</Text>
          ) : (
            <View style={styles.topGroupsWrap}>
              {topNodeProfileGroups.map((group) => (
                <View key={group.key} style={styles.topGroupCard}>
                  <View style={styles.topGroupHeader}>
                    <Text style={styles.topGroupTitle}>{group.title}</Text>
                    <Text style={styles.topGroupCount}>{group.nodes.length}</Text>
                  </View>
                  {group.nodes.map((node) => (
                    <View key={node.code} style={styles.topNodeRow}>
                      <View style={styles.topNodeRowMain}>
                        <Text style={styles.topNodeName} numberOfLines={2}>
                          {node.name}
                        </Text>
                        <Text style={styles.topNodeCode} numberOfLines={1}>
                          {node.code}
                        </Text>
                      </View>
                      <View style={styles.topNodeActions}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.topNodeActionButton,
                            pressed && styles.topNodeActionButtonPressed,
                          ]}
                          onPress={() => void openReplaceNodePicker(node.code)}
                        >
                          <Text style={styles.topNodeActionText}>Заменить</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.topNodeActionButton,
                            styles.topNodeActionButtonDanger,
                            pressed && styles.topNodeActionButtonPressed,
                          ]}
                          onPress={() => removeFavoriteNode(node.code)}
                        >
                          <Text style={[styles.topNodeActionText, styles.topNodeActionTextDanger]}>
                            Удалить
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.addNodeButton,
              isAtMaxNodes && styles.addNodeButtonDisabled,
              pressed && styles.addNodeButtonPressed,
            ]}
            onPress={() => void openAddNodePicker()}
            disabled={isAtMaxNodes}
          >
            <Text style={styles.addNodeButtonText}>
              {isAtMaxNodes
                ? `Максимум ${MAX_FAVORITE_NODE_CODES} узлов`
                : "+ Добавить узел"}
            </Text>
          </Pressable>
          </>
          ) : null}
        </View>

        {devLoginEnabled ? (
          <View style={styles.devSection}>
            <Text style={styles.sectionTitle}>Разработка</Text>
            <Text style={styles.devTitle}>Dev-only user switcher</Text>
            <Text style={styles.devSubtitle}>Только для разработки</Text>
            <SettingRow
              label="Активный dev-пользователь"
              options={devUserOptions.map((option) => option.email)}
              value={selectedDevUserEmail}
              onSelect={(value) => {
                void updateDevUser(value);
              }}
              optionLabels={Object.fromEntries(
                devUserOptions.map((option) => [option.email, option.label])
              )}
            />
            <Text style={styles.currentText}>Current: {selectedDevUserEmail}</Text>
          </View>
        ) : null}
      </ScrollView>

      <NodePickerModal
        visible={isPickerVisible}
        mode={pickerMode}
        nodes={serviceNodes}
        selectedCodes={editableFavoriteCodes}
        replaceTargetCode={replaceTargetCode}
        onToggle={toggleFavoriteNode}
        onReplace={(newCode) => {
          if (replaceTargetCode) {
            replaceFavoriteNode(replaceTargetCode, newCode);
          }
          setIsPickerVisible(false);
          setReplaceTargetCode(null);
        }}
        onClose={() => {
          setIsPickerVisible(false);
          setReplaceTargetCode(null);
        }}
      />
    </SafeAreaView>
  );
}

function NodePickerModal({
  visible,
  mode,
  nodes,
  selectedCodes,
  replaceTargetCode,
  onToggle,
  onReplace,
  onClose,
}: {
  visible: boolean;
  mode: "add" | "replace";
  nodes: ServiceNodeItem[];
  selectedCodes: string[];
  replaceTargetCode: string | null;
  onToggle: (code: string) => void;
  onReplace: (code: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const replaceTargetName = useMemo(() => {
    if (!replaceTargetCode) {
      return null;
    }
    return nodes.find((node) => node.code === replaceTargetCode)?.name ?? replaceTargetCode;
  }, [nodes, replaceTargetCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = nodes;
    if (mode === "replace" && replaceTargetCode) {
      list = list.filter(
        (node) => node.code === replaceTargetCode || !selectedSet.has(node.code)
      );
    }
    if (!q) {
      return list;
    }
    return list.filter(
      (node) => node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q)
    );
  }, [mode, nodes, replaceTargetCode, search, selectedSet]);

  const isAtMax = mode === "add" && selectedCodes.length >= MAX_FAVORITE_NODE_CODES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pickerStyles.container} edges={["top", "bottom"]}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>
            {mode === "replace" ? "Замена узла" : "Добавить узел"}
          </Text>
          <Text style={pickerStyles.subtitle}>
            {mode === "replace"
              ? replaceTargetName
              : `${selectedCodes.length} / ${MAX_FAVORITE_NODE_CODES}`}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={pickerStyles.closeButton}>
            <Text style={pickerStyles.closeText}>{mode === "replace" ? "Отмена" : "Готово"}</Text>
          </Pressable>
        </View>
        <View style={pickerStyles.searchWrap}>
          <TextInput
            style={pickerStyles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Поиск узла..."
            placeholderTextColor={c.textMuted}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        {isAtMax ? (
          <View style={pickerStyles.maxNotice}>
            <Text style={pickerStyles.maxNoticeText}>
              Достигнут максимум ({MAX_FAVORITE_NODE_CODES}). Удалите узел, чтобы добавить другой.
            </Text>
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          contentContainerStyle={pickerStyles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selectedSet.has(item.code);
            const isReplaceTarget = mode === "replace" && item.code === replaceTargetCode;
            const isDisabled = mode === "add" && isAtMax && !isSelected;
            return (
              <Pressable
                style={({ pressed }) => [
                  pickerStyles.row,
                  isSelected && mode === "add" && pickerStyles.rowSelected,
                  isReplaceTarget && pickerStyles.rowReplaceTarget,
                  isDisabled && pickerStyles.rowDisabled,
                  pressed && pickerStyles.rowPressed,
                ]}
                onPress={() => {
                  if (mode === "replace") {
                    onReplace(item.code);
                    return;
                  }
                  onToggle(item.code);
                }}
                disabled={isDisabled}
              >
                {mode === "add" ? (
                  <View style={pickerStyles.rowCheck}>
                    {isSelected ? <Text style={pickerStyles.checkMark}>✓</Text> : null}
                  </View>
                ) : null}
                <View style={pickerStyles.rowContent}>
                  <Text
                    style={[
                      pickerStyles.rowName,
                      isSelected && mode === "add" && pickerStyles.rowNameSelected,
                      isDisabled && pickerStyles.rowNameDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={pickerStyles.rowCode}>{item.code}</Text>
                </View>
                {mode === "replace" && !isReplaceTarget ? (
                  <Text style={pickerStyles.replacePickLabel}>Выбрать</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SettingRow({
  label,
  options,
  value,
  onSelect,
  optionLabelSuffix = "",
  optionLabels,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (next: string) => void;
  optionLabelSuffix?: string;
  optionLabels?: Record<string, string>;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingOptionsWrap}>
        {options.map((option) => {
          const isActive = option === value;
          return (
            <Pressable
              key={`${label}.${option}`}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.settingOptionChip,
                isActive && styles.settingOptionChipActive,
                pressed && styles.settingOptionChipPressed,
              ]}
            >
              <Text style={[styles.settingOptionText, isActive && styles.settingOptionTextActive]}>
                {optionLabels?.[option] ?? option}
                {optionLabelSuffix}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.canvas },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  section: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.card,
    padding: 12,
    gap: 8,
  },
  settingsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  savedText: { fontSize: 11, color: c.textMuted },
  errorText: { fontSize: 11, color: c.error },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  infoLabel: { fontSize: 13, color: c.textMuted },
  infoValue: { fontSize: 13, fontWeight: "600", color: c.textPrimary, flexShrink: 1, textAlign: "right" },
  hintText: { marginTop: 2, fontSize: 11, color: c.textMuted },
  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutButtonText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  settingRow: { gap: 6 },
  settingLabel: { fontSize: 12, color: c.textSecondary },
  settingOptionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  settingOptionChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  settingOptionChipActive: { borderColor: c.textPrimary, backgroundColor: c.textPrimary },
  settingOptionChipPressed: { opacity: 0.88 },
  settingOptionText: { fontSize: 12, color: c.textPrimary, fontWeight: "600" },
  settingOptionTextActive: { color: c.textInverse },
  // Top nodes section
  topNodesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  topNodesHeaderToggle: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  topNodesHeaderTogglePressed: { opacity: 0.85 },
  topNodesHeaderText: { flex: 1, minWidth: 0 },
  topNodesChevron: { fontSize: 12, color: c.textMuted, marginTop: 4, width: 14 },
  topNodesSubtitle: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  topNodesHint: { fontSize: 12, color: c.textSecondary, lineHeight: 18 },
  topNodesEmptyText: { fontSize: 12, color: c.textMuted },
  topGroupsWrap: { gap: 10 },
  topGroupCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
    overflow: "hidden",
  },
  topGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  topGroupTitle: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
  topGroupCount: { fontSize: 11, fontWeight: "600", color: c.textMuted },
  topNodeRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: 8,
  },
  topNodeRowMain: { gap: 2 },
  topNodeName: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  topNodeCode: { fontSize: 11, color: c.textMuted },
  topNodeActions: { flexDirection: "row", gap: 8 },
  topNodeActionButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.card,
  },
  topNodeActionButtonDanger: { borderColor: c.error },
  topNodeActionButtonPressed: { opacity: 0.75 },
  topNodeActionText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  topNodeActionTextDanger: { color: c.error },
  resetButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resetButtonPressed: { opacity: 0.7 },
  resetButtonText: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },
  addNodeButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: c.cardMuted,
  },
  addNodeButtonDisabled: { opacity: 0.4 },
  addNodeButtonPressed: { opacity: 0.7 },
  addNodeButtonText: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  // Dev section
  devSection: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  devTitle: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
  devSubtitle: { fontSize: 11, color: c.textSecondary },
  currentText: { fontSize: 11, color: c.textMuted },
});

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: c.textPrimary, flex: 1 },
  subtitle: { fontSize: 13, color: c.textMuted },
  closeButton: { paddingHorizontal: 4 },
  closeText: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: c.textPrimary,
  },
  maxNotice: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: c.cardMuted,
    borderRadius: 8,
    padding: 10,
  },
  maxNoticeText: { fontSize: 12, color: c.textSecondary },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  rowSelected: { borderColor: c.textPrimary, backgroundColor: c.cardMuted },
  rowReplaceTarget: { opacity: 0.55 },
  rowDisabled: { opacity: 0.4 },
  replacePickLabel: { fontSize: 12, fontWeight: "700", color: c.textPrimary },
  rowPressed: { opacity: 0.75 },
  rowCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 13, color: c.textPrimary, fontWeight: "700" },
  rowContent: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  rowNameSelected: { color: c.textPrimary },
  rowNameDisabled: { color: c.textMuted },
  rowCode: { fontSize: 11, color: c.textMuted, marginTop: 1 },
});
