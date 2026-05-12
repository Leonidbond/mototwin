/**
 * Slices a single-row CHASSIS sprite (7 columns, equal width) into
 * images/node-tree-icons/from-design/by-label/CHASSIS/CHASSIS.*.png
 *
 * Run: node scripts/slice-chassis-row-7.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SRC = path.join(
  ROOT,
  "images/node-tree-icons-new/CHASSIS/7 Рама и кузов + разделы ВАР 1 (3).png"
);
const OUT_DIR = path.join(
  ROOT,
  "images/node-tree-icons/from-design/by-label/CHASSIS"
);

/** Left-to-right: matches labels on the sheet (see prisma/seed CHASSIS subtree). */
const SLICES = [
  { file: "CHASSIS.FRAME.png", rawLabel: "Рама" },
  { file: "CHASSIS.SUBFRAME.png", rawLabel: "Подрамник" },
  { file: "CHASSIS.MOUNTS.png", rawLabel: "Крепёж/оси/втулки" },
  { file: "CHASSIS.SEAT.png", rawLabel: "Сиденье/чехол" },
  { file: "CHASSIS.PLASTICS.png", rawLabel: "Пластик" },
  { file: "CHASSIS.PLASTICS.FENDERS.png", rawLabel: "Крылья" },
  { file: "CHASSIS.PLASTICS.SIDE.png", rawLabel: "Боковины/панели" },
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
