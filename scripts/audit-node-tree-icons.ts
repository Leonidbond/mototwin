/**
 * Verifies catalog nodeTaxonomy ↔ node-code-icon-source.json ↔ nodes/*.png
 * and manifest.json (one PNG per node, unique file bytes).
 *
 * Run: npm run icons:audit-node-tree
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function parseTaxonomy(): { code: string; name: string }[] {
  const seed = fs.readFileSync(path.join(ROOT, "prisma/seed.ts"), "utf8");
  const m = seed.match(/const nodeTaxonomy = \[([\s\S]*?)\] as const;/);
  if (!m) throw new Error("nodeTaxonomy not found");
  const rows: { code: string; name: string }[] = [];
  const re = /\[\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\]/g;
  let rm;
  while ((rm = re.exec(m[1]))) rows.push({ code: rm[1], name: rm[2] });
  return rows;
}

function normalizeNodeTreeIconKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\\\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sha256File(fp: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(fp)).digest("hex");
}

function main() {
  const taxonomy = parseTaxonomy();
  const mapPath = path.join(ROOT, "scripts/data/node-code-icon-source.json");
  const mapping = JSON.parse(fs.readFileSync(mapPath, "utf8")) as Record<
    string,
    { outRel: string }
  >;
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "images/node-tree-icons/manifest.json"),
      "utf8"
    )
  ) as Record<string, string>;

  const errors: string[] = [];
  if (Object.keys(mapping).length === 0) {
    console.log("SKIP — node-code-icon-source.json is empty (no built node icons)");
    process.exit(0);
  }

  if (Object.keys(mapping).length !== taxonomy.length) {
    errors.push(
      `mapping size ${Object.keys(mapping).length} !== taxonomy ${taxonomy.length}`
    );
  }

  for (const { code } of taxonomy) {
    if (!mapping[code]) errors.push(`missing mapping for ${code}`);
  }

  const hashes = new Map<string, string[]>();
  for (const { code } of taxonomy) {
    const key = normalizeNodeTreeIconKey(code);
    const rel = manifest[key];
    if (!rel) errors.push(`manifest missing ${key}`);
    const fp = path.join(ROOT, "images/node-tree-icons", rel);
    if (!fs.existsSync(fp)) errors.push(`missing file ${rel}`);
    else {
      const h = sha256File(fp);
      const g = hashes.get(h) ?? [];
      g.push(key);
      hashes.set(h, g);
    }
  }

  const dup = [...hashes.values()].filter((g) => g.length > 1);
  if (dup.length) {
    errors.push(`duplicate PNG bytes: ${dup.map((g) => g.join("=")).join("; ")}`);
  }

  if (errors.length) {
    console.error("FAILED");
    for (const e of errors) console.error(" ", e);
    process.exit(1);
  }

  console.log("OK —", taxonomy.length, "nodes, unique PNG bytes, manifest aligned");
}

main();
