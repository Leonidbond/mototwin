/**
 * Per-source-file icon extraction using connected components + horizontal merge.
 *
 * Spec: `scripts/data/node-tree-icons-per-file.json` (one entry per PNG under
 * `images/node-tree-icons-new/`). Step kinds:
 *   - `cc_strip` / `cc_region`: connected components + horizontal merge
 *   - `equal_cols`: fixed column grid for a horizontal band (y0..y1)
 *
 * Output: `images/node-tree-icons/from-design/<section>/<stem>/slice-###.png`
 * Optional aliases: `.../by-key/<key>.png` via `scripts/data/node-tree-icons-new-keys.json`
 * using keys `relativePath|sliceIndex` (global index per file).
 *
 * Run: `node scripts/extract-node-tree-icons-new.js`
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "images", "node-tree-icons-new");
const SPEC_PATH = path.join(__dirname, "data", "node-tree-icons-per-file.json");
const KEY_MAP_PATH = path.join(__dirname, "data", "node-tree-icons-new-keys.json");
const OUT_DIR = path.join(ROOT, "images", "node-tree-icons", "from-design");
const INVENTORY_PATH = path.join(
  ROOT,
  "scripts",
  "data",
  "slice-inventory.json"
);

const OUTPUT_MAX = 512;
const PAD = 14;
/** Alpha above this counts as opaque for bbox / edge cleanup */
const ALPHA_THRESH = 12;

function slugifySegment(name) {
  return name
    .replace(/\.png$/i, "")
    .replace(/[/\\]+/g, "__")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function walkPngs(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) out.push(...walkPngs(fp));
    else if (name.toLowerCase().endsWith(".png")) out.push(fp);
  }
  return out;
}

function mergeBoxesHoriz(boxes, gapMerge) {
  const list = boxes
    .map((b) => ({ ...b }))
    .sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  const out = [];
  for (const b of list) {
    const last = out[out.length - 1];
    if (last && b.minX - last.maxX <= gapMerge) {
      last.minX = Math.min(last.minX, b.minX);
      last.maxX = Math.max(last.maxX, b.maxX);
      last.minY = Math.min(last.minY, b.minY);
      last.maxY = Math.max(last.maxY, b.maxY);
      last.n = (last.n || 0) + (b.n || 0);
    } else out.push(b);
  }
  return out;
}

function connectedComponentsInk(
  data,
  fullWidth,
  channels,
  x0,
  y0,
  localW,
  localH,
  inkMin
) {
  const ink = new Uint8Array(localW * localH);
  for (let ly = 0; ly < localH; ly++) {
    for (let lx = 0; lx < localW; lx++) {
      const gx = x0 + lx;
      const gy = y0 + ly;
      const i = (gy * fullWidth + gx) * channels;
      const m = Math.max(data[i], data[i + 1], data[i + 2]);
      ink[ly * localW + lx] = m > inkMin ? 1 : 0;
    }
  }
  const parent = new Int32Array(localW * localH);
  for (let i = 0; i < localW * localH; i++) parent[i] = i;
  function find(a) {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  }
  function union(a, b) {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  }
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let ly = 0; ly < localH; ly++) {
    for (let lx = 0; lx < localW; lx++) {
      const p = ly * localW + lx;
      if (!ink[p]) continue;
      for (const [dx, dy] of dirs) {
        const nx = lx + dx;
        const ny = ly + dy;
        if (nx < 0 || nx >= localW || ny < 0 || ny >= localH) continue;
        const q = ny * localW + nx;
        if (ink[q]) union(p, q);
      }
    }
  }
  const boxes = new Map();
  for (let ly = 0; ly < localH; ly++) {
    for (let lx = 0; lx < localW; lx++) {
      const p = ly * localW + lx;
      if (!ink[p]) continue;
      const root = find(p);
      let b = boxes.get(root);
      if (!b) {
        b = { minX: lx, maxX: lx, minY: ly, maxY: ly, n: 0 };
        boxes.set(root, b);
      }
      b.minX = Math.min(b.minX, lx);
      b.maxX = Math.max(b.maxX, lx);
      b.minY = Math.min(b.minY, ly);
      b.maxY = Math.max(b.maxY, ly);
      b.n++;
    }
  }
  return [...boxes.values()].map((b) => ({
    minX: b.minX + x0,
    maxX: b.maxX + x0,
    minY: b.minY + y0,
    maxY: b.maxY + y0,
    n: b.n,
  }));
}

function rgbToRgbaTransparent(buf, w, h, bgMax) {
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * 3;
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];
    const mx = Math.max(r, g, b);
    const o = p * 4;
    if (mx <= bgMax) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      out[o + 3] = 0;
    } else {
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
  }
  return out;
}

function opaqueCountRow(rgba, w, h, y) {
  let n = 0;
  const o = y * w * 4;
  for (let x = 0; x < w; x++) {
    if (rgba[o + x * 4 + 3] > ALPHA_THRESH) n++;
  }
  return n;
}

function opaqueCountCol(rgba, w, h, x) {
  let n = 0;
  for (let y = 0; y < h; y++) {
    if (rgba[(y * w + x) * 4 + 3] > ALPHA_THRESH) n++;
  }
  return n;
}

/** Copy sub-rectangle of RGBA buffer */
function cropRgbaRect(rgba, srcW, left, top, width, height) {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = (top + y) * srcW * 4 + left * 4;
    const dy = y * width * 4;
    rgba.copy(out, dy, sy, sy + width * 4);
  }
  return out;
}

/**
 * Remove stray neighbor strokes: sparse edge rows/cols and thin full-edge bands
 * where the next line in has clearly less ink (layout hairlines).
 */
function trimEdgeArtifacts(rgba, w, h) {
  let buf = rgba;
  let rw = w;
  let rh = h;
  const maxPass = 32;

  const sparseRow = (y) => {
    const n = opaqueCountRow(buf, rw, rh, y);
    return n > 0 && n <= Math.max(5, Math.floor(rw * 0.045));
  };
  const sparseCol = (x) => {
    const n = opaqueCountCol(buf, rw, rh, x);
    return n > 0 && n <= Math.max(5, Math.floor(rh * 0.045));
  };

  for (let pass = 0; pass < maxPass; pass++) {
    if (rw < 3 || rh < 3) break;
    let shaved = false;

    if (sparseRow(0)) {
      buf = cropRgbaRect(buf, rw, 0, 1, rw, rh - 1);
      rh--;
      shaved = true;
    } else if (rh >= 2) {
      const n0 = opaqueCountRow(buf, rw, rh, 0);
      const n1 = opaqueCountRow(buf, rw, rh, 1);
      if (n0 >= rw * 0.14 && n1 < n0 * 0.42) {
        buf = cropRgbaRect(buf, rw, 0, 1, rw, rh - 1);
        rh--;
        shaved = true;
      }
    }

    if (!shaved && sparseRow(rh - 1)) {
      buf = cropRgbaRect(buf, rw, 0, 0, rw, rh - 1);
      rh--;
      shaved = true;
    } else if (!shaved && rh >= 2) {
      const n0 = opaqueCountRow(buf, rw, rh, rh - 1);
      const n1 = opaqueCountRow(buf, rw, rh, rh - 2);
      if (n0 >= rw * 0.14 && n1 < n0 * 0.42) {
        buf = cropRgbaRect(buf, rw, 0, 0, rw, rh - 1);
        rh--;
        shaved = true;
      }
    }

    if (!shaved && sparseCol(0)) {
      buf = cropRgbaRect(buf, rw, 1, 0, rw - 1, rh);
      rw--;
      shaved = true;
    } else if (!shaved && rw >= 2) {
      const n0 = opaqueCountCol(buf, rw, rh, 0);
      const n1 = opaqueCountCol(buf, rw, rh, 1);
      if (n0 >= rh * 0.14 && n1 < n0 * 0.42) {
        buf = cropRgbaRect(buf, rw, 1, 0, rw - 1, rh);
        rw--;
        shaved = true;
      }
    }

    if (!shaved && sparseCol(rw - 1)) {
      buf = cropRgbaRect(buf, rw, 0, 0, rw - 1, rh);
      rw--;
      shaved = true;
    } else if (!shaved && rw >= 2) {
      const n0 = opaqueCountCol(buf, rw, rh, rw - 1);
      const n1 = opaqueCountCol(buf, rw, rh, rw - 2);
      if (n0 >= rh * 0.14 && n1 < n0 * 0.42) {
        buf = cropRgbaRect(buf, rw, 0, 0, rw - 1, rh);
        rw--;
        shaved = true;
      }
    }

    if (!shaved) break;
  }

  return { buf, width: rw, height: rh };
}

const DEBRIS_STRICT_ALPHA = 52;

/**
 * Strict 4-neighbour mask: drop blobs not reachable from the lower part of the
 * icon (kills neighbour arcs above a 1px gap that soft pixels used to bridge).
 */
function pruneStrictUnreachableFromBelow(rgba, w, h) {
  const n = w * h;
  const strict = (i) => rgba[i * 4 + 3] > DEBRIS_STRICT_ALPHA;
  const ySeedMin = Math.min(h - 1, Math.max(1, Math.floor(h * 0.14)));
  let anySeed = false;
  for (let y = ySeedMin; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (strict(y * w + x)) {
        anySeed = true;
        break;
      }
    }
    if (anySeed) break;
  }
  if (!anySeed) return;

  const seen = new Uint8Array(n);
  const q = [];
  const dirs = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ];
  for (let y = ySeedMin; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!strict(p) || seen[p]) continue;
      seen[p] = 1;
      q.push(p);
      while (q.length) {
        const cur = q.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - cy * w;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const np = ny * w + nx;
          if (seen[np] || !strict(np)) continue;
          seen[np] = 1;
          q.push(np);
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (!strict(i) || seen[i]) continue;
    const o = i * 4;
    rgba[o + 3] = 0;
  }
}

/**
 * On strict mask: drop components that are small / rim-local vs the largest.
 */
function removeDisconnectedDebris(rgba, w, h) {
  const n = w * h;
  const strict = (i) => rgba[i * 4 + 3] > DEBRIS_STRICT_ALPHA;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  function find(a) {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  }
  function union(a, b) {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  }
  const dirs = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!strict(p)) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const q = ny * w + nx;
        if (strict(q)) union(p, q);
      }
    }
  }
  const roots = new Map();
  for (let i = 0; i < n; i++) {
    if (!strict(i)) continue;
    const r = find(i);
    let s = roots.get(r);
    const y = Math.floor(i / w);
    const x = i - y * w;
    if (!s) {
      s = {
        area: 0,
        sx: 0,
        sy: 0,
        minX: x,
        maxX: x,
        minY: y,
        maxY: y,
      };
      roots.set(r, s);
    }
    s.area++;
    s.sx += x;
    s.sy += y;
    s.minX = Math.min(s.minX, x);
    s.maxX = Math.max(s.maxX, x);
    s.minY = Math.min(s.minY, y);
    s.maxY = Math.max(s.maxY, y);
  }
  if (roots.size <= 1) return;

  let bestR = -1;
  let bestA = 0;
  for (const [r, s] of roots) {
    if (s.area > bestA) {
      bestA = s.area;
      bestR = r;
    }
  }
  const main = roots.get(bestR);
  const cx = main.sx / main.area;
  const cy = main.sy / main.area;
  const minSide = Math.min(w, h);
  const distTh = Math.max(14, minSide * 0.1);
  const smallTh = Math.max(90, bestA * 0.15);
  const rim = Math.max(10, Math.min(48, minSide * 0.12));

  const inNeighborRim = (s) =>
    s.maxY < rim ||
    s.minY > h - 1 - rim ||
    s.maxX < rim ||
    s.minX > w - 1 - rim;

  for (const [r, s] of roots) {
    if (r === bestR) continue;
    const ox = s.sx / s.area;
    const oy = s.sy / s.area;
    const dist = Math.hypot(ox - cx, oy - cy);
    const rimBlob =
      s.area < bestA &&
      s.area < Math.max(120, bestA * 0.52) &&
      inNeighborRim(s);
    const farSmall = s.area < smallTh && dist > distTh;
    if (!rimBlob && !farSmall) continue;
    for (let i = 0; i < n; i++) {
      if (!strict(i)) continue;
      if (find(i) === r) {
        const o = i * 4;
        rgba[o + 3] = 0;
      }
    }
  }
}

/**
 * Remove neighbour soft smear above the main pictogram: everything with y less
 * than the top row of the largest strict-alpha 4-component (drops arc a<=52).
 */
function pruneOpaqueAboveMainStrict(rgba, w, h) {
  const n = w * h;
  const strict = (i) => rgba[i * 4 + 3] > DEBRIS_STRICT_ALPHA;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  function find(a) {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  }
  function union(a, b) {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  }
  const dirs = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!strict(p)) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const q = ny * w + nx;
        if (strict(q)) union(p, q);
      }
    }
  }
  const areas = new Map();
  for (let i = 0; i < n; i++) {
    if (!strict(i)) continue;
    const r = find(i);
    areas.set(r, (areas.get(r) || 0) + 1);
  }
  if (areas.size === 0) return;
  let bestR = -1;
  let bestA = 0;
  for (const [r, a] of areas) {
    if (a > bestA) {
      bestA = a;
      bestR = r;
    }
  }
  let minYMain = h;
  for (let i = 0; i < n; i++) {
    if (!strict(i) || find(i) !== bestR) continue;
    minYMain = Math.min(minYMain, Math.floor(i / w));
  }
  if (minYMain <= 0) return;
  for (let y = 0; y < minYMain; y++) {
    const o0 = y * w * 4;
    for (let x = 0; x < w; x++) {
      const o = o0 + x * 4;
      if (rgba[o + 3] > ALPHA_THRESH) rgba[o + 3] = 0;
    }
  }
}

/** Same as pruneOpaqueAboveMainStrict for soft smear below the main strict blob */
function pruneOpaqueBelowMainStrict(rgba, w, h) {
  const n = w * h;
  const strict = (i) => rgba[i * 4 + 3] > DEBRIS_STRICT_ALPHA;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  function find(a) {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  }
  function union(a, b) {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  }
  const dirs = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!strict(p)) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const q = ny * w + nx;
        if (strict(q)) union(p, q);
      }
    }
  }
  const areas = new Map();
  for (let i = 0; i < n; i++) {
    if (!strict(i)) continue;
    const r = find(i);
    areas.set(r, (areas.get(r) || 0) + 1);
  }
  if (areas.size === 0) return;
  let bestR = -1;
  let bestA = 0;
  for (const [r, a] of areas) {
    if (a > bestA) {
      bestA = a;
      bestR = r;
    }
  }
  let maxYMain = -1;
  for (let i = 0; i < n; i++) {
    if (!strict(i) || find(i) !== bestR) continue;
    maxYMain = Math.max(maxYMain, Math.floor(i / w));
  }
  if (maxYMain < 0 || maxYMain >= h - 1) return;
  for (let y = maxYMain + 1; y < h; y++) {
    const o0 = y * w * 4;
    for (let x = 0; x < w; x++) {
      const o = o0 + x * 4;
      if (rgba[o + 3] > ALPHA_THRESH) rgba[o + 3] = 0;
    }
  }
}

/** Soft fringe after strict ops: drop mid-alpha orphans not touching kept core */
function pruneDebrisHalo(rgba, w, h) {
  const dirs = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a = rgba[o + 3];
      if (a <= ALPHA_THRESH || a > DEBRIS_STRICT_ALPHA) continue;
      let nearKept = false;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (rgba[(ny * w + nx) * 4 + 3] > DEBRIS_STRICT_ALPHA) {
          nearKept = true;
          break;
        }
      }
      if (!nearKept) rgba[o + 3] = 0;
    }
  }
}

/**
 * Remove neighbour bleed that is still 4-connected to the icon: very shallow
 * opaque runs hugging only the top (or bottom) edge in a few columns — typical
 * for the bottom of a circle from the row above.
 */
function shaveShallowEdgeColumns(rgba, w, h) {
  const rim = Math.max(4, Math.min(22, Math.floor(h * 0.08)));
  const maxSpan = Math.max(10, Math.min(28, Math.floor(h * 0.14)));
  const maxMinY = Math.min(8, rim + 2);

  for (let pass = 0; pass < 3; pass++) {
    let cleared = 0;
    for (let x = 0; x < w; x++) {
      let minY = h;
      let maxY = -1;
      for (let y = 0; y < h; y++) {
        if (rgba[(y * w + x) * 4 + 3] > ALPHA_THRESH) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxY < 0) continue;
      const span = maxY - minY + 1;
      if (minY <= maxMinY && span <= maxSpan && maxY <= rim + maxSpan) {
        for (let y = minY; y <= maxY; y++) {
          const o = (y * w + x) * 4;
          if (rgba[o + 3] > ALPHA_THRESH) {
            rgba[o + 3] = 0;
            cleared++;
          }
        }
      }
    }
    if (!cleared) break;
  }

  for (let pass = 0; pass < 3; pass++) {
    let cleared = 0;
    for (let x = 0; x < w; x++) {
      let minY = h;
      let maxY = -1;
      for (let y = 0; y < h; y++) {
        if (rgba[(y * w + x) * 4 + 3] > ALPHA_THRESH) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxY < 0) continue;
      const span = maxY - minY + 1;
      if (maxY >= h - 1 - maxMinY && span <= maxSpan && minY >= h - rim - maxSpan) {
        for (let y = minY; y <= maxY; y++) {
          const o = (y * w + x) * 4;
          if (rgba[o + 3] > ALPHA_THRESH) {
            rgba[o + 3] = 0;
            cleared++;
          }
        }
      }
    }
    if (!cleared) break;
  }
}

function bboxAlpha(rgba, w, h) {
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > ALPHA_THRESH) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  const left = Math.max(0, minX - PAD);
  const top = Math.max(0, minY - PAD);
  const right = Math.min(w - 1, maxX + PAD);
  const bottom = Math.min(h - 1, maxY + PAD);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function extractBoxToPng(
  absPath,
  channels,
  fullWidth,
  fullData,
  box,
  bgMax
) {
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  const raw = Buffer.alloc(bw * bh * 3);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const gx = box.minX + x;
      const gy = box.minY + y;
      const si = (gy * fullWidth + gx) * channels;
      const di = (y * bw + x) * 3;
      raw[di] = fullData[si];
      raw[di + 1] = fullData[si + 1];
      raw[di + 2] = fullData[si + 2];
    }
  }
  const rgba = rgbToRgbaTransparent(raw, bw, bh, bgMax);
  const bb = bboxAlpha(rgba, bw, bh);
  if (!bb) return null;
  const cropped = Buffer.alloc(bb.width * bb.height * 4);
  for (let y = 0; y < bb.height; y++) {
    for (let x = 0; x < bb.width; x++) {
      const sx = bb.left + x;
      const sy = bb.top + y;
      const si = (sy * bw + sx) * 4;
      const di = (y * bb.width + x) * 4;
      cropped[di] = rgba[si];
      cropped[di + 1] = rgba[si + 1];
      cropped[di + 2] = rgba[si + 2];
      cropped[di + 3] = rgba[si + 3];
    }
  }
  const cleaned = trimEdgeArtifacts(cropped, bb.width, bb.height);
  if (cleaned.width < 2 || cleaned.height < 2) return null;
  pruneStrictUnreachableFromBelow(cleaned.buf, cleaned.width, cleaned.height);
  pruneDebrisHalo(cleaned.buf, cleaned.width, cleaned.height);
  removeDisconnectedDebris(cleaned.buf, cleaned.width, cleaned.height);
  pruneOpaqueAboveMainStrict(cleaned.buf, cleaned.width, cleaned.height);
  shaveShallowEdgeColumns(cleaned.buf, cleaned.width, cleaned.height);
  pruneDebrisHalo(cleaned.buf, cleaned.width, cleaned.height);
  const bb2 = bboxAlpha(cleaned.buf, cleaned.width, cleaned.height);
  if (!bb2) return null;
  const finalBuf = cropRgbaRect(
    cleaned.buf,
    cleaned.width,
    bb2.left,
    bb2.top,
    bb2.width,
    bb2.height
  );
  const { data: resized, info: rz } = await sharp(finalBuf, {
    raw: { width: bb2.width, height: bb2.height, channels: 4 },
  })
    .resize({
      width: OUTPUT_MAX,
      height: OUTPUT_MAX,
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rw = rz.width;
  const rh = rz.height;
  pruneOpaqueAboveMainStrict(resized, rw, rh);
  pruneOpaqueBelowMainStrict(resized, rw, rh);
  pruneDebrisHalo(resized, rw, rh);
  const bb3 = bboxAlpha(resized, rw, rh);
  if (!bb3) return null;
  const outBuf = cropRgbaRect(resized, rw, bb3.left, bb3.top, bb3.width, bb3.height);
  return sharp(outBuf, {
    raw: { width: bb3.width, height: bb3.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

function equalColumnBoxes(fullWidth, fullHeight, y0, y1, cols, pad) {
  const inner = fullWidth - 2 * pad;
  const cw = inner / cols;
  const boxes = [];
  for (let c = 0; c < cols; c++) {
    const left = Math.round(pad + c * cw);
    const right = Math.min(
      fullWidth - 1,
      Math.round(pad + (c + 1) * cw) - 1
    );
    boxes.push({
      minX: left,
      maxX: right,
      minY: Math.max(0, y0),
      maxY: Math.min(fullHeight - 1, y1),
    });
  }
  return boxes;
}

async function processStep(
  absPath,
  fullData,
  fullWidth,
  fullHeight,
  channels,
  step,
  inkMin,
  bgMax
) {
  if (step.kind === "equal_cols") {
    const pad = step.pad ?? 40;
    const boxes = equalColumnBoxes(
      fullWidth,
      fullHeight,
      step.y0,
      step.y1,
      step.cols,
      pad
    );
    const bufs = [];
    for (const box of boxes) {
      const buf = await extractBoxToPng(
        absPath,
        channels,
        fullWidth,
        fullData,
        box,
        bgMax
      );
      if (buf) bufs.push(buf);
    }
    return bufs;
  }

  let x0 = 0;
  let y0 = step.y0;
  let localW = fullWidth;
  let localH = step.y1 - step.y0 + 1;
  if (step.kind === "cc_region") {
    x0 = step.left;
    y0 = step.top;
    localW = step.width;
    localH = step.height;
  }
  if (localH < 2 || localW < 2) return [];

  const raw = connectedComponentsInk(
    fullData,
    fullWidth,
    channels,
    x0,
    y0,
    localW,
    localH,
    inkMin
  );
  const merged = mergeBoxesHoriz(raw, step.gapMerge ?? 25);
  const minA = step.minArea ?? 300;
  const pad = step.pad ?? 12;
  const filtered = merged
    .filter((b) => b.n >= minA)
    .map((b) => ({
      minX: Math.max(0, b.minX - pad),
      maxX: Math.min(fullWidth - 1, b.maxX + pad),
      minY: Math.max(0, b.minY - pad),
      maxY: Math.min(fullHeight - 1, b.maxY + pad),
    }))
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX);

  const bufs = [];
  for (const box of filtered) {
    const buf = await extractBoxToPng(
      absPath,
      channels,
      fullWidth,
      fullData,
      box,
      bgMax
    );
    if (buf) bufs.push(buf);
  }
  return bufs;
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
  const keyMap = fs.existsSync(KEY_MAP_PATH)
    ? JSON.parse(fs.readFileSync(KEY_MAP_PATH, "utf8"))
    : {};

  const byKeyDir = path.join(OUT_DIR, "by-key");
  fs.mkdirSync(byKeyDir, { recursive: true });

  let total = 0;
  const files = walkPngs(SRC_DIR).sort();
  /** @type {{ sourceRel: string, sliceIndex: number, outRel: string }[]} */
  const sliceInventory = [];

  for (const abs of files) {
    const rel = path.relative(SRC_DIR, abs);
    const cfg = spec[rel];
    if (!cfg) {
      process.stderr.write(`skip (no spec): ${rel}\n`);
      continue;
    }
    const inkMin = cfg.inkMin ?? 88;
    const bgMax = cfg.bg === "gray" ? 34 : 28;

    const dir = path.dirname(rel);
    const section =
      dir === "." || dir === "" ? "root" : slugifySegment(dir) || "root";
    const stem = slugifySegment(path.basename(rel));
    const outDir = path.join(OUT_DIR, section, stem);
    fs.mkdirSync(outDir, { recursive: true });

    const { data, info } = await sharp(abs)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const fullWidth = info.width;
    const fullHeight = info.height;
    const channels = info.channels;
    if (channels < 3) throw new Error(rel);

    let sliceIdx = 0;
    for (const step of cfg.steps || []) {
      const bufs = await processStep(
        abs,
        data,
        fullWidth,
        fullHeight,
        channels,
        step,
        inkMin,
        bgMax
      );
      for (const buf of bufs) {
        const name = `slice-${String(sliceIdx).padStart(3, "0")}.png`;
        await fs.promises.writeFile(path.join(outDir, name), buf);
        total++;
        const outRel = path
          .join(section, stem, name)
          .split(path.sep)
          .join("/");
        sliceInventory.push({
          sourceRel: rel.split(path.sep).join("/"),
          sliceIndex: sliceIdx,
          outRel,
        });

        const mapKey = `${rel}|${sliceIdx}`;
        const key = keyMap[mapKey];
        if (key) {
          const safe = key.replace(/[^a-z0-9-]/gi, "-");
          await fs.promises.writeFile(path.join(byKeyDir, `${safe}.png`), buf);
        }
        sliceIdx++;
      }
    }
  }

  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(sliceInventory, null, 2));
  process.stdout.write(
    `Wrote ${total} slices to ${path.relative(ROOT, OUT_DIR)}/ (${files.length} sources)\n`
  );
  process.stdout.write(
    `Wrote ${sliceInventory.length} entries to ${path.relative(ROOT, INVENTORY_PATH)}\n`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
