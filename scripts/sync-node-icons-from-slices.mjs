/**
 * Copies from-design slice PNGs into images/node-tree-icons/nodes/<code>.png
 * per scripts/data/node-code-icon-source.json.
 *
 * Run: node scripts/sync-node-icons-from-slices.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAP = path.join(ROOT, "scripts/data/node-code-icon-source.json");
const FROM = path.join(ROOT, "images/node-tree-icons/from-design");
const NODES = path.join(ROOT, "images/node-tree-icons/nodes");

function normalizeNodeTreeIconKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function main() {
  const mapping = JSON.parse(fs.readFileSync(MAP, "utf8"));
  fs.mkdirSync(NODES, { recursive: true });
  let n = 0;
  for (const [code, meta] of Object.entries(mapping)) {
    const outRel = meta.outRel;
    if (!outRel) continue;
    const src = path.join(FROM, ...outRel.split("/"));
    if (!fs.existsSync(src)) {
      console.error("Missing slice:", src);
      process.exit(1);
    }
    const key = normalizeNodeTreeIconKey(code);
    const dest = path.join(NODES, `${key}.png`);
    fs.copyFileSync(src, dest);
    n++;
  }
  console.log("Copied", n, "PNGs to", path.relative(ROOT, NODES));
}

main();
