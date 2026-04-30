declare const require: (path: string) => unknown;

export type NodeTreeIconAsset = unknown;

const NODE_TREE_ICON_BY_KEY: Record<string, NodeTreeIconAsset> = {
  "engine-service": require("../images/node-tree-icons/engine-service.png"),
  "engine-lube-oil": require("../images/node-tree-icons/engine-lube-oil.png"),
  "engine-lube-filter": require("../images/node-tree-icons/engine-lube-filter.png"),
  "electrics-ignition-spark": require("../images/node-tree-icons/electrics-ignition-spark.png"),
  "intake-fuel": require("../images/node-tree-icons/intake-fuel.png"),
  "intake-filter": require("../images/node-tree-icons/intake-filter.png"),
  "fuel-lines": require("../images/node-tree-icons/fuel-lines.png"),
  "fuel-pump": require("../images/node-tree-icons/fuel-pump.png"),
  "fuel-carb": require("../images/node-tree-icons/fuel-carb.png"),
  "fuel-efi": require("../images/node-tree-icons/fuel-efi.png"),
  cooling: require("../images/node-tree-icons/cooling.png"),
  "cooling-liquid-coolant": require("../images/node-tree-icons/cooling-liquid-coolant.png"),
  "cooling-liquid-radiator": require("../images/node-tree-icons/cooling-liquid-radiator.png"),
  "cooling-liquid-pump": require("../images/node-tree-icons/cooling-liquid-pump.png"),
  "cooling-liquid-hoses": require("../images/node-tree-icons/cooling-liquid-hoses.png"),
  "cooling-liquid-thermostat": require("../images/node-tree-icons/cooling-liquid-thermostat.png"),
  exhaust: require("../images/node-tree-icons/exhaust.png"),
  "exhaust-header": require("../images/node-tree-icons/exhaust-header.png"),
  "exhaust-muffler": require("../images/node-tree-icons/exhaust-muffler.png"),
  brakes: require("../images/node-tree-icons/brakes.png"),
  "brakes-abs": require("../images/node-tree-icons/brakes-abs.png"),
  "brakes-front-caliper": require("../images/node-tree-icons/brakes-front-caliper.png"),
  "brakes-front-pads": require("../images/node-tree-icons/brakes-front-pads.png"),
  "brakes-front-disc": require("../images/node-tree-icons/brakes-front-disc.png"),
  "brakes-rear-caliper": require("../images/node-tree-icons/brakes-rear-caliper.png"),
  "brakes-rear-pads": require("../images/node-tree-icons/brakes-rear-pads.png"),
  "brakes-rear-disc": require("../images/node-tree-icons/brakes-rear-disc.png"),
  "brakes-fluid": require("../images/node-tree-icons/brakes-fluid.png"),
  "chain-drive": require("../images/node-tree-icons/chain-drive.png"),
  "drivetrain-chain": require("../images/node-tree-icons/drivetrain-chain.png"),
  "drivetrain-front-sprocket": require("../images/node-tree-icons/drivetrain-front-sprocket.png"),
  "drivetrain-rear-sprocket": require("../images/node-tree-icons/drivetrain-rear-sprocket.png"),
  "drivetrain-chain-guide": require("../images/node-tree-icons/drivetrain-chain-guide.png"),
  "drivetrain-swingarm-slider": require("../images/node-tree-icons/drivetrain-swingarm-slider.png"),
  "drivetrain-tensioners": require("../images/node-tree-icons/drivetrain-tensioners.png"),
  tires: require("../images/node-tree-icons/tires.png"),
  "tires-front": require("../images/node-tree-icons/tires-front.png"),
  "tires-rear": require("../images/node-tree-icons/tires-rear.png"),
  "tires-rimlock": require("../images/node-tree-icons/tires-rimlock.png"),
  wheels: require("../images/node-tree-icons/wheels.png"),
  "wheels-front-spokes": require("../images/node-tree-icons/wheels-front-spokes.png"),
  "wheels-front-bearings": require("../images/node-tree-icons/wheels-front-bearings.png"),
  "wheels-rear-spokes": require("../images/node-tree-icons/wheels-rear-spokes.png"),
  "wheels-rear-bearings": require("../images/node-tree-icons/wheels-rear-bearings.png"),
  "front-suspension": require("../images/node-tree-icons/front-suspension.png"),
  "suspension-front-fork": require("../images/node-tree-icons/suspension-front-fork.png"),
  "suspension-front-seals": require("../images/node-tree-icons/suspension-front-seals.png"),
  "suspension-front-bushings": require("../images/node-tree-icons/suspension-front-bushings.png"),
  "suspension-front-oil": require("../images/node-tree-icons/suspension-front-oil.png"),
  "rear-suspension": require("../images/node-tree-icons/rear-suspension.png"),
  "suspension-rear-shock": require("../images/node-tree-icons/suspension-rear-shock.png"),
  "suspension-rear-linkage": require("../images/node-tree-icons/suspension-rear-linkage.png"),
  "suspension-rear-swingarm": require("../images/node-tree-icons/suspension-rear-swingarm.png"),
  "suspension-rear-bearings": require("../images/node-tree-icons/suspension-rear-bearings.png"),
  electrics: require("../images/node-tree-icons/electrics.png"),
  "electrics-battery": require("../images/node-tree-icons/electrics-battery.png"),
  "electrics-fuses": require("../images/node-tree-icons/electrics-fuses.png"),
  "electrics-charging": require("../images/node-tree-icons/electrics-charging.png"),
  "electrics-ignition": require("../images/node-tree-icons/electrics-ignition.png"),
  "electrics-wiring": require("../images/node-tree-icons/electrics-wiring.png"),
  "electrics-lights": require("../images/node-tree-icons/electrics-lights.png"),
  controls: require("../images/node-tree-icons/controls.png"),
  "controls-throttle": require("../images/node-tree-icons/controls-throttle.png"),
  "controls-clutch": require("../images/node-tree-icons/controls-clutch.png"),
  "controls-front-brake": require("../images/node-tree-icons/controls-front-brake.png"),
  "controls-rear-brake": require("../images/node-tree-icons/controls-rear-brake.png"),
  "controls-shifter": require("../images/node-tree-icons/controls-shifter.png"),
  "controls-footpeg": require("../images/node-tree-icons/controls-footpeg.png"),
  "controls-cables": require("../images/node-tree-icons/controls-cables.png"),
  steering: require("../images/node-tree-icons/steering.png"),
  "steering-handlebar": require("../images/node-tree-icons/steering-handlebar.png"),
  "steering-grips": require("../images/node-tree-icons/steering-grips.png"),
  "steering-headset": require("../images/node-tree-icons/steering-headset.png"),
  "steering-headset-bearings": require("../images/node-tree-icons/steering-headset-bearings.png"),
  "steering-triples": require("../images/node-tree-icons/steering-triples.png"),
  "body-protection": require("../images/node-tree-icons/body-protection.png"),
  "chassis-seat": require("../images/node-tree-icons/chassis-seat.png"),
  "chassis-plastics": require("../images/node-tree-icons/chassis-plastics.png"),
  "chassis-protection": require("../images/node-tree-icons/chassis-protection.png"),
  "chassis-protection-skid": require("../images/node-tree-icons/chassis-protection-skid.png"),
  "chassis-protection-radiator": require("../images/node-tree-icons/chassis-protection-radiator.png"),
};

const NODE_TREE_ICON_ALIASES: Record<string, string> = {
  engine: "engine-service",
  "engine-service": "engine-service",
  "engine-lube": "engine-service",
  "engine-lubrication": "engine-service",
  intake: "intake-fuel",
  fuel: "intake-fuel",
  drivetrain: "chain-drive",
  chain: "chain-drive",
  "chain-drive": "chain-drive",
  suspension: "front-suspension",
  "suspension-front": "front-suspension",
  "suspension-rear": "rear-suspension",
  "rear-suspension": "rear-suspension",
  "front-suspension": "front-suspension",
  body: "body-protection",
  chassis: "body-protection",
};

function normalizeNodeTreeIconKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function pickFallbackKey(key: string, name: string): string {
  if (key.startsWith("engine")) return "engine-service";
  if (key.startsWith("brakes")) return "brakes";
  if (key.startsWith("cooling")) return "cooling";
  if (key.startsWith("intake") || key.startsWith("fuel")) return "intake-fuel";
  if (key.startsWith("exhaust")) return "exhaust";
  if (key.startsWith("drivetrain") || key.startsWith("chain")) return "chain-drive";
  if (key.startsWith("tires")) return "tires";
  if (key.startsWith("wheels")) return "wheels";
  if (key.startsWith("suspension-front")) return "front-suspension";
  if (key.startsWith("suspension-rear")) return "rear-suspension";
  if (key.startsWith("suspension")) return "front-suspension";
  if (key.startsWith("electrics")) return "electrics";
  if (key.startsWith("controls")) return "controls";
  if (key.startsWith("steering")) return "steering";
  if (key.startsWith("body") || key.startsWith("chassis")) return "body-protection";
  if (name.includes("торм")) return "brakes";
  if (name.includes("шин")) return "tires";
  if (name.includes("подвес")) return "front-suspension";
  if (name.includes("элект")) return "electrics";
  if (name.includes("рул")) return "steering";
  return "engine-service";
}

export function getNodeTreeIconAsset(code: string, name = ""): NodeTreeIconAsset {
  const key = normalizeNodeTreeIconKey(code);
  const direct = NODE_TREE_ICON_BY_KEY[key];
  if (direct) return direct;

  const alias = NODE_TREE_ICON_ALIASES[key];
  if (alias && NODE_TREE_ICON_BY_KEY[alias]) {
    return NODE_TREE_ICON_BY_KEY[alias];
  }

  return NODE_TREE_ICON_BY_KEY[pickFallbackKey(key, name.toLowerCase())];
}

export function getNodeTreeIconWebSrc(code: string, name = ""): string {
  const asset = getNodeTreeIconAsset(code, name) as {
    default?: { src?: string };
    src?: string;
  };
  return asset.src ?? asset.default?.src ?? "";
}
