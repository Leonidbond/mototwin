import * as FileSystem from "expo-file-system/legacy";

export type NodeTreeReturnState = {
  selectedNodeId: string;
  nodeStatusFilter: string;
  nodeTreeTopOnly: boolean;
  expandedIds: string[];
};

type ReturnStateMap = Record<string, NodeTreeReturnState>;

const STORAGE_KEY = "mototwin.node-tree-return-state";
const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-node-tree-return-state.json`
    : null;

function buildKey(vehicleId: string): string {
  return `mototwin.nodeTree.returnState.${vehicleId}`;
}

async function readAll(): Promise<ReturnStateMap> {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as ReturnStateMap) : {};
    } catch {
      return {};
    }
  }

  if (!FILE_PATH) return {};
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(FILE_PATH);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as ReturnStateMap) : {};
  } catch {
    return {};
  }
}

async function writeAll(next: ReturnStateMap): Promise<void> {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore local-only UI storage errors.
    }
    return;
  }

  if (!FILE_PATH) return;
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(next));
  } catch {
    // Ignore local-only UI storage errors.
  }
}

export async function writeNodeTreeReturnState(
  vehicleId: string,
  state: NodeTreeReturnState
): Promise<void> {
  const all = await readAll();
  await writeAll({ ...all, [buildKey(vehicleId)]: state });
}

export async function consumeNodeTreeReturnState(
  vehicleId: string
): Promise<NodeTreeReturnState | null> {
  const all = await readAll();
  const key = buildKey(vehicleId);
  const value = all[key] ?? null;
  if (value) {
    const next = { ...all };
    delete next[key];
    await writeAll(next);
  }
  return value;
}
