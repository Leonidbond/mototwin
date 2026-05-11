/**
 * Generates src/node-tree-icons.ts with one require() per catalog node code.
 *
 * Run: node scripts/generate-node-tree-icons-ts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAP = path.join(ROOT, "scripts/data/node-code-icon-source.json");
const OUT = path.join(ROOT, "src/node-tree-icons.ts");

function normalizeNodeTreeIconKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\\\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function main() {
  const mapping = JSON.parse(fs.readFileSync(MAP, "utf8"));
  const codes = Object.keys(mapping).sort((a, b) => {
    const ka = normalizeNodeTreeIconKey(a);
    const kb = normalizeNodeTreeIconKey(b);
    return ka.localeCompare(kb);
  });

  const lines = [];
  lines.push(`declare const require: (path: string) => unknown;`);
  lines.push(``);
  lines.push(`export type NodeTreeIconAsset = unknown;`);
  lines.push(``);
  lines.push(
    `/** One asset per catalog node (see scripts/data/node-code-icon-source.json). */`
  );
  lines.push(`const NODE_TREE_ICON_BY_CODE: Record<string, NodeTreeIconAsset> = {`);
  for (const code of codes) {
    const key = normalizeNodeTreeIconKey(code);
    lines.push(
      `  ${JSON.stringify(key)}: require("../images/node-tree-icons/nodes/${key}.png"),`
    );
  }
  lines.push(`};`);
  lines.push(``);
  lines.push(`function normalizeNodeTreeIconKey(value: string): string {`);
  lines.push(`  return value`);
  lines.push(`    .trim()`);
  lines.push(`    .toLowerCase()`);
  lines.push(`    .replace(/[_./\\s]+/g, "-")`);
  lines.push(`    .replace(/-+/g, "-")`);
  lines.push(`    .replace(/^-|-$/g, "");`);
  lines.push(`}`);
  lines.push(``);
  const fallbackKey = normalizeNodeTreeIconKey("ENGINE");
  lines.push(`const FALLBACK_NODE_ICON_KEY = ${JSON.stringify(fallbackKey)};`);
  lines.push(``);
  lines.push(`export function getNodeTreeIconAsset(code: string, _name = ""): NodeTreeIconAsset {`);
  lines.push(`  const key = normalizeNodeTreeIconKey(code);`);
  lines.push(`  const direct = NODE_TREE_ICON_BY_CODE[key];`);
  lines.push(`  if (direct) return direct;`);
  lines.push(`  return NODE_TREE_ICON_BY_CODE[FALLBACK_NODE_ICON_KEY];`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function getNodeTreeIconWebSrc(code: string, name = ""): string {`);
  lines.push(`  const asset = getNodeTreeIconAsset(code, name) as {`);
  lines.push(`    default?: { src?: string };`);
  lines.push(`    src?: string;`);
  lines.push(`  };`);
  lines.push(`  return asset.src ?? asset.default?.src ?? "";`);
  lines.push(`}`);
  lines.push(``);

  fs.writeFileSync(OUT, lines.join("\n") + "\n");
  console.log("Wrote", path.relative(ROOT, OUT), `(${codes.length} entries)`);

  const manifest = {};
  for (const code of codes) {
    const key = normalizeNodeTreeIconKey(code);
    manifest[key] = `nodes/${key}.png`;
  }
  fs.writeFileSync(
    path.join(ROOT, "images/node-tree-icons/manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  console.log("Wrote images/node-tree-icons/manifest.json");
}

main();
