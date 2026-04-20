import * as FileSystem from "expo-file-system/legacy";

type NodeSnoozeMap = Record<string, string>;

const STORAGE_KEY = "mototwin.node-snooze-preferences";
const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-node-snooze-preferences.json`
    : null;

async function readAllSnoozes(): Promise<NodeSnoozeMap> {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as NodeSnoozeMap;
      }
      return {};
    } catch {
      return {};
    }
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
      return parsed as NodeSnoozeMap;
    }
    return {};
  } catch {
    return {};
  }
}

async function writeAllSnoozes(next: NodeSnoozeMap): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore local-only UI storage errors.
    }
    return;
  }

  if (!FILE_PATH) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(next));
  } catch {
    // Ignore local-only UI storage errors.
  }
}

export function buildNodeSnoozeStorageKey(vehicleId: string, nodeId: string): string {
  return `mototwin.nodeSnooze.${vehicleId}.${nodeId}`;
}

export async function readNodeSnoozePreference(
  vehicleId: string,
  nodeId: string
): Promise<string | null> {
  const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
  const all = await readAllSnoozes();
  const value = all[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export async function readNodeSnoozePreferences(
  vehicleId: string,
  nodeIds: string[]
): Promise<Record<string, string | null>> {
  const all = await readAllSnoozes();
  const result: Record<string, string | null> = {};
  for (const nodeId of nodeIds) {
    const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
    const value = all[key];
    result[nodeId] = typeof value === "string" && value.trim() ? value : null;
  }
  return result;
}

export async function writeNodeSnoozePreference(
  vehicleId: string,
  nodeId: string,
  snoozeUntilIso: string | null
): Promise<void> {
  const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
  const all = await readAllSnoozes();
  const next = { ...all };
  if (snoozeUntilIso) {
    next[key] = snoozeUntilIso;
  } else {
    delete next[key];
  }
  await writeAllSnoozes(next);
}
