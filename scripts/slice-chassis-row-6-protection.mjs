/**
 * Slices CHASSIS sprite: 1 row × 6 columns (equal width) → by-label/CHASSIS/
 *
 * Run: node scripts/slice-chassis-row-6-protection.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SRC = path.join(
  ROOT,
  "images/node-tree-icons-new/CHASSIS/7 Рама и кузов + разделы ВАР 1 (4).png"
);
const OUT_DIR = path.join(
  ROOT,
  "images/node-tree-icons/from-design/by-label/CHASSIS"
);

/** Left-to-right (labels on sheet). */
const SLICES = [
  { file: "CHASSIS.PLASTICS.FORK_GUARDS.png", rawLabel: "Защита вилки" },
  { file: "CHASSIS.PLASTICS.HANDGUARDS.png", rawLabel: "Защита рук" },
  { file: "CHASSIS.PROTECTION.png", rawLabel: "Защита" },
  { file: "CHASSIS.PROTECTION.SKID.png", rawLabel: "Защита картера" },
  { file: "CHASSIS.PROTECTION.RADIATOR.png", rawLabel: "Защита радиаторов" },
  { file: "CHASSIS.PROTECTION.FRAME.png", rawLabel: "Защита рамы/маятника" },
];

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing source:", SRC);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const meta = await sharp(SRC).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) {
    console.error("Could not read dimensions");
    process.exit(1);
  }
  const n = SLICES.length;
  for (let i = 0; i < n; i++) {
    const left = Math.floor((i * W) / n);
    const right = Math.floor(((i + 1) * W) / n);
    const width = right - left;
    const dest = path.join(OUT_DIR, SLICES[i].file);
    await sharp(SRC)
      .extract({ left, top: 0, width, height: H })
      .png()
      .toFile(dest);
    console.log("Wrote", path.relative(ROOT, dest), `${width}×${H}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
