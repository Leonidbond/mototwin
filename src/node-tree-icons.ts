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
};

function normalizeNodeTreeIconKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const FALLBACK_NODE_ICON_KEY = "engine";

export function getNodeTreeIconAsset(code: string, _name = ""): NodeTreeIconAsset {
  const key = normalizeNodeTreeIconKey(code);
  const direct = NODE_TREE_ICON_BY_CODE[key];
  if (direct) return direct;
  return NODE_TREE_ICON_BY_CODE[FALLBACK_NODE_ICON_KEY];
}

export function getNodeTreeIconWebSrc(code: string, name = ""): string {
  const asset = getNodeTreeIconAsset(code, name) as {
    default?: { src?: string };
    src?: string;
  };
  return asset.src ?? asset.default?.src ?? "";
}

