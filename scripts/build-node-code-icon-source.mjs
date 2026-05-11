/**
 * Builds scripts/data/node-code-icon-source.json: each catalog node code maps
 * to exactly one slice from slice-inventory.json.
 *
 * Assignment: prisma/seed.ts nodeTaxonomy order × inventory sorted by
 * (sourceRel, sliceIndex). With 158 nodes and 170 slices, every node gets a
 * distinct slice (no cycling). If taxonomy grows beyond slice count, cycles
 * with a console warning.
 *
 * Run: node scripts/build-node-code-icon-source.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INV = path.join(ROOT, "scripts/data/slice-inventory.json");
const SEED = path.join(ROOT, "prisma/seed.ts");
const OUT = path.join(ROOT, "scripts/data/node-code-icon-source.json");

function parseTaxonomy() {
  const seed = fs.readFileSync(SEED, "utf8");
  const m = seed.match(/const nodeTaxonomy = \[([\s\S]*?)\] as const;/);
  if (!m) throw new Error("nodeTaxonomy not found");
  const rows = [];
  const re = /\[\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\]/g;
  let rm;
  while ((rm = re.exec(m[1]))) rows.push({ code: rm[1], name: rm[2] });
  return rows;
}

function main() {
  if (!fs.existsSync(INV)) {
    console.error("Missing", INV, "— run: npm run icons:extract-node-tree-new");
    process.exit(1);
  }
  const inventory = JSON.parse(fs.readFileSync(INV, "utf8"));
  const flat = [...inventory].sort(
    (a, b) =>
      a.sourceRel.localeCompare(b.sourceRel, "ru") ||
      a.sliceIndex - b.sliceIndex
  );
  const taxonomy = parseTaxonomy();

  if (taxonomy.length > flat.length) {
    console.warn(
      `Warning: ${taxonomy.length} nodes > ${flat.length} slices — icons will repeat`
    );
  }

  const mapping = {};
  for (let i = 0; i < taxonomy.length; i++) {
    const s = flat[i % flat.length];
    mapping[taxonomy[i].code] = {
      outRel: s.outRel,
      sourceRel: s.sourceRel,
      sourceSliceIndex: s.sliceIndex,
      reused: i >= flat.length,
    };
  }

  fs.writeFileSync(OUT, JSON.stringify(mapping, null, 2));
  console.log(
    "Wrote",
    OUT,
    "—",
    Object.keys(mapping).length,
    "codes,",
    flat.length,
    "slices"
  );
}

main();
