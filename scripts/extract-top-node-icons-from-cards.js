const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = process.cwd();
const src = path.join(root, "images", "top-nodes cards.png");
const outDir = path.join(root, "images", "top-node-icons", "from-cards");
fs.mkdirSync(outDir, { recursive: true });

// Source image: 1536 x 1024. 3 cols x 2 rows of cards.
// Inner icon region inside each card (excluding the top-left number badge
// and the bottom label strip) is selected explicitly for each card.
//
// Coordinates are (left, top, right, bottom) of the region to scan for
// real stroke pixels. After that the script auto-crops to the tight
// bounding box of the icon content.
// Measured in the source (1536×1024):
//   Row 1 cards: y=56..517, icon ink y≈168..376, label strip y≈440..488
//   Row 2 cards: y=541..963, icon ink y≈573..855, label strip y≈893..917
//   Number badges: ≈60×60 circles at x=60..120, y=88..148 relative to card top
// Scan boxes cover the full icon band with ~30 px margin above and below, but
// stop well before the label strip.  The number badge is masked out below so
// it never participates in the bbox/auto-crop.
const cards = [
  { name: "lubrication",     scanLeft:   40, scanTop:  60, scanRight:  490, scanBottom: 410 },
  { name: "engine_cooling",  scanLeft:  543, scanTop:  60, scanRight:  990, scanBottom: 410 },
  { name: "brakes",          scanLeft: 1043, scanTop:  60, scanRight: 1500, scanBottom: 410 },
  { name: "tires",           scanLeft:   40, scanTop: 555, scanRight:  490, scanBottom: 880 },
  { name: "chain_sprockets", scanLeft:  543, scanTop: 555, scanRight:  990, scanBottom: 880 },
  { name: "suspension",      scanLeft: 1043, scanTop: 555, scanRight: 1500, scanBottom: 880 },
];

// Badge mask relative to the scan origin.  Blanks out the upper-left corner
// where the circled card number lives, without reaching into icon artwork.
const BADGE_MASK = { width: 95, height: 100 };

const OUTPUT_SIZE = 512;
const PADDING_PX = 16;

// Pixel classification thresholds, tuned to the MotoTwin cards background
// (dark navy ~20-45 brightness).
const NEAR_BLACK_MAX = 64;       // below this -> background noise, drop
const NEUTRAL_BRIGHT_MIN = 90;   // below this for neutral pixels -> drop
const COLOR_SAT_MIN = 32;        // below this -> treated as neutral
const COLOR_GAMMA = 0.55;        // alpha curve for colored strokes
const NEUTRAL_GAMMA = 0.45;      // alpha curve for neutral (grey) strokes

function processPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;

  if (max < NEAR_BLACK_MAX) return [0, 0, 0, 0];

  if (sat >= COLOR_SAT_MIN) {
    // Colored stroke: push hue toward saturation for extra punch and derive
    // alpha from both brightness and saturation.
    const norm = Math.min(
      1,
      Math.max((max - NEAR_BLACK_MAX) / 160, sat / 160)
    );
    const alpha = Math.round(Math.pow(norm, COLOR_GAMMA) * 255);
    const k = Math.min(1, sat / 180);
    const pr = Math.round(r + (r - min) * k * 0.55);
    const pg = Math.round(g + (g - min) * k * 0.55);
    const pb = Math.round(b + (b - min) * k * 0.55);
    return [clamp(pr), clamp(pg), clamp(pb), alpha];
  }

  // Neutral / grey stroke: stricter brightness floor + stronger alpha curve so
  // outlines read crisply on a dark UI background.
  if (max < NEUTRAL_BRIGHT_MIN) return [0, 0, 0, 0];
  const norm = Math.min(1, (max - NEAR_BLACK_MAX) / 140);
  const alpha = Math.round(Math.pow(norm, NEUTRAL_GAMMA) * 255);
  const brightened = clamp(Math.round(max * 1.25));
  return [brightened, brightened, brightened, alpha];
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

async function processCard(card) {
  const regionWidth = card.scanRight - card.scanLeft;
  const regionHeight = card.scanBottom - card.scanTop;

  const { data, info } = await sharp(src)
    .extract({
      left: card.scanLeft,
      top: card.scanTop,
      width: regionWidth,
      height: regionHeight,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { channels } = info;
  const rgba = Buffer.alloc(regionWidth * regionHeight * 4);

  let minX = regionWidth, minY = regionHeight, maxX = -1, maxY = -1;

  for (let y = 0; y < regionHeight; y += 1) {
    for (let x = 0; x < regionWidth; x += 1) {
      const idx = (y * regionWidth + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const [pr, pg, pb, pa] = processPixel(r, g, b);
      const outIdx = (y * regionWidth + x) * 4;
      rgba[outIdx] = pr;
      rgba[outIdx + 1] = pg;
      rgba[outIdx + 2] = pb;
      rgba[outIdx + 3] = pa;

      // Ignore the number badge corner while computing the bbox.
      const inBadge = x < BADGE_MASK.width && y < BADGE_MASK.height;

      if (pa >= 16 && !inBadge) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Blank out the badge zone in the final output as well.
  for (let y = 0; y < BADGE_MASK.height && y < regionHeight; y += 1) {
    for (let x = 0; x < BADGE_MASK.width && x < regionWidth; x += 1) {
      const idx = (y * regionWidth + x) * 4;
      rgba[idx] = 0;
      rgba[idx + 1] = 0;
      rgba[idx + 2] = 0;
      rgba[idx + 3] = 0;
    }
  }

  if (maxX < 0) {
    throw new Error(`No icon pixels detected for card ${card.name}`);
  }

  const padLeft = Math.max(0, minX - PADDING_PX);
  const padTop = Math.max(0, minY - PADDING_PX);
  const padRight = Math.min(regionWidth - 1, maxX + PADDING_PX);
  const padBottom = Math.min(regionHeight - 1, maxY + PADDING_PX);

  const cropWidth = padRight - padLeft + 1;
  const cropHeight = padBottom - padTop + 1;

  const cropped = Buffer.alloc(cropWidth * cropHeight * 4);
  for (let y = 0; y < cropHeight; y += 1) {
    const srcY = y + padTop;
    for (let x = 0; x < cropWidth; x += 1) {
      const srcX = x + padLeft;
      const srcIdx = (srcY * regionWidth + srcX) * 4;
      const dstIdx = (y * cropWidth + x) * 4;
      cropped[dstIdx] = rgba[srcIdx];
      cropped[dstIdx + 1] = rgba[srcIdx + 1];
      cropped[dstIdx + 2] = rgba[srcIdx + 2];
      cropped[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }

  await sharp(cropped, {
    raw: { width: cropWidth, height: cropHeight, channels: 4 },
  })
    .resize({
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(outDir, `${card.name}.png`));

  process.stdout.write(
    `wrote ${card.name}.png  (bbox ${cropWidth}x${cropHeight}, padded)\n`
  );
}

async function main() {
  for (const card of cards) {
    await processCard(card);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
