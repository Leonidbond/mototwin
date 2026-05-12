/**
 * Post-process CHASSIS slice PNGs (all in folder except CHASSIS.png):
 * strip bottom caption band, black → transparent, trim, normalize to square.
 *
 * Run after re-slicing: `node scripts/slice-chassis-row-7.mjs && node scripts/slice-chassis-row-6-protection.mjs && node scripts/postprocess-chassis-node-icons.mjs`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "images/node-tree-icons/from-design/by-label/CHASSIS");
const SKIP = "CHASSIS.png";

const GAP_TH = 0.022;
const OUT = 128;

/**
 * Crop height (keep rows [0, cutY)) for each slice from `7 … ВАР 1 (3)/(4).png`.
 * Re-measure if the source sprite layout changes.
 */
const CROP_HEIGHT_BY_FILE = {
  "CHASSIS.FRAME.png": 115,
  "CHASSIS.MOUNTS.png": 151,
  "CHASSIS.PLASTICS.FENDERS.png": 151,
  "CHASSIS.PLASTICS.FORK_GUARDS.png": 213,
  "CHASSIS.PLASTICS.HANDGUARDS.png": 213,
  "CHASSIS.PLASTICS.SIDE.png": 151,
  "CHASSIS.PLASTICS.png": 151,
  "CHASSIS.PROTECTION.FRAME.png": 190,
  "CHASSIS.PROTECTION.RADIATOR.png": 196,
  "CHASSIS.PROTECTION.SKID.png": 195,
  "CHASSIS.PROTECTION.png": 194,
  "CHASSIS.SEAT.png": 151,
  "CHASSIS.SUBFRAME.png": 152,
};

function findCaptionCutFallback(rd) {
  const H = rd.length;
  const PAD = 0.03;
  const CAP = 0.035;
  let y = H - 1;
  while (y >= 0 && rd[y] < PAD) y--;
  if (y < 0) return H;
  while (y >= 0 && rd[y] >= CAP) y--;
  if (y < 0) return H;
  while (y >= 0 && rd[y] < GAP_TH) y--;
  return y + 1;
}

function getCaptionCutY(rd, baseName) {
  const fixed = CROP_HEIGHT_BY_FILE[baseName];
  if (typeof fixed === "number") return Math.min(Math.max(1, fixed), rd.length);
  return findCaptionCutFallback(rd);
}
const BG_LUM_MAX = 38;
const FG_ALPHA = 255;

function rowDensities(buf, w, h, channels) {
  const rd = new Array(h);
  for (let y = 0; y < h; y++) {
    let c = 0;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = (row + x) * channels;
      const lum =
        0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
      if (lum > 35) c++;
    }
    rd[y] = c / w;
  }
  return rd;
}

function blackToTransparent(buf, w, h, channels) {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < buf.length; i += channels, j += 4) {
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum <= BG_LUM_MAX) {
      out[j] = 0;
      out[j + 1] = 0;
      out[j + 2] = 0;
      out[j + 3] = 0;
    } else {
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = FG_ALPHA;
    }
  }
  return out;
}

async function processFile(absPath) {
  const { data, info } = await sharp(absPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const rd = rowDensities(data, w, h, ch);
  const cutY = getCaptionCutY(rd, path.basename(absPath));
  const cropH = Math.max(1, Math.min(cutY, h));

  const cropped = await sharp(absPath)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = blackToTransparent(
    cropped.data,
    cropped.info.width,
    cropped.info.height,
    cropped.info.channels
  );

  await sharp(rgba, {
    raw: {
      width: cropped.info.width,
      height: cropped.info.height,
      channels: 4,
    },
  })
    .trim()
    .resize(OUT, OUT, {
      fit: "contain",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(absPath);

  console.log(
    "OK",
    path.relative(ROOT, absPath),
    `${w}×${h} → cropY ${cutY} → ${OUT}×${OUT}`
  );
}

async function main() {
  const names = fs
    .readdirSync(DIR)
    .filter((n) => n.endsWith(".png") && n !== SKIP)
    .sort();
  for (const n of names) {
    await processFile(path.join(DIR, n));
  }
  console.log("Done,", names.length, "files");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
