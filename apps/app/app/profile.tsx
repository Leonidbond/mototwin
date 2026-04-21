import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  getDevUserOptions,
  isDevLoginEnabled,
  mergeUserLocalSettings,
  normalizeDevUserEmail,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { DEFAULT_DEV_USER_EMAIL, type UserLocalSettings } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";
import { readDevUserSelection, writeDevUserSelection } from "../src/ui-dev-user-selection";
import { readUserLocalSettings, writeUserLocalSettings } from "../src/ui-user-local-settings";

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
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [userSettings, setUserSettings] = useState<UserLocalSettings>({
    ...DEFAULT_USER_LOCAL_SETTINGS,
  });
  const [settingsSavedNotice, setSettingsSavedNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [selectedDevUserEmail, setSelectedDevUserEmail] = useState(DEFAULT_DEV_USER_EMAIL);
  const [apiProfile, setApiProfile] = useState<ReturnType<typeof buildProfileData> | null>(null);

  const devLoginEnabled = isDevLoginEnabled();
  const devUserOptions = getDevUserOptions();
  const profile = useMemo(
    () => apiProfile ?? buildProfileData(selectedDevUserEmail),
    [apiProfile, selectedDevUserEmail]
  );

  const loadProfileAndSettings = async () => {
    const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
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
      await writeUserLocalSettings(resolvedSettings);
      setSettingsError("");
    } catch {
      const fallback = await readUserLocalSettings();
      setUserSettings(fallback);
      setSettingsError("Не удалось загрузить настройки с сервера, использован локальный кэш.");
    }
  };

  useEffect(() => {
    void (async () => {
      if (devLoginEnabled) {
        setSelectedDevUserEmail(await readDevUserSelection());
      }
      await loadProfileAndSettings();
    })();
  }, [devLoginEnabled]);

  const updateUserSettings = async (patch: Partial<UserLocalSettings>) => {
    const next = mergeUserLocalSettings(userSettings, patch);
    setUserSettings(next);
    try {
      const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
      const response = await endpoints.updateUserSettings(next);
      const resolved = mergeUserLocalSettings(DEFAULT_USER_LOCAL_SETTINGS, response.settings);
      setUserSettings(resolved);
      await writeUserLocalSettings(resolved);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Профиль</Text>
          <Pressable onPress={() => router.push("/")} style={styles.backButton}>
            <Text style={styles.backButtonText}>Назад в гараж</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          <InfoRow label="Имя" value={profile.displayName} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Дата регистрации" value={profile.createdAtLabel} />
          <InfoRow label="Гараж" value={profile.garageTitle} />
          <Text style={styles.hintText}>
            Авторизация пока не реализована, данные профиля отображаются в pre-auth режиме.
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
          <InfoRow label="Единицы моточасов" value={userSettings.engineHoursUnit} />
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: c.textPrimary },
  backButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.card,
  },
  backButtonText: { fontSize: 12, fontWeight: "600", color: c.textMeta },
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
  errorText: { fontSize: 11, color: "#be123c" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  infoLabel: { fontSize: 13, color: c.textMuted },
  infoValue: { fontSize: 13, fontWeight: "600", color: c.textPrimary, flexShrink: 1, textAlign: "right" },
  hintText: { marginTop: 2, fontSize: 11, color: c.textMuted },
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
  devSection: {
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  devTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  devSubtitle: { fontSize: 11, color: "#a16207" },
  currentText: { fontSize: 11, color: c.textMuted },
});
