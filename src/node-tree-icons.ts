declare const require: (path: string) => unknown;

export type NodeTreeIconAsset = unknown;

/** One asset per catalog node (see scripts/data/node-code-icon-source.json). */
const NODE_TREE_ICON_BY_CODE: Record<string, NodeTreeIconAsset> = {
  "brakes": require("../images/node-tree-icons/nodes/brakes.png"),
  "brakes-abs": require("../images/node-tree-icons/nodes/brakes-abs.png"),
  "brakes-fluid": require("../images/node-tree-icons/nodes/brakes-fluid.png"),
  "brakes-front": require("../images/node-tree-icons/nodes/brakes-front.png"),
  "brakes-front-caliper": require("../images/node-tree-icons/nodes/brakes-front-caliper.png"),
  "brakes-front-disc": require("../images/node-tree-icons/nodes/brakes-front-disc.png"),
  "brakes-front-line": require("../images/node-tree-icons/nodes/brakes-front-line.png"),
  "brakes-front-master": require("../images/node-tree-icons/nodes/brakes-front-master.png"),
  "brakes-front-pads": require("../images/node-tree-icons/nodes/brakes-front-pads.png"),
  "brakes-rear": require("../images/node-tree-icons/nodes/brakes-rear.png"),
  "brakes-rear-caliper": require("../images/node-tree-icons/nodes/brakes-rear-caliper.png"),
  "brakes-rear-disc": require("../images/node-tree-icons/nodes/brakes-rear-disc.png"),
  "brakes-rear-line": require("../images/node-tree-icons/nodes/brakes-rear-line.png"),
  "brakes-rear-master": require("../images/node-tree-icons/nodes/brakes-rear-master.png"),
  "brakes-rear-pads": require("../images/node-tree-icons/nodes/brakes-rear-pads.png"),
  "chassis": require("../images/node-tree-icons/nodes/chassis.png"),
  "chassis-frame": require("../images/node-tree-icons/nodes/chassis-frame.png"),
  "chassis-mounts": require("../images/node-tree-icons/nodes/chassis-mounts.png"),
  "chassis-plastics": require("../images/node-tree-icons/nodes/chassis-plastics.png"),
  "chassis-plastics-fenders": require("../images/node-tree-icons/nodes/chassis-plastics-fenders.png"),
  "chassis-plastics-fork-guards": require("../images/node-tree-icons/nodes/chassis-plastics-fork-guards.png"),
  "chassis-plastics-handguards": require("../images/node-tree-icons/nodes/chassis-plastics-handguards.png"),
  "chassis-plastics-side": require("../images/node-tree-icons/nodes/chassis-plastics-side.png"),
  "chassis-protection": require("../images/node-tree-icons/nodes/chassis-protection.png"),
  "chassis-protection-frame": require("../images/node-tree-icons/nodes/chassis-protection-frame.png"),
  "chassis-protection-radiator": require("../images/node-tree-icons/nodes/chassis-protection-radiator.png"),
  "chassis-protection-skid": require("../images/node-tree-icons/nodes/chassis-protection-skid.png"),
  "chassis-seat": require("../images/node-tree-icons/nodes/chassis-seat.png"),
  "chassis-subframe": require("../images/node-tree-icons/nodes/chassis-subframe.png"),
};

function normalizeNodeTreeIconKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Prefer ENGINE when present; otherwise first catalog key (map may be partial). */
const FALLBACK_NODE_ICON_KEY = "brakes";

export function getNodeTreeIconAsset(code: string, _name = ""): NodeTreeIconAsset {
  const key = normalizeNodeTreeIconKey(code);
  const direct = NODE_TREE_ICON_BY_CODE[key];
  if (direct) return direct;
  const fallback = NODE_TREE_ICON_BY_CODE[FALLBACK_NODE_ICON_KEY];
  if (fallback != null) return fallback;
  return Object.values(NODE_TREE_ICON_BY_CODE)[0] as NodeTreeIconAsset;
}

export function getNodeTreeIconWebSrc(code: string, name = ""): string {
  const asset = getNodeTreeIconAsset(code, name) as {
    default?: { src?: string };
    src?: string;
  };
  return asset?.src ?? asset?.default?.src ?? "";
}

