const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "images", "classes.png");
const outDir = path.join(root, "images", "motorcycle-class-silhouettes");

fs.mkdirSync(outDir, { recursive: true });

// Source image is 1536x1024 (1.5x scale of the reference grid).
// Crops below cover only the motorcycle silhouettes, without card titles or bottom icons.
const crops = [
  { name: "adventure_touring", left: 60, top: 192, width: 330, height: 210 },
  { name: "enduro_dual_sport", left: 410, top: 192, width: 330, height: 210 },
  { name: "naked_roadster", left: 780, top: 192, width: 340, height: 210 },
  { name: "sport_supersport", left: 1150, top: 192, width: 340, height: 210 },
  { name: "cruiser", left: 180, top: 630, width: 380, height: 220 },
  { name: "classic_retro", left: 600, top: 630, width: 380, height: 220 },
  { name: "scooter_maxi_scooter", left: 1010, top: 630, width: 380, height: 220 },
];

const STROKE_R = 226;
const STROKE_G = 231;
const STROKE_B = 239;

// Measured from the source: background sits below ~35, strokes span ~40..225.
const ALPHA_LOW = 40;
const ALPHA_HIGH = 165;
const GAMMA = 0.55;

function buildRgba(raw, width, height, channels) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < raw.length; i += channels, j += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const brightness = Math.max(r, g, b);

    let alpha = 0;
    if (brightness > ALPHA_LOW) {
      const span = ALPHA_HIGH - ALPHA_LOW;
      const norm = Math.min(1, (brightness - ALPHA_LOW) / span);
      alpha = Math.round(Math.pow(norm, GAMMA) * 255);
    }

    out[j] = STROKE_R;
    out[j + 1] = STROKE_G;
    out[j + 2] = STROKE_B;
    out[j + 3] = alpha;
  }
  return out;
}

async function processCrop(crop) {
  const { data, info } = await sharp(src)
    .extract({
      left: crop.left,
      top: crop.top,
      width: crop.width,
      height: crop.height,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = buildRgba(data, info.width, info.height, info.channels);

  await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(outDir, `${crop.name}.png`));

  process.stdout.write(`wrote ${crop.name}.png\n`);
}

async function main() {
  for (const crop of crops) {
    await processCrop(crop);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
