import * as FileSystem from "expo-file-system/legacy";

type BoolPrefMap = Record<string, boolean>;

const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-ui-collapsible-preferences.json`
    : null;

async function readAllPrefs(): Promise<BoolPrefMap> {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("mototwin.ui-collapsible-preferences");
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as BoolPrefMap;
      }
    } catch {
      return {};
    }
    return {};
  }

  if (!FILE_PATH) {
    return {};
  }
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (!info.exists) {
      return {};
    }
    const raw = await FileSystem.readAsStringAsync(FILE_PATH);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as BoolPrefMap;
    }
    return {};
  } catch {
    return {};
  }
}

async function writeAllPrefs(next: BoolPrefMap): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("mototwin.ui-collapsible-preferences", JSON.stringify(next));
    } catch {
      // Ignore storage write errors in UI prefs.
    }
    return;
  }

  if (!FILE_PATH) {
    return;
  }
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(next));
  } catch {
    // Ignore storage write errors in UI prefs.
  }
}

export async function readCollapsiblePreference(key: string): Promise<boolean | null> {
  const all = await readAllPrefs();
  const value = all[key];
  return typeof value === "boolean" ? value : null;
}

export async function writeCollapsiblePreference(key: string, value: boolean): Promise<void> {
  const all = await readAllPrefs();
  const next: BoolPrefMap = { ...all, [key]: value };
  await writeAllPrefs(next);
}
