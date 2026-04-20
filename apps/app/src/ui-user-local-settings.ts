import * as FileSystem from "expo-file-system/legacy";
import {
  DEFAULT_USER_LOCAL_SETTINGS,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
  normalizeUserLocalSettings,
} from "@mototwin/domain";
import type { UserLocalSettings } from "@mototwin/types";

const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-user-local-settings.json`
    : null;

async function readRawSettings(): Promise<unknown> {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(USER_LOCAL_SETTINGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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

async function writeRawSettings(value: UserLocalSettings): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(USER_LOCAL_SETTINGS_STORAGE_KEY, JSON.stringify(value));
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

export async function writeUserLocalSettings(next: UserLocalSettings): Promise<void> {
  await writeRawSettings(normalizeUserLocalSettings(next));
}
