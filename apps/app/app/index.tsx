import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  buildGarageCardProps,
  buildGarageDashboardSummary,
  filterMeaningfulGarageSpecHighlights,
  mergeUserLocalSettings,
} from "@mototwin/domain";
import {
  productSemanticColors as c,
  radiusScale,
  statusSemanticTokens,
} from "@mototwin/design-tokens";
import type { GarageVehicleItem, UserLocalSettings } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";
import {
  readCollapsiblePreference,
  writeCollapsiblePreference,
} from "../src/ui-collapsible-preferences";
import { readUserLocalSettings, writeUserLocalSettings } from "../src/ui-user-local-settings";

export default function HomeScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUsageProfileExpanded, setIsUsageProfileExpanded] = useState(false);
  const [isTechnicalSummaryExpanded, setIsTechnicalSummaryExpanded] = useState(false);
  const [hasLoadedCollapsePrefs, setHasLoadedCollapsePrefs] = useState(false);
  const [userSettings, setUserSettings] = useState<UserLocalSettings>(() => ({
    ...DEFAULT_USER_LOCAL_SETTINGS,
  }));
  const [settingsSavedNotice, setSettingsSavedNotice] = useState("");

  const apiBaseUrl = getApiBaseUrl();

  const loadGarage = useCallback(async () => {
      try {
        setIsLoading(true);
        setError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const data = await endpoints.getGarageVehicles();
        setVehicles(data.vehicles || []);
      } catch (requestError) {
        console.error(requestError);
        setError("Не удалось загрузить гараж. Проверьте подключение к backend.");
      } finally {
        setIsLoading(false);
      }
    }, [apiBaseUrl]);

  useFocusEffect(
    useCallback(() => {
      loadGarage();
    }, [loadGarage])
  );

  useEffect(() => {
    void (async () => {
      const usage = await readCollapsiblePreference("garage.usageProfile.expanded");
      const tech = await readCollapsiblePreference("garage.technicalSummary.expanded");
      if (usage != null) {
        setIsUsageProfileExpanded(usage);
      }
      if (tech != null) {
        setIsTechnicalSummaryExpanded(tech);
      }
      setHasLoadedCollapsePrefs(true);
    })();
  }, []);
  useEffect(() => {
    void (async () => {
      const settings = await readUserLocalSettings();
      setUserSettings(settings);
    })();
  }, []);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference("garage.usageProfile.expanded", isUsageProfileExpanded);
  }, [hasLoadedCollapsePrefs, isUsageProfileExpanded]);

  useEffect(() => {
    if (!hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference("garage.technicalSummary.expanded", isTechnicalSummaryExpanded);
  }, [hasLoadedCollapsePrefs, isTechnicalSummaryExpanded]);

  const retryLoadGarage = async () => {
    try {
      setIsLoading(true);
      setError("");
      await loadGarage();
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить гараж. Проверьте подключение к backend.");
    } finally {
      setIsLoading(false);
    }
  };
  const updateUserSettings = (patch: Partial<UserLocalSettings>) => {
    const next = mergeUserLocalSettings(userSettings, patch);
    setUserSettings(next);
    void writeUserLocalSettings(next);
    setSettingsSavedNotice("Настройки сохранены");
    setTimeout(() => setSettingsSavedNotice(""), 1800);
  };
  const dashboardSummary = buildGarageDashboardSummary(vehicles);

  const renderVehicleCard = ({ item }: { item: GarageVehicleItem }) => {
    const card = buildGarageCardProps(item);
    const { summary, rideProfile } = card;
    const specHighlights = filterMeaningfulGarageSpecHighlights(card.specHighlights);

    return (
      <View style={styles.card}>
        <Text style={styles.cardCaption}>{card.brandModelCaption}</Text>
        <View style={styles.cardTitleRow}>
          <Pressable
            onPress={() => router.push(`/vehicles/${item.id}`)}
            style={styles.cardTitlePressable}
          >
            <Text style={styles.cardTitleLink} numberOfLines={2} ellipsizeMode="tail">
              {summary.title}
            </Text>
          </Pressable>
          {card.attentionIndicator.isVisible ? (
            <Pressable
              onPress={() => router.push(`/vehicles/${item.id}`)}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Требует внимания, ${card.attentionIndicator.totalCount}. Открыть карточку мотоцикла`}
              style={({ pressed }) => [
                styles.attentionChip,
                {
                  borderColor: statusSemanticTokens[card.attentionIndicator.semanticKey].border,
                  backgroundColor:
                    statusSemanticTokens[card.attentionIndicator.semanticKey].background,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.attentionDot,
                  {
                    backgroundColor:
                      statusSemanticTokens[card.attentionIndicator.semanticKey].foreground,
                  },
                ]}
              />
              <Text
                style={[
                  styles.attentionChipText,
                  { color: statusSemanticTokens[card.attentionIndicator.semanticKey].foreground },
                ]}
              >
                {card.attentionIndicator.totalCount}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.cardSubtitle}>{summary.subtitle}</Text>
        <Text style={styles.cardMeta}>{summary.yearVersionLine.replace(" · ", " | ")}</Text>
        <View style={styles.cardDivider} />
        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Пробег</Text>
            <Text style={styles.metricValue}>{summary.odometerLine}</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Моточасы</Text>
            <Text style={styles.metricValue}>
              {summary.engineHoursLineWithUnit ?? "Не указаны"}
            </Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>VIN</Text>
            <Text style={styles.metricValue}>{summary.vinLine || "Не указан"}</Text>
          </View>
        </View>

        <View style={styles.collapsibleBlock}>
          <Pressable
            onPress={() => setIsUsageProfileExpanded((prev) => !prev)}
            style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.collapsibleHeaderPressed]}
          >
            <Text style={styles.rideProfileTitle}>Профиль эксплуатации</Text>
            <Text style={styles.collapsibleChevron}>{isUsageProfileExpanded ? "▾" : "▸"}</Text>
          </Pressable>
          {isUsageProfileExpanded ? (
            rideProfile ? (
              <View style={styles.secondaryMetaWrap}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipLabel}>Сценарий: {rideProfile.usageType}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipLabel}>Стиль: {rideProfile.ridingStyle}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipLabel}>Нагрузка: {rideProfile.loadType}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipLabel}>Интенсивность: {rideProfile.usageIntensity}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noRideProfile}>Профиль эксплуатации пока не задан.</Text>
            )
          ) : null}
        </View>

        <View style={styles.collapsibleBlock}>
          <Pressable
            onPress={() => setIsTechnicalSummaryExpanded((prev) => !prev)}
            style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.collapsibleHeaderPressed]}
          >
            <Text style={styles.rideProfileTitle}>Техническая сводка</Text>
            <Text style={styles.collapsibleChevron}>{isTechnicalSummaryExpanded ? "▾" : "▸"}</Text>
          </Pressable>
          {isTechnicalSummaryExpanded ? (
            specHighlights.length > 0 ? (
              <View style={styles.secondaryMetaWrap}>
                {specHighlights.map((spec) => (
                  <View key={spec.label} style={styles.metaChip}>
                    <Text style={styles.metaChipLabel}>
                      {spec.label}: {spec.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noRideProfile}>Технические параметры пока не заполнены.</Text>
            )
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка гаража...</Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Не удалось загрузить гараж</Text>
          <Text style={styles.errorText}>{error}</Text>
          {__DEV__ ? (
            <Text style={styles.hintText}>Текущий API: {apiBaseUrl}</Text>
          ) : null}
          <Pressable onPress={retryLoadGarage} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && vehicles.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>Личный гараж пока пуст</Text>
          <Text style={styles.stateText}>
            Добавьте первый мотоцикл, чтобы начать вести обслуживание.
          </Text>
          <Pressable
            onPress={() => router.push("/vehicles/new")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Добавить мотоцикл</Text>
          </Pressable>
          <Pressable onPress={retryLoadGarage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Обновить список</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && vehicles.length > 0 ? (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderVehicleCard}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.eyebrow}>MotoTwin | Личный гараж</Text>
              <Text style={styles.title}>Мой гараж</Text>
              <Text style={styles.subtitle}>Все мотоциклы, обслуживание и покупки в одном месте</Text>
              <Text style={styles.accountHint}>Профиль: Гость</Text>
              <Text style={styles.accountHintMuted}>Авторизация пока не реализована</Text>
              <Text style={styles.description}>
                Дашборд показывает парк мотоциклов и ключевые сигналы внимания.
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryChipLabel}>Мотоциклы</Text>
                  <Text style={styles.summaryChipValue}>{dashboardSummary.motorcyclesCount}</Text>
                </View>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryChipLabel}>Требуют внимания</Text>
                  <Text style={styles.summaryChipValue}>
                    {dashboardSummary.motorcyclesWithAttentionCount}
                  </Text>
                </View>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryChipLabel}>Сигналы внимания</Text>
                  <Text style={styles.summaryChipValue}>
                    {dashboardSummary.attentionItemsTotalCount}
                  </Text>
                </View>
              </View>
              <View style={styles.settingsBox}>
                <View style={styles.settingsHeaderRow}>
                  <Text style={styles.settingsTitle}>Настройки</Text>
                  {settingsSavedNotice ? (
                    <Text style={styles.settingsSavedText}>{settingsSavedNotice}</Text>
                  ) : null}
                </View>
                <SettingRow
                  label="Валюта по умолчанию"
                  options={["RUB", "USD", "EUR"]}
                  value={userSettings.defaultCurrency}
                  onSelect={(value) =>
                    updateUserSettings({
                      defaultCurrency: value as UserLocalSettings["defaultCurrency"],
                    })
                  }
                />
                <SettingRow
                  label="Единицы пробега"
                  options={["km", "mi"]}
                  value={userSettings.distanceUnit}
                  onSelect={(value) =>
                    updateUserSettings({
                      distanceUnit: value as UserLocalSettings["distanceUnit"],
                    })
                  }
                />
                <SettingRow
                  label="Формат даты"
                  options={["DD.MM.YYYY", "YYYY-MM-DD"]}
                  value={userSettings.dateFormat}
                  onSelect={(value) =>
                    updateUserSettings({
                      dateFormat: value as UserLocalSettings["dateFormat"],
                    })
                  }
                />
                <SettingRow
                  label="Напоминание по умолчанию"
                  options={["7", "14", "30"]}
                  value={String(userSettings.defaultSnoozeDays)}
                  onSelect={(value) =>
                    updateUserSettings({
                      defaultSnoozeDays: Number(value) as UserLocalSettings["defaultSnoozeDays"],
                    })
                  }
                  optionLabelSuffix=" дней"
                />
              </View>
              <Pressable
                onPress={() => router.push("/vehicles/new")}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Добавить мотоцикл</Text>
              </Pressable>
            </View>
          }
        />
      ) : null}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function SettingRow({
  label,
  options,
  value,
  onSelect,
  optionLabelSuffix = "",
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (next: string) => void;
  optionLabelSuffix?: string;
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
                {option}
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
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "600",
    color: c.textMuted,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: c.textSecondary,
  },
  accountHint: {
    marginTop: 6,
    fontSize: 12,
    color: c.textMuted,
  },
  accountHintMuted: {
    marginTop: 2,
    fontSize: 11,
    color: c.textTertiary,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: c.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    textAlign: "center",
    color: c.error,
    fontSize: 14,
    lineHeight: 20,
  },
  hintText: {
    marginTop: 8,
    color: c.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: c.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: c.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: c.textMeta,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  listHeader: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  summaryRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryChip: {
    minWidth: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryChipLabel: {
    fontSize: 11,
    color: c.textMuted,
  },
  summaryChipValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  settingsBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.card,
    padding: 10,
    gap: 10,
  },
  settingsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  settingsSavedText: {
    fontSize: 11,
    color: c.textMuted,
  },
  settingRow: {
    gap: 6,
  },
  settingLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  settingOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  settingOptionChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  settingOptionChipActive: {
    borderColor: c.textPrimary,
    backgroundColor: c.textPrimary,
  },
  settingOptionChipPressed: {
    opacity: 0.88,
  },
  settingOptionText: {
    fontSize: 12,
    color: c.textPrimary,
    fontWeight: "600",
  },
  settingOptionTextActive: {
    color: c.textInverse,
  },
  card: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardCaption: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  cardTitlePressable: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
    justifyContent: "center",
  },
  cardTitleLink: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    color: c.textPrimary,
    textDecorationLine: "underline",
  },
  attentionChip: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
    paddingHorizontal: 8,
    paddingVertical: 0,
    gap: 5,
    borderWidth: 1,
    borderRadius: radiusScale.pill,
    flexShrink: 0,
    alignSelf: "center",
  },
  attentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  attentionChipText: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: c.textSecondary,
  },
  cardMeta: {
    marginTop: 8,
    fontSize: 13,
    color: c.textMeta,
  },
  cardDivider: {
    height: 1,
    backgroundColor: c.divider,
    marginVertical: 10,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  metricValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  rideProfileBlock: {
    marginTop: 10,
  },
  collapsibleBlock: {
    marginTop: 10,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapsibleHeaderPressed: {
    opacity: 0.92,
  },
  collapsibleChevron: {
    fontSize: 14,
    color: c.textMuted,
  },
  rideProfileTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
    marginBottom: 6,
  },
  noRideProfile: {
    marginTop: 8,
    fontSize: 12,
    color: c.textMuted,
  },
  secondaryMetaWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.chipBackground,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaChipLabel: {
    fontSize: 11,
    color: c.textSecondary,
    fontWeight: "500",
  },
});
