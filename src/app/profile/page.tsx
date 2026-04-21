"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  getUserSettingsStorageKey,
  getDevUserOptions,
  isDevLoginEnabled,
  mergeUserLocalSettings,
  normalizeDevUserEmail,
  normalizeUserLocalSettings,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import {
  DEFAULT_DEV_USER_EMAIL,
  DEV_USER_STORAGE_KEY,
  type UserLocalSettings
} from "@mototwin/types";

type ProfileViewModel = {
  displayName: string;
  email: string;
  registeredAtLabel: string;
  garageTitle: string;
};

const profileApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function buildProfileViewModel(selectedDevUserEmail: string, fromApi?: ProfileViewModel): ProfileViewModel {
  if (fromApi) {
    return fromApi;
  }
  const option = getDevUserOptions().find((item) => item.email === selectedDevUserEmail);
  return {
    displayName: option?.label ?? "Владелец",
    email: option?.email ?? "demo@mototwin.local",
    registeredAtLabel: "Не указана",
    garageTitle: option?.garageTitle ?? "Мой гараж",
  };
}

export default function ProfilePage() {
  const [userSettings, setUserSettings] = useState<UserLocalSettings>(() => ({
    ...DEFAULT_USER_LOCAL_SETTINGS,
  }));
  const [settingsSavedNotice, setSettingsSavedNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [selectedDevUserEmail, setSelectedDevUserEmail] = useState(DEFAULT_DEV_USER_EMAIL);
  const [apiProfile, setApiProfile] = useState<ProfileViewModel | null>(null);

  const getResolvedProfileEmail = (fromApi?: ProfileViewModel | null): string | null => {
    if (fromApi?.email) {
      return fromApi.email.trim().toLowerCase();
    }
    if (selectedDevUserEmail) {
      return selectedDevUserEmail.trim().toLowerCase();
    }
    return null;
  };

  const readCachedSettingsForIdentity = (identity?: string | null): UserLocalSettings | null => {
    const scopedKey = getUserSettingsStorageKey(identity);
    const fallbackKey = USER_LOCAL_SETTINGS_STORAGE_KEY;
    const keysToTry = scopedKey === fallbackKey ? [fallbackKey] : [scopedKey, fallbackKey];
    for (const key of keysToTry) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }
        return normalizeUserLocalSettings(JSON.parse(raw));
      } catch {
        continue;
      }
    }
    return null;
  };

  const writeCachedSettingsForIdentity = (identity: string | null | undefined, settings: UserLocalSettings) => {
    const scopedKey = getUserSettingsStorageKey(identity);
    const normalized = normalizeUserLocalSettings(settings);
    localStorage.setItem(scopedKey, JSON.stringify(normalized));
    localStorage.setItem(USER_LOCAL_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  };

  const devLoginEnabled = isDevLoginEnabled();
  const devUserOptions = getDevUserOptions();
  const profile = useMemo(
    () => buildProfileViewModel(selectedDevUserEmail, apiProfile ?? undefined),
    [apiProfile, selectedDevUserEmail]
  );

  const loadSettings = async () => {
    try {
      const [settingsResponse, profileResponse] = await Promise.all([
        profileApi.getUserSettings(),
        profileApi.getProfile(),
      ]);
      const resolved = normalizeUserLocalSettings(settingsResponse.settings);
      setUserSettings(resolved);
      setApiProfile({
        displayName: profileResponse.profile.displayName,
        email: profileResponse.profile.email,
        registeredAtLabel: profileResponse.profile.createdAt
          ? new Date(profileResponse.profile.createdAt).toLocaleDateString("ru-RU")
          : "Не указана",
        garageTitle: profileResponse.profile.garageTitle,
      });
      writeCachedSettingsForIdentity(profileResponse.profile.email, resolved);
      setSettingsError("");
    } catch {
      const cached = readCachedSettingsForIdentity(getResolvedProfileEmail(apiProfile));
      if (cached) {
        setUserSettings(cached);
      } else {
        setUserSettings({ ...DEFAULT_USER_LOCAL_SETTINGS });
      }
      setSettingsError("Не удалось загрузить настройки из сервера, использован локальный кэш.");
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (!devLoginEnabled) return;
    try {
      const raw = localStorage.getItem(DEV_USER_STORAGE_KEY);
      const normalized = normalizeDevUserEmail(raw ?? DEFAULT_DEV_USER_EMAIL);
      setSelectedDevUserEmail(normalized);
      localStorage.setItem(DEV_USER_STORAGE_KEY, normalized);
      Reflect.set(window, "__MOTOTWIN_DEV_USER_EMAIL__", normalized);
    } catch {
      setSelectedDevUserEmail(DEFAULT_DEV_USER_EMAIL);
      Reflect.set(window, "__MOTOTWIN_DEV_USER_EMAIL__", DEFAULT_DEV_USER_EMAIL);
    }
  }, [devLoginEnabled]);

  const saveUserSettings = async (patch: Partial<UserLocalSettings>) => {
    const next = mergeUserLocalSettings(userSettings, patch);
    setUserSettings(next);
    try {
      const updated = await profileApi.updateUserSettings(next);
      const resolved = normalizeUserLocalSettings(updated.settings);
      setUserSettings(resolved);
      writeCachedSettingsForIdentity(getResolvedProfileEmail(apiProfile), resolved);
      setSettingsError("");
      setSettingsSavedNotice("Настройки сохранены");
      window.setTimeout(() => setSettingsSavedNotice(""), 1800);
    } catch {
      setSettingsError("Не удалось сохранить настройки на сервере.");
    }
  };

  const saveDevUser = (nextEmail: string) => {
    const normalized = normalizeDevUserEmail(nextEmail);
    setSelectedDevUserEmail(normalized);
    try {
      localStorage.setItem(DEV_USER_STORAGE_KEY, normalized);
    } catch {
      // Ignore local-only settings persistence errors.
    }
    Reflect.set(window, "__MOTOTWIN_DEV_USER_EMAIL__", normalized);
    setApiProfile(null);
    void loadSettings();
  };

  return (
    <main
      className="min-h-screen px-6 py-16 text-gray-950"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Профиль</h1>
          <Link
            href="/garage"
            className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white"
            style={{ borderColor: productSemanticColors.borderStrong }}
          >
            Назад в гараж
          </Link>
        </div>

        <section
          className="rounded-2xl border p-5"
          style={{
            borderColor: productSemanticColors.border,
            backgroundColor: productSemanticColors.card,
          }}
        >
          <h2 className="text-lg font-semibold text-gray-950">Профиль</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <ProfileRow label="Имя" value={profile.displayName} />
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="Дата регистрации" value={profile.registeredAtLabel} />
            <ProfileRow label="Гараж" value={profile.garageTitle} />
          </dl>
          <p className="mt-3 text-xs text-gray-500">
            Авторизация пока не реализована, данные профиля отображаются в pre-auth режиме.
          </p>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{
            borderColor: productSemanticColors.border,
            backgroundColor: productSemanticColors.card,
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-950">Настройки</h2>
            {settingsSavedNotice ? (
              <span className="text-xs font-medium text-gray-500">{settingsSavedNotice}</span>
            ) : null}
          </div>
          {settingsError ? (
            <p className="mb-3 text-xs text-rose-600">{settingsError}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Валюта по умолчанию
              <select
                value={userSettings.defaultCurrency}
                onChange={(e) =>
                  saveUserSettings({
                    defaultCurrency: e.target.value as UserLocalSettings["defaultCurrency"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Единицы пробега
              <select
                value={userSettings.distanceUnit}
                onChange={(e) =>
                  saveUserSettings({
                    distanceUnit: e.target.value as UserLocalSettings["distanceUnit"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="km">km</option>
                <option value="mi">mi</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Формат даты
              <select
                value={userSettings.dateFormat}
                onChange={(e) =>
                  saveUserSettings({
                    dateFormat: e.target.value as UserLocalSettings["dateFormat"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Напоминание по умолчанию
              <select
                value={String(userSettings.defaultSnoozeDays)}
                onChange={(e) =>
                  saveUserSettings({
                    defaultSnoozeDays: Number(e.target.value) as UserLocalSettings["defaultSnoozeDays"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
                <option value="30">30 дней</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Единицы моточасов
              <input
                value={userSettings.engineHoursUnit}
                readOnly
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </label>
          </div>
        </section>

        {devLoginEnabled ? (
          <section
            className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
            style={{ backgroundColor: "#fffbeb" }}
          >
            <h2 className="text-lg font-semibold text-amber-900">Разработка</h2>
            <div className="mt-1 text-sm font-medium text-amber-900">Dev-only user switcher</div>
            <div className="mt-1 text-xs text-amber-800">Только для разработки</div>
            <label className="mt-3 block text-sm text-gray-700">
              Активный dev-пользователь
              <select
                value={selectedDevUserEmail}
                onChange={(e) => {
                  saveDevUser(e.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {devUserOptions.map((option) => (
                  <option key={option.email} value={option.email}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 text-xs text-gray-500">Current: {selectedDevUserEmail}</div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
