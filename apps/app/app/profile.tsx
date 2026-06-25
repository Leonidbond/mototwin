import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { createMobileApiClient, clearMobileSession } from "../src/create-mobile-api-client";
import { readAuthTokens } from "../src/auth-storage";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  buildTopNodeProfileGroups,
  catalogNodeAncestorPathLabelRu,
  filterServiceCatalogLeafNodes,
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
  type SubscriptionCurrentResponse,
  type SubscriptionPlan,
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
import { usePrivateScreenProtection } from "../src/use-private-screen-protection";
import {
  MobileNodePickerModal,
  type MobileNodePickerOption,
} from "../components/vehicle-detail/mobile-node-picker-modal";

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
  usePrivateScreenProtection();
  const apiBaseUrl = getApiBaseUrl();
  const [userSettings, setUserSettings] = useState<UserLocalSettings>({
    ...DEFAULT_USER_LOCAL_SETTINGS,
  });
  const [settingsSavedNotice, setSettingsSavedNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionCurrentResponse | null>(null);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscriptionNotice, setSubscriptionNotice] = useState("");
  const [selectedDevUserEmail, setSelectedDevUserEmail] = useState(DEFAULT_DEV_USER_EMAIL);
  const [apiProfile, setApiProfile] = useState<ReturnType<typeof buildProfileData> | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  const [serviceNodes, setServiceNodes] = useState<ServiceNodeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [topNodesExpanded, setTopNodesExpanded] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace">("add");
  const [replaceTargetCode, setReplaceTargetCode] = useState<string | null>(null);

  const devLoginEnabled = isDevLoginEnabled();
  const devUserOptions = getDevUserOptions();
  const profile = useMemo(
    () =>
      apiProfile ??
      (devLoginEnabled
        ? buildProfileData(selectedDevUserEmail)
        : {
            displayName: "—",
            email: "—",
            createdAtLabel: "—",
            garageTitle: "Мой гараж",
          }),
    [apiProfile, devLoginEnabled, selectedDevUserEmail]
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
      setSettingsError("");
    } catch {
      const fallback = await readUserLocalSettingsForIdentity(resolvedProfileIdentity);
      setUserSettings(fallback);
      setSettingsError("Не удалось загрузить настройки с сервера, использован локальный кэш.");
    }

    try {
      const topResponse = await createMobileApiClient().getTopServiceNodes();
      setTopServiceNodes(topResponse.nodes);
    } catch {
      setTopServiceNodes([]);
    }

    try {
      const subscriptionResponse = await createMobileApiClient().getSubscriptionCurrent();
      setSubscription(subscriptionResponse);
      setSubscriptionError("");
    } catch {
      setSubscription(null);
      setSubscriptionError("Не удалось загрузить подписку.");
    }
  }, [resolvedProfileIdentity]);

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

  const updateSubscriptionPlan = async (plan: SubscriptionPlan) => {
    try {
      const endpoints = createMobileApiClient();
      const updated = await endpoints.updateSubscriptionPlan({ plan });
      setSubscription(updated);
      setSubscriptionError("");
      setSubscriptionNotice("Тариф обновлен");
      setTimeout(() => setSubscriptionNotice(""), 1800);
      await loadProfileAndSettings();
    } catch {
      setSubscriptionError("Не удалось обновить тариф.");
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
  const canCustomizeTopNodes = subscription?.capabilities?.canCustomizeFavoriteNodes ?? true;
  const canUseAllNodeView = subscription?.capabilities?.defaultNodeViewAll ?? true;

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
    if (!canCustomizeTopNodes) return;
    setTopNodesExpanded(true);
    setPickerMode("add");
    setReplaceTargetCode(null);
    await ensureServiceNodesLoaded();
    setIsPickerVisible(true);
  };

  const openReplaceNodePicker = async (code: string) => {
    if (!canCustomizeTopNodes) return;
    setTopNodesExpanded(true);
    setPickerMode("replace");
    setReplaceTargetCode(code);
    await ensureServiceNodesLoaded();
    setIsPickerVisible(true);
  };

  const removeFavoriteNode = (code: string) => {
    if (!canCustomizeTopNodes) return;
    const base = resolveEditableFavoriteNodeCodes(
      userSettings.favoriteNodeCodes,
      effectiveTopNodeCodes
    );
    applyFavoriteNodeCodes(base.filter((item) => item !== code));
  };

  const replaceFavoriteNode = (oldCode: string, newCode: string) => {
    if (!canCustomizeTopNodes) return;
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
    if (!canCustomizeTopNodes) return;
    void updateUserSettings({ favoriteNodeCodes: [] });
  };

  const isUsingCustomNodes = userSettings.favoriteNodeCodes.length > 0;
  const isAtMaxNodes = editableFavoriteCodes.length >= MAX_FAVORITE_NODE_CODES;

  const leafServiceNodes = useMemo(
    () => filterServiceCatalogLeafNodes(serviceNodes),
    [serviceNodes]
  );

  const serviceNodePickerOptions = useMemo(
    (): MobileNodePickerOption[] =>
      leafServiceNodes.map((node) => ({
        id: node.id,
        code: node.code,
        name: node.name,
        level: node.level,
        pathLabel: catalogNodeAncestorPathLabelRu(serviceNodes, node.id),
      })),
    [leafServiceNodes, serviceNodes]
  );

  const topNodePickerOptions = useMemo(
    (): MobileNodePickerOption[] =>
      topServiceNodes
        .map((node) => {
          const catalogNode =
            leafServiceNodes.find((item) => item.id === node.id) ??
            leafServiceNodes.find((item) => item.code === node.code);
          if (!catalogNode) {
            return null;
          }
          return {
            id: catalogNode.id,
            code: node.code,
            name: node.name,
            level: catalogNode.level,
            pathLabel: catalogNodeAncestorPathLabelRu(serviceNodes, catalogNode.id),
          };
        })
        .filter((option) => option !== null) as MobileNodePickerOption[],
    [leafServiceNodes, serviceNodes, topServiceNodes]
  );

  const favoriteNodeIds = useMemo(() => {
    const codeSet = new Set(editableFavoriteCodes);
    return leafServiceNodes.filter((node) => codeSet.has(node.code)).map((node) => node.id);
  }, [editableFavoriteCodes, leafServiceNodes]);

  const addDisabledIds = useMemo(() => {
    if (!isAtMaxNodes || pickerMode !== "add") {
      return undefined;
    }
    return new Set(
      leafServiceNodes.filter((node) => !favoriteNodeIds.includes(node.id)).map((node) => node.id)
    );
  }, [favoriteNodeIds, isAtMaxNodes, leafServiceNodes, pickerMode]);

  const replacePickerOptions = useMemo(() => {
    if (pickerMode !== "replace" || !replaceTargetCode) {
      return serviceNodePickerOptions;
    }
    const selectedCodes = new Set(editableFavoriteCodes);
    return serviceNodePickerOptions.filter((option) => {
      const code = leafServiceNodes.find((node) => node.id === option.id)?.code;
      return code === replaceTargetCode || !selectedCodes.has(code ?? "");
    });
  }, [editableFavoriteCodes, leafServiceNodes, pickerMode, replaceTargetCode, serviceNodePickerOptions]);

  const replaceTargetName = useMemo(() => {
    if (!replaceTargetCode) {
      return null;
    }
    return serviceNodes.find((node) => node.code === replaceTargetCode)?.name ?? replaceTargetCode;
  }, [replaceTargetCode, serviceNodes]);

  const handleAddNodesConfirm = (nodeIds: string[]) => {
    const idToCode = new Map(leafServiceNodes.map((node) => [node.id, node.code]));
    const codes = nodeIds
      .map((id) => idToCode.get(id))
      .filter((code): code is string => Boolean(code));
    applyFavoriteNodeCodes(codes);
    setIsPickerVisible(false);
    setReplaceTargetCode(null);
  };

  const handleReplaceNodeSelect = (nodeId: string) => {
    if (!replaceTargetCode) {
      return;
    }
    const newCode = serviceNodes.find((node) => node.id === nodeId)?.code;
    if (newCode) {
      replaceFavoriteNode(replaceTargetCode, newCode);
    }
    setIsPickerVisible(false);
    setReplaceTargetCode(null);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Удалить аккаунт?",
      "Аккаунт и все данные (мотоциклы, журнал ТО, расходы, настройки) будут удалены безвозвратно. Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить аккаунт",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeleteAccountError("");
              setIsDeletingAccount(true);
              try {
                const tokens = await readAuthTokens();
                await createMobileApiClient().deleteAccount({
                  confirmation: "DELETE",
                  refreshToken: tokens?.refreshToken,
                });
                await clearMobileSession();
                router.replace("/login");
              } catch {
                setDeleteAccountError(
                  "Не удалось удалить аккаунт. Попробуйте позже или напишите на support@mototwin.online."
                );
              } finally {
                setIsDeletingAccount(false);
              }
            })();
          },
        },
      ]
    );
  };

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
          <Pressable style={styles.linkButton} onPress={() => router.push("/notifications")}>
            <Text style={styles.linkButtonText}>Оповещения и push</Text>
            <Text style={styles.linkButtonHint}>Список напоминаний и подключение push</Text>
          </Pressable>
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
          {!__DEV__ ? (
            <View style={styles.deleteAccountBlock}>
              <Text style={styles.deleteAccountHint}>
                Удаление аккаунта безвозвратно удалит мотоциклы, журнал обслуживания, расходы и настройки.
              </Text>
              {deleteAccountError ? <Text style={styles.errorText}>{deleteAccountError}</Text> : null}
              <Pressable
                style={[styles.deleteAccountButton, isDeletingAccount && styles.deleteAccountButtonDisabled]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Text style={styles.deleteAccountButtonText}>
                  {isDeletingAccount ? "Удаление…" : "Удалить аккаунт"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.settingsHeader}>
            <Text style={styles.sectionTitle}>Подписка</Text>
            {subscriptionNotice ? <Text style={styles.savedText}>{subscriptionNotice}</Text> : null}
          </View>
          {subscriptionError ? <Text style={styles.errorText}>{subscriptionError}</Text> : null}
          <InfoRow label="Текущий тариф" value={subscription?.plan ?? "FREE"} />
          <InfoRow
            label="Пробный доступ до"
            value={subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString("ru-RU") : "—"}
          />
          <SettingRow
            label="Выбор тарифа"
            options={["FREE", "RIDER", "PRO"]}
            value={subscription?.plan ?? "FREE"}
            onSelect={(value) => void updateSubscriptionPlan(value as SubscriptionPlan)}
          />
          <Text style={styles.hintText}>
            В Free показываются последние 10 сервисных событий. Старые записи сохраняются и снова доступны после апгрейда.
          </Text>
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
              value === "all" && !canUseAllNodeView
                ? setSettingsError("Вид «Все узлы» доступен только в Pro.")
                : void updateUserSettings({
                    defaultNodeView: value as UserLocalSettingsNodeView,
                  })
            }
            optionLabels={{
              top: "ТОП-узлы",
              all: canUseAllNodeView ? "Все узлы" : "Все узлы (Pro)",
            }}
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
            {isUsingCustomNodes && canCustomizeTopNodes ? (
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
          {!canCustomizeTopNodes ? (
            <Text style={styles.errorText}>Настройка списка ТОП-узлов доступна на тарифах Rider и Pro.</Text>
          ) : null}
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
                          disabled={!canCustomizeTopNodes}
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
                          disabled={!canCustomizeTopNodes}
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
              (isAtMaxNodes || !canCustomizeTopNodes) && styles.addNodeButtonDisabled,
              pressed && styles.addNodeButtonPressed,
            ]}
            onPress={() => void openAddNodePicker()}
            disabled={isAtMaxNodes || !canCustomizeTopNodes}
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

      <MobileNodePickerModal
        visible={isPickerVisible && pickerMode === "add"}
        title="Добавить узел"
        options={serviceNodePickerOptions}
        topOptions={topNodePickerOptions.length > 0 ? topNodePickerOptions : undefined}
        selectedIds={favoriteNodeIds}
        disabledIds={addDisabledIds}
        searchPlaceholder="Поиск узла…"
        onClose={() => {
          setIsPickerVisible(false);
          setReplaceTargetCode(null);
        }}
        onSelect={() => {}}
        onConfirmSelection={handleAddNodesConfirm}
      />
      <MobileNodePickerModal
        visible={isPickerVisible && pickerMode === "replace"}
        title={replaceTargetName ? `Замена: ${replaceTargetName}` : "Замена узла"}
        options={replacePickerOptions}
        topOptions={topNodePickerOptions.length > 0 ? topNodePickerOptions : undefined}
        searchPlaceholder="Поиск узла…"
        onClose={() => {
          setIsPickerVisible(false);
          setReplaceTargetCode(null);
        }}
        onSelect={handleReplaceNodeSelect}
      />
    </SafeAreaView>
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
  linkButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  linkButtonText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  linkButtonHint: { fontSize: 12, color: c.textMuted },
  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutButtonText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  deleteAccountBlock: { marginTop: 12, gap: 8 },
  deleteAccountHint: { fontSize: 12, color: c.textMuted, lineHeight: 18 },
  deleteAccountButton: {
    borderWidth: 1,
    borderColor: c.error,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: c.card,
  },
  deleteAccountButtonDisabled: { opacity: 0.6 },
  deleteAccountButtonText: { fontSize: 14, fontWeight: "600", color: c.error },
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
