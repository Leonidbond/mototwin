import * as FileSystem from "expo-file-system/legacy";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  getUserSettingsStorageKey,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
  normalizeUserLocalSettings,
} from "@mototwin/domain";
import type { UserLocalSettings } from "@mototwin/types";

const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-user-local-settings.json`
    : null;

async function readRawSettings(userIdentity?: string | null): Promise<unknown> {
  const scopedKey = getUserSettingsStorageKey(userIdentity);
  const fallbackKey = USER_LOCAL_SETTINGS_STORAGE_KEY;
  const keysToTry = scopedKey === fallbackKey ? [fallbackKey] : [scopedKey, fallbackKey];
  if (typeof localStorage !== "undefined") {
    for (const key of keysToTry) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }
        return JSON.parse(raw);
      } catch {
        continue;
      }
    }
    return null;
  }
  if (!FILE_PATH) {
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (!info.exists) {
      return null;
    }
    const raw = await FileSystem.readAsStringAsync(FILE_PATH);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeRawSettings(value: UserLocalSettings, userIdentity?: string | null): Promise<void> {
  const scopedKey = getUserSettingsStorageKey(userIdentity);
  if (typeof localStorage !== "undefined") {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(scopedKey, serialized);
      localStorage.setItem(USER_LOCAL_SETTINGS_STORAGE_KEY, serialized);
    } catch {
      // Ignore local-only settings persistence errors.
    }
    return;
  }
  if (!FILE_PATH) {
    return;
  }
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(value));
  } catch {
    // Ignore local-only settings persistence errors.
  }
}

export async function readUserLocalSettings(): Promise<UserLocalSettings> {
  const raw = await readRawSettings();
  return normalizeUserLocalSettings(raw ?? DEFAULT_USER_LOCAL_SETTINGS);
}

export async function readUserLocalSettingsForIdentity(
  userIdentity?: string | null
): Promise<UserLocalSettings> {
  const raw = await readRawSettings(userIdentity);
  return normalizeUserLocalSettings(raw ?? DEFAULT_USER_LOCAL_SETTINGS);
}

export async function writeUserLocalSettings(next: UserLocalSettings): Promise<void> {
  await writeRawSettings(normalizeUserLocalSettings(next));
}

export async function writeUserLocalSettingsForIdentity(
  next: UserLocalSettings,
  userIdentity?: string | null
): Promise<void> {
  await writeRawSettings(normalizeUserLocalSettings(next), userIdentity);
}
