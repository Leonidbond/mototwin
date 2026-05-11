/**
 * Maps OCR captions (extracted-label-manifest.json) to prisma nodeTaxonomy
 * names → writes scripts/data/node-code-icon-source.json for sync to app.
 *
 * Run after: node scripts/extract-node-tree-icons-new.js --labeled
 * Then: node scripts/sync-node-icons-from-slices.mjs && node scripts/generate-node-tree-icons-ts.mjs
 *
 * Partial (one design folder, icons under from-design/by-label/<SUBTREE>/):
 *   node scripts/extract-node-tree-icons-new.js --labeled --subdir=BRAKES
 *   node scripts/match-extracted-labels-to-nodes.mjs --subtree=BRAKES --merge
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Same idea as extract script — weak OCR should not drive matching */
function isLikelyGarbageCaption(raw) {
  const t = String(raw || "").trim();
  if (!t) return true;
  const letters = t.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, "");
  if (letters.length <= 1 && t.length <= 4) return true;
  if (!letters.length) return true;
  if (/^[а-яё]$/i.test(t)) return true;
  if (!/[а-яё]/i.test(t) && /^[a-z.\s]+$/i.test(t) && t.replace(/\s/g, "").length <= 5)
    return true;
  return false;
}

function parseTaxonomy() {
  const seed = fs.readFileSync(path.join(ROOT, "prisma/seed.ts"), "utf8");
  const m = seed.match(/const nodeTaxonomy = \[([\s\S]*?)\] as const;/);
  if (!m) throw new Error("nodeTaxonomy not found");
  const rows = [];
  const re = /\[\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\]/g;
  let rm;
  while ((rm = re.exec(m[1]))) rows.push({ code: rm[1], name: rm[2] });
  return rows;
}

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rootPrefix(code) {
  const i = code.indexOf(".");
  return i === -1 ? code : code.slice(0, i);
}

/** Folder / filename on design sheets → likely taxonomy roots (ENGINE, BRAKES, …) */
function sourceHintRoots(sourceRel) {
  const s = sourceRel.toLowerCase();
  const roots = new Set();
  const add = (r) => roots.add(r);
  if (/двигател|грм|сцеплен|кпп|картер|масл|поршн|цилиндр|коленвал|стартер|кикстарт/i.test(s))
    add("ENGINE");
  if (/топлив|карб|инжектор|бак|форсунк|дроссел/i.test(s)) add("FUEL");
  if (/впуск|воздух|airbox|фильтр.*возд/i.test(s)) add("INTAKE");
  if (/охлажден|радиатор|помпа|антифриз|термостат/i.test(s)) add("COOLING");
  if (/выпуск|глушител|коллектор|лямбд/i.test(s)) add("EXHAUST");
  if (/электрик|зажиган|акб|свет|провод|реле|предохран|катушк|свеч|статор|ротор/i.test(s))
    add("ELECTRICS");
  if (/рам|пластик|сидень|крыл|защит.*карт|подрам/i.test(s)) add("CHASSIS");
  if (/рулев|руль|траверс|рулевая|грипс/i.test(s)) add("STEERING");
  if (/подвес|вилк|амортиз|маятник|линк|сальник.*вилк/i.test(s)) add("SUSPENSION");
  if (/колес|обод|спиц|ступиц|колёс/i.test(s)) add("WHEELS");
  if (/шин|резин|камер|буксатор|ободн.*лент/i.test(s)) add("TIRES");
  if (/тормоз/i.test(s)) add("BRAKES");
  if (/цепь|звезд|привод|слайдер|натяжит.*цеп/i.test(s)) add("DRIVETRAIN");
  if (/орган|газ|трос|поднож|рычаг|педаль|лапк/i.test(s)) add("CONTROLS");
  return roots.size ? roots : null;
}

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + c
      );
    }
  }
  return dp[m][n];
}

function scoreSubstringLev(a, b) {
  if (!a.length || !b.length) return -1;
  if (a.includes(b) || b.includes(a)) return 200 - Math.abs(a.length - b.length);
  const L = lev(a, b);
  const mx = Math.max(a.length, b.length, 1);
  return 120 - (L / mx) * 100;
}

function tokenBoost(nodeNameNorm, labelNorm) {
  if (!nodeNameNorm.length || !labelNorm.length) return 0;
  const parts = nodeNameNorm.split(" ").filter((p) => p.length >= 2);
  let b = 0;
  for (const p of parts) {
    if (p.length >= 3 && labelNorm.includes(p)) b += 24;
  }
  const slashParts = nodeNameNorm.split(/[/|]+/).map((x) => x.trim()).filter((x) => x.length >= 3);
  for (const p of slashParts) {
    if (labelNorm.includes(p)) b += 18;
  }
  return b;
}

/** Text used for fuzzy match: caption when sane, always plus slug-as-words (path + positional id) */
function labelMatchText(lab) {
  const raw = String(lab.rawLabel || "").trim();
  const slugWords = String(lab.slug || "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw || isLikelyGarbageCaption(raw)) return slugWords;
  return `${raw} ${slugWords}`.trim();
}

function baseLabelScore(nodeName, lab) {
  const probe = norm(labelMatchText(lab));
  if (!probe.length) return -1;
  const nn = norm(nodeName);
  const a = scoreSubstringLev(nn, probe);
  const rawN = norm(lab.rawLabel || "");
  const b =
    rawN.length && !isLikelyGarbageCaption(lab.rawLabel)
      ? scoreSubstringLev(nn, rawN)
      : -1;
  return Math.max(a, b);
}

function scorePair(n, lab, mode) {
  const hints = sourceHintRoots(lab.sourceRel || "");
  const root = rootPrefix(n.code);
  let region = 0;
  if (hints) {
    region = hints.has(root) ? 42 : mode === "strict" ? -200 : mode === "soft" ? -55 : 0;
  }
  const nn = norm(n.name);
  const probe = norm(labelMatchText(lab));
  const base = baseLabelScore(n.name, lab);
  if (base < 0) return -1;
  const tok = tokenBoost(nn, probe);
  return base + tok + region;
}

function greedyMatch(taxonomy, labels, mode, minScore, usedCodes, usedSlugs) {
  const pairs = [];
  for (const n of taxonomy) {
    if (usedCodes.has(n.code)) continue;
    for (const lab of labels) {
      if (usedSlugs.has(lab.slug)) continue;
      const s = scorePair(n, lab, mode);
      if (s >= minScore) pairs.push({ n, lab, s });
    }
  }
  pairs.sort((a, b) => b.s - a.s);
  const out = [];
  for (const { n, lab, s } of pairs) {
    if (usedCodes.has(n.code) || usedSlugs.has(lab.slug)) continue;
    out.push({ n, lab, s });
    usedCodes.add(n.code);
    usedSlugs.add(lab.slug);
  }
  return out;
}

function greedyBestRemaining(taxonomy, labels, usedCodes, usedSlugs) {
  const out = [];
  const unsetNodes = taxonomy.filter((n) => !usedCodes.has(n.code));
  let pool = labels.filter((l) => !usedSlugs.has(l.slug));
  for (const n of unsetNodes) {
    let best = null;
    for (const lab of pool) {
      const s = Math.max(
        scorePair(n, lab, "none"),
        scorePair(n, lab, "soft")
      );
      if (s > (best?.s ?? -1e9)) best = { lab, s };
    }
    if (best && best.s >= -80) {
      out.push({ n, lab: best.lab, s: best.s });
      usedCodes.add(n.code);
      usedSlugs.add(best.lab.slug);
      pool = pool.filter((l) => l.slug !== best.lab.slug);
    }
  }
  return out;
}

function outRelForLabel(subtree, slug) {
  if (subtree)
    return `by-label/${subtree}/${slug}.png`.split(path.sep).join("/");
  return `by-label/${slug}.png`;
}

function main() {
  const subtreeArg = process.argv.find((a) => a.startsWith("--subtree="));
  const SUBTREE = subtreeArg
    ? subtreeArg.slice("--subtree=".length).trim().toUpperCase()
    : null;
  const MERGE = process.argv.includes("--merge");

  if (SUBTREE && !MERGE) {
    console.error("With --subtree=… pass --merge to update node-code-icon-source.json without wiping other roots.");
    process.exit(1);
  }

  const manifestPath = SUBTREE
    ? path.join(ROOT, `scripts/data/extracted-label-manifest-${SUBTREE}.json`)
    : path.join(ROOT, "scripts/data/extracted-label-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("Missing manifest:", manifestPath);
    console.error(
      SUBTREE
        ? `Run: node scripts/extract-node-tree-icons-new.js --labeled --subdir=${SUBTREE}`
        : "Run first: node scripts/extract-node-tree-icons-new.js --labeled"
    );
    process.exit(1);
  }
  const labels = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let taxonomy = parseTaxonomy();
  const reusePath = path.join(ROOT, "scripts/data/brakes-icon-reuse.json");
  const subtreeReuse =
    SUBTREE === "BRAKES" && fs.existsSync(reusePath)
      ? JSON.parse(fs.readFileSync(reusePath, "utf8"))
      : null;

  if (SUBTREE) {
    taxonomy = taxonomy.filter(
      (n) => n.code === SUBTREE || n.code.startsWith(`${SUBTREE}.`)
    );
    if (!subtreeReuse && labels.length < taxonomy.length) {
      console.error(
        `Not enough extracted icons for ${SUBTREE}: got ${labels.length}, need at least ${taxonomy.length} (taxonomy nodes in this subtree).`
      );
      process.exit(1);
    }
    if (subtreeReuse) {
      const want = subtreeReuse.matchPrimaryOnly?.length ?? 0;
      if (labels.length !== want) {
        console.error(
          `BRAKES reuse manifest: expected ${want} primary slices, got ${labels.length}. Re-run extract or adjust brakes-icon-reuse.json.`
        );
        process.exit(1);
      }
    }
  }

  const usedCodes = new Set();
  const usedSlugs = new Set();
  /** @type {Record<string, object>} */
  let mapping = {};
  if (MERGE && SUBTREE) {
    const existingPath = path.join(ROOT, "scripts/data/node-code-icon-source.json");
    if (fs.existsSync(existingPath)) {
      try {
        mapping = JSON.parse(fs.readFileSync(existingPath, "utf8")) || {};
      } catch {
        mapping = {};
      }
    }
  }
  const assignments = [];

  const taxonomyForMatch = subtreeReuse
    ? taxonomy.filter((n) => subtreeReuse.matchPrimaryOnly.includes(n.code))
    : taxonomy;

  const rounds = [
    { mode: "strict", min: 22 },
    { mode: "strict", min: 16 },
    { mode: "soft", min: 12 },
    { mode: "soft", min: 6 },
    { mode: "none", min: 4 },
  ];
  for (const { mode, min } of rounds) {
    const got = greedyMatch(taxonomyForMatch, labels, mode, min, usedCodes, usedSlugs);
    assignments.push(...got);
  }

  const bestLeft = greedyBestRemaining(taxonomyForMatch, labels, usedCodes, usedSlugs);
  assignments.push(...bestLeft);

  const subtreeMapping = {};
  for (const { n, lab, s } of assignments) {
    subtreeMapping[n.code] = {
      outRel: outRelForLabel(SUBTREE, lab.slug),
      labelSlug: lab.slug,
      rawLabel: lab.rawLabel,
      score: Math.round(s * 10) / 10,
    };
  }

  if (subtreeReuse?.copyOutRelFrom) {
    for (const [dest, src] of Object.entries(subtreeReuse.copyOutRelFrom)) {
      const base = subtreeMapping[src];
      if (!base) {
        console.error(`Reuse source not mapped: ${src} (for ${dest})`);
        process.exit(1);
      }
      subtreeMapping[dest] = {
        outRel: base.outRel,
        labelSlug: base.labelSlug,
        rawLabel: base.rawLabel,
        score: base.score,
        note: `same-icon-as-${src}`,
      };
    }
  }

  const leftNodes = taxonomy.filter((n) => !subtreeMapping[n.code]);
  const leftLabs = labels.filter((l) => !usedSlugs.has(l.slug));

  if (SUBTREE && MERGE) {
    if (leftNodes.length) {
      console.error(
        "Could not match all subtree nodes to distinct slices:",
        leftNodes.map((n) => n.code).join(", ")
      );
      console.error("Unused label slugs:", leftLabs.map((l) => l.slug).join(", ") || "(none)");
      process.exit(1);
    }
    for (const [code, meta] of Object.entries(subtreeMapping)) {
      mapping[code] = meta;
    }
  } else {
    mapping = { ...subtreeMapping };
    for (let i = 0; i < leftNodes.length; i++) {
      const lab =
        leftLabs[i % Math.max(1, leftLabs.length)] ?? labels[i % labels.length];
      mapping[leftNodes[i].code] = {
        outRel: outRelForLabel(SUBTREE, lab.slug),
        labelSlug: lab.slug,
        rawLabel: lab.rawLabel,
        note: "fallback-no-label-left",
      };
      usedSlugs.add(lab.slug);
    }
  }

  fs.writeFileSync(
    path.join(ROOT, "scripts/data/node-code-icon-source.json"),
    JSON.stringify(mapping, null, 2)
  );

  const strong = assignments.filter((a) => a.s >= 16).length;
  console.log(
    "Wrote node-code-icon-source.json —",
    Object.keys(mapping).length,
    "total keys,",
    strong,
    "assignments with score ≥ 16,",
    assignments.length,
    "auto-matched in this run" + (SUBTREE ? ` (${SUBTREE} subtree only)` : "")
  );
}

main();
