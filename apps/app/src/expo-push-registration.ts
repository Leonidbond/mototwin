import Constants from "expo-constants";

const PLACEHOLDER_PROJECT_ID = "REPLACE_AFTER_eas_init";

export function getExpoProjectId(): string | null {
  const fromConfig =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } } | null)?.extra?.eas
      ?.projectId;

  const projectId = typeof fromConfig === "string" ? fromConfig.trim() : "";
  if (!projectId || projectId === PLACEHOLDER_PROJECT_ID) {
    return null;
  }
  return projectId;
}

export async function registerExpoPushToken(): Promise<
  { ok: true; token: string } | { ok: false; reason: string }
> {
  const Device = await import("expo-device");
  if (!Device.isDevice) {
    return { ok: false, reason: "Push работает только на физическом устройстве, не в симуляторе." };
  }

  const Notifications = await import("expo-notifications");
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return { ok: false, reason: "Разрешите уведомления в настройках устройства." };
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    return {
      ok: false,
      reason:
        "Не настроен EAS projectId. Выполните eas init в apps/app и пересоберите приложение.",
    };
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data?.trim();
  if (!token) {
    return { ok: false, reason: "Не удалось получить Expo push token." };
  }

  return { ok: true, token };
}
