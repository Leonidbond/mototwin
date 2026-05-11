import * as FileSystem from "expo-file-system/legacy";
import { DEFAULT_DEV_USER_EMAIL, DEV_USER_STORAGE_KEY } from "@mototwin/types";
import { normalizeDevUserEmail } from "@mototwin/domain";

const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-dev-user-selection.json`
    : null;

function setGlobalDevUserEmail(email: string): void {
  Reflect.set(globalThis, "__MOTOTWIN_DEV_USER_EMAIL__", email);
}

async function readRawSelection(): Promise<unknown> {
  if (typeof localStorage !== "undefined") {
    try {
      return localStorage.getItem(DEV_USER_STORAGE_KEY);
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
    return await FileSystem.readAsStringAsync(FILE_PATH);
  } catch {
    return null;
  }
}

async function writeRawSelection(email: string): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(DEV_USER_STORAGE_KEY, email);
    } catch {
      // Ignore local-only persistence errors.
    }
    return;
  }
  if (!FILE_PATH) {
    return;
  }
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, email);
  } catch {
    // Ignore local-only persistence errors.
  }
}

export async function readDevUserSelection(): Promise<string> {
  const raw = await readRawSelection();
  const normalized = normalizeDevUserEmail(raw ?? DEFAULT_DEV_USER_EMAIL);
  setGlobalDevUserEmail(normalized);
  return normalized;
}

export async function writeDevUserSelection(email: string): Promise<string> {
  const normalized = normalizeDevUserEmail(email);
  await writeRawSelection(normalized);
  setGlobalDevUserEmail(normalized);
  return normalized;
}
