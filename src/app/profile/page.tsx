"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { AuthGate } from "@/components/auth/AuthGate";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  buildTopNodeProfileGroups,
  getUserSettingsStorageKey,
  getDevUserOptions,
  isDevLoginEnabled,
  mergeUserLocalSettings,
  normalizeDevUserEmail,
  normalizeUserLocalSettings,
  resolveEditableFavoriteNodeCodes,
  catalogNodeAncestorPathLabelRu,
  filterServiceCatalogLeafNodes,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { BackButton } from "@/components/navigation/BackButton";
import {
  DEFAULT_DEV_USER_EMAIL,
  DEV_USER_STORAGE_KEY,
  MAX_FAVORITE_NODE_CODES,
  type ServiceNodeItem,
  type SubscriptionCurrentResponse,
  type SubscriptionPlan,
  type TopServiceNodeItem,
  type UserLocalSettings,
  type UserLocalSettingsNodeView,
} from "@mototwin/types";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import {
  NodePickerModal,
  type SharedNodePickerOption,
} from "@/app/vehicles/[id]/_components/node-picker/NodePickerModal";
import { NotificationSettingsSection } from "@/components/notification-settings-section";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";

type ProfileViewModel = {
  displayName: string;
  email: string;
  registeredAtLabel: string;
  garageTitle: string;
};

const profileApi = createWebApiClient();
const SIDEBAR_COLLAPSED_KEY = "profile.sidebar.collapsed";

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
  const router = useRouter();
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed(SIDEBAR_COLLAPSED_KEY);
  const [userSettings, setUserSettings] = useState<UserLocalSettings>(() => ({
    ...DEFAULT_USER_LOCAL_SETTINGS,
  }));
  const [settingsSavedNotice, setSettingsSavedNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionCurrentResponse | null>(null);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscriptionSavedNotice, setSubscriptionSavedNotice] = useState("");
  const [selectedDevUserEmail, setSelectedDevUserEmail] = useState(DEFAULT_DEV_USER_EMAIL);
  const [apiProfile, setApiProfile] = useState<ProfileViewModel | null>(null);

  const [serviceNodes, setServiceNodes] = useState<ServiceNodeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [topNodesExpanded, setTopNodesExpanded] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "replace">("add");
  const [replaceTargetCode, setReplaceTargetCode] = useState<string | null>(null);
  const devLoginEnabled = isDevLoginEnabled();
  const devUserOptions = getDevUserOptions();

  const getResolvedProfileEmail = (fromApi?: ProfileViewModel | null): string | null => {
    if (fromApi?.email) {
      return fromApi.email.trim().toLowerCase();
    }
    if (devLoginEnabled && selectedDevUserEmail) {
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

  const profile = useMemo((): ProfileViewModel => {
    if (apiProfile) {
      return apiProfile;
    }
    if (devLoginEnabled) {
      return buildProfileViewModel(selectedDevUserEmail);
    }
    return {
      displayName: "—",
      email: "—",
      registeredAtLabel: "—",
      garageTitle: "—",
    };
  }, [apiProfile, devLoginEnabled, selectedDevUserEmail]);

  const loadSettings = async () => {
    try {
      const [settingsResponse, profileResponse, subscriptionResponse] = await Promise.all([
        profileApi.getUserSettings(),
        profileApi.getProfile(),
        profileApi.getSubscriptionCurrent(),
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
      try {
        const topResponse = await profileApi.getTopServiceNodes();
        setTopServiceNodes(topResponse.nodes);
      } catch {
        setTopServiceNodes([]);
      }
      setSubscription(subscriptionResponse);
      setSubscriptionError("");
      setSettingsError("");
    } catch {
      const cached = readCachedSettingsForIdentity(getResolvedProfileEmail(apiProfile));
      if (cached) {
        setUserSettings(cached);
      } else {
        setUserSettings({ ...DEFAULT_USER_LOCAL_SETTINGS });
      }
      setSubscription(null);
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
      try {
        const topResponse = await profileApi.getTopServiceNodes();
        setTopServiceNodes(topResponse.nodes);
      } catch {
        // keep previous preview
      }
      setSettingsError("");
      setSettingsSavedNotice("Настройки сохранены");
      window.setTimeout(() => setSettingsSavedNotice(""), 1800);
    } catch {
      setSettingsError("Не удалось сохранить настройки на сервере.");
    }
  };

  const saveSubscriptionPlan = async (plan: SubscriptionPlan) => {
    try {
      const updated = await profileApi.updateSubscriptionPlan({ plan });
      setSubscription(updated);
      setSubscriptionError("");
      setSubscriptionSavedNotice("Тариф обновлен");
      window.setTimeout(() => setSubscriptionSavedNotice(""), 1800);
      await loadSettings();
    } catch {
      setSubscriptionError("Не удалось обновить тариф.");
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
  const navigateBackWithFallback = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/garage");
  };

  const handleLogout = async () => {
    try {
      await profileApi.logout();
    } catch {
      // Continue redirect even if API fails.
    }
    await signOut({ redirect: false });
    router.replace("/login");
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
      const response = await profileApi.getServiceNodes();
      setServiceNodes(response.nodes);
    } catch {
      // picker will show empty state
    }
  };

  const applyFavoriteNodeCodes = (nextCodes: string[]) => {
    void saveUserSettings({ favoriteNodeCodes: nextCodes });
  };

  const openAddNodePicker = async () => {
    if (!canCustomizeTopNodes) {
      return;
    }
    setTopNodesExpanded(true);
    setPickerMode("add");
    setReplaceTargetCode(null);
    await ensureServiceNodesLoaded();
    setIsPickerOpen(true);
  };

  const openReplaceNodePicker = async (code: string) => {
    if (!canCustomizeTopNodes) {
      return;
    }
    setTopNodesExpanded(true);
    setPickerMode("replace");
    setReplaceTargetCode(code);
    await ensureServiceNodesLoaded();
    setIsPickerOpen(true);
  };

  const closeNodePicker = () => {
    setIsPickerOpen(false);
    setReplaceTargetCode(null);
  };

  const removeFavoriteNode = (code: string) => {
    if (!canCustomizeTopNodes) {
      return;
    }
    const base = resolveEditableFavoriteNodeCodes(
      userSettings.favoriteNodeCodes,
      effectiveTopNodeCodes
    );
    applyFavoriteNodeCodes(base.filter((item) => item !== code));
  };

  const replaceFavoriteNode = (oldCode: string, newCode: string) => {
    if (!canCustomizeTopNodes) {
      return;
    }
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
    closeNodePicker();
  };

  const resetFavoriteNodes = () => {
    if (!canCustomizeTopNodes) {
      return;
    }
    void saveUserSettings({ favoriteNodeCodes: [] });
  };

  const isUsingCustomNodes = userSettings.favoriteNodeCodes.length > 0;
  const isAtMax = editableFavoriteCodes.length >= MAX_FAVORITE_NODE_CODES;

  const leafServiceNodes = useMemo(
    () => filterServiceCatalogLeafNodes(serviceNodes),
    [serviceNodes]
  );

  const serviceNodePickerOptions = useMemo(
    (): SharedNodePickerOption[] =>
      leafServiceNodes.map((node) => ({
        id: node.id,
        code: node.code,
        name: node.name,
        level: node.level,
        pathLabel: catalogNodeAncestorPathLabelRu(serviceNodes, node.id),
      })),
    [leafServiceNodes, serviceNodes]
  );

  const topNodePickerOptions = useMemo((): SharedNodePickerOption[] => {
    return topServiceNodes.flatMap((node) => {
      const catalogNode =
        leafServiceNodes.find((item) => item.id === node.id) ??
        leafServiceNodes.find((item) => item.code === node.code);
      if (!catalogNode) {
        return [];
      }
      return [
        {
          id: catalogNode.id,
          code: node.code,
          name: node.name,
          level: catalogNode.level,
          pathLabel: catalogNodeAncestorPathLabelRu(serviceNodes, catalogNode.id),
        },
      ];
    });
  }, [leafServiceNodes, serviceNodes, topServiceNodes]);

  const favoriteNodeIds = useMemo(() => {
    const codeSet = new Set(editableFavoriteCodes);
    return new Set(
      leafServiceNodes.filter((node) => codeSet.has(node.code)).map((node) => node.id)
    );
  }, [editableFavoriteCodes, leafServiceNodes]);

  const addDisabledIds = useMemo(() => {
    if (!isAtMax || pickerMode !== "add") {
      return undefined;
    }
    return new Set(
      leafServiceNodes.filter((node) => !favoriteNodeIds.has(node.id)).map((node) => node.id)
    );
  }, [favoriteNodeIds, isAtMax, leafServiceNodes, pickerMode]);

  const replaceDisabledIds = useMemo(() => {
    if (pickerMode !== "replace" || !replaceTargetCode) {
      return undefined;
    }
    const selectedCodes = new Set(editableFavoriteCodes);
    return new Set(
      leafServiceNodes
        .filter((node) => selectedCodes.has(node.code) && node.code !== replaceTargetCode)
        .map((node) => node.id)
    );
  }, [editableFavoriteCodes, leafServiceNodes, pickerMode, replaceTargetCode]);

  const handleAddNodesConfirm = (nodeIds: string[]) => {
    const idToCode = new Map(leafServiceNodes.map((node) => [node.id, node.code]));
    const codes = nodeIds
      .map((id) => idToCode.get(id))
      .filter((code): code is string => Boolean(code));
    applyFavoriteNodeCodes(codes);
    closeNodePicker();
  };

  const handleReplaceNodeSelect = (nodeId: string) => {
    if (!replaceTargetCode) {
      return;
    }
    const newCode = serviceNodes.find((node) => node.id === nodeId)?.code;
    if (newCode) {
      replaceFavoriteNode(replaceTargetCode, newCode);
    }
  };

  const replaceTargetName = useMemo(() => {
    if (!replaceTargetCode) {
      return null;
    }
    return serviceNodes.find((node) => node.code === replaceTargetCode)?.name ?? replaceTargetCode;
  }, [replaceTargetCode, serviceNodes]);

  return (
    <AuthGate>
    <main
      className="mt-internal-page min-h-screen text-gray-950"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 220}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
        }}
      >
        <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Профиль</h1>
          <BackButton onClick={navigateBackWithFallback} />
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
            В профиле можно управлять персональными настройками аккаунта и гаража.
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
            <h2 className="text-lg font-semibold text-gray-950">Подписка</h2>
            {subscriptionSavedNotice ? (
              <span className="text-xs font-medium text-gray-500">{subscriptionSavedNotice}</span>
            ) : null}
          </div>
          {subscriptionError ? (
            <p className="mb-3 text-xs text-rose-600">{subscriptionError}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Текущий тариф
              <select
                value={subscription?.plan ?? "FREE"}
                onChange={(e) => void saveSubscriptionPlan(e.target.value as SubscriptionPlan)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="FREE">Free</option>
                <option value="RIDER">Rider</option>
                <option value="PRO">Pro</option>
              </select>
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <p>Пробный доступ: {subscription?.isTrialActive ? "активен" : "не активен"}</p>
              <p className="mt-1 text-xs text-gray-500">
                До: {subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString("ru-RU") : "—"}
              </p>
              <Link href="/subscription" className="mt-2 inline-block text-xs font-medium text-orange-600 hover:text-orange-700">
                Сравнить тарифы
              </Link>
            </div>
          </div>
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
              Срок хранения мотоцикла на Свалке
              <select
                value={String(userSettings.vehicleTrashRetentionDays)}
                onChange={(e) =>
                  saveUserSettings({
                    vehicleTrashRetentionDays: Number(
                      e.target.value
                    ) as UserLocalSettings["vehicleTrashRetentionDays"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
                <option value="30">30 дней</option>
                <option value="60">60 дней</option>
                <option value="90">90 дней</option>
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
            <label className="text-sm text-gray-700">
              Вид узлов по умолчанию
              <select
                value={userSettings.defaultNodeView}
                onChange={(e) =>
                  void saveUserSettings({
                    defaultNodeView: e.target.value as UserLocalSettingsNodeView,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="top">ТОП-узлы</option>
                <option value="all" disabled={!canUseAllNodeView}>
                  Все узлы{canUseAllNodeView ? "" : " (только Pro)"}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{
            borderColor: productSemanticColors.border,
            backgroundColor: productSemanticColors.card,
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => setTopNodesExpanded((value) => !value)}
              aria-expanded={topNodesExpanded}
              className="flex min-w-0 flex-1 items-start gap-2 text-left"
            >
              <span
                className="mt-1 inline-flex shrink-0 text-gray-500 transition-transform"
                style={{ transform: topNodesExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                aria-hidden
              >
                ▶
              </span>
              <span className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-950">Мой ТОП узлов</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {`${effectiveTopNodeCodes.length} / ${MAX_FAVORITE_NODE_CODES} узлов`}
                  {isUsingCustomNodes ? " · персональный" : " · стандартный"}
                </p>
              </span>
            </button>
            {isUsingCustomNodes && canCustomizeTopNodes ? (
              <button
                type="button"
                onClick={resetFavoriteNodes}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Сбросить до стандартного
              </button>
            ) : null}
          </div>

          {topNodesExpanded ? (
          <>
          {!canCustomizeTopNodes ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Настройка списка ТОП-узлов доступна на тарифах Rider и Pro.
            </div>
          ) : null}
          <p className="text-sm text-gray-500 mb-3">
            {isUsingCustomNodes
              ? "Ваш набор ТОП-узлов. Группы совпадают с дашбордом мотоцикла."
              : "Стандартный набор ТОП-узлов. Любое изменение сохранит персональный список."}
          </p>

          {topNodeProfileGroups.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">Не удалось загрузить список узлов</p>
          ) : (
            <div className="mb-3 space-y-3">
              {topNodeProfileGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
                    <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
                    <span className="text-xs font-medium text-gray-500">{group.nodes.length}</span>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {group.nodes.map((node) => (
                      <li key={node.code} className="px-3 py-2.5 bg-white">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{node.name}</p>
                            <p className="text-xs text-gray-400 truncate">{node.code}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => void openReplaceNodePicker(node.code)}
                              disabled={!canCustomizeTopNodes}
                              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Заменить
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFavoriteNode(node.code)}
                              disabled={!canCustomizeTopNodes}
                              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void openAddNodePicker()}
            disabled={isAtMax || !canCustomizeTopNodes}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAtMax ? `Максимум ${MAX_FAVORITE_NODE_CODES} узлов` : "+ Добавить узел"}
          </button>

          <NodePickerModal
            key={
              isPickerOpen && pickerMode === "add"
                ? `add:${[...favoriteNodeIds].sort().join("|")}`
                : "add-shut"
            }
            open={isPickerOpen && pickerMode === "add"}
            title="Добавить узел"
            mode="multi"
            options={serviceNodePickerOptions}
            topOptions={topNodePickerOptions.length > 0 ? topNodePickerOptions : undefined}
            selectedIds={favoriteNodeIds}
            disabledIds={addDisabledIds}
            confirmLabel="Сохранить"
            searchPlaceholder="Поиск узла…"
            onClose={closeNodePicker}
            onConfirm={handleAddNodesConfirm}
          />
          <NodePickerModal
            open={isPickerOpen && pickerMode === "replace"}
            title={replaceTargetName ? `Замена: ${replaceTargetName}` : "Замена узла"}
            mode="single"
            options={serviceNodePickerOptions}
            topOptions={topNodePickerOptions.length > 0 ? topNodePickerOptions : undefined}
            disabledIds={replaceDisabledIds}
            searchPlaceholder="Поиск узла…"
            onClose={closeNodePicker}
            onSelect={handleReplaceNodeSelect}
          />
          </>
          ) : null}
        </section>

        <section
          className="rounded-2xl border border-gray-200 bg-white p-5"
          style={{
            backgroundColor: productSemanticColors.card,
            borderColor: productSemanticColors.border,
          }}
        >
          <NotificationSettingsSection />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Выйти из аккаунта
          </button>
        </section>

        {devLoginEnabled ? (
          <section
            className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
            style={{
              backgroundColor: productSemanticColors.cardMuted,
              borderColor: productSemanticColors.borderStrong,
            }}
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
      </section>
      </div>
    </main>
    </AuthGate>
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
