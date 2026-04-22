/**
 * Shared icon source of truth for the 6 top-node groups used on the
 * vehicle overview. One key per group; both the web and mobile
 * renderers consume the same key so domain code can stay platform-
 * agnostic.
 *
 * Keys mirror `TopNodeOverviewCard["key"]` from `@mototwin/types`.
 */
export const TOP_NODE_ICON_KEYS = [
  "lubrication",
  "engine",
  "brakes",
  "tires",
  "chain",
  "suspension",
] as const;

export type TopNodeIconKey = (typeof TOP_NODE_ICON_KEYS)[number];

/**
 * Raw `<svg>` inner markup for each icon. Used by the web renderer via
 * `dangerouslySetInnerHTML` inside an `<svg viewBox="0 0 24 24">` so that
 * `stroke="currentColor"` propagates from the parent text color.
 *
 * Path data mirrors `scripts/generate-top-node-icons.js` so both sources
 * stay in sync.
 */
export const TOP_NODE_SVG_BODIES: Record<TopNodeIconKey, string> = {
  lubrication: `
    <path d="M 12 2.8 C 9 8 6.6 10.8 6.6 14 A 5.4 5.4 0 0 0 17.4 14 C 17.4 10.8 15 8 12 2.8 Z"/>
    <path d="M 9.6 13.6 A 2.6 2.6 0 0 1 11.6 11.6"/>
    <line x1="12" y1="19" x2="12" y2="21.2"/>
  `,
  engine: `
    <rect x="7" y="3.5" width="10" height="3" rx="0.8"/>
    <line x1="8.5" y1="4.2" x2="15.5" y2="4.2"/>
    <line x1="8.5" y1="5.8" x2="15.5" y2="5.8"/>
    <rect x="4" y="7" width="16" height="10" rx="1.8"/>
    <circle cx="9" cy="12" r="1"/>
    <circle cx="15" cy="12" r="1"/>
    <line x1="6" y1="17" x2="6" y2="19.5"/>
    <line x1="18" y1="17" x2="18" y2="19.5"/>
    <line x1="3.5" y1="19.5" x2="20.5" y2="19.5"/>
  `,
  brakes: `
    <circle cx="10.5" cy="12" r="7.5"/>
    <circle cx="10.5" cy="12" r="2.6"/>
    <line x1="10.5" y1="6.2" x2="10.5" y2="8.2"/>
    <line x1="10.5" y1="15.8" x2="10.5" y2="17.8"/>
    <line x1="4.7" y1="12" x2="6.7" y2="12"/>
    <line x1="14.3" y1="12" x2="16.3" y2="12"/>
    <line x1="6.6" y1="7.9" x2="7.9" y2="9.2"/>
    <line x1="13.1" y1="14.8" x2="14.4" y2="16.1"/>
    <path d="M 19.2 9 L 21 9 L 21.5 10 L 21.5 14 L 21 15 L 19.2 15 Z"/>
    <line x1="20.3" y1="10.5" x2="20.3" y2="13.5"/>
  `,
  tires: (() => {
    const lines = [
      '<circle cx="12" cy="12" r="9"/>',
      '<circle cx="12" cy="12" r="4.5"/>',
      '<circle cx="12" cy="12" r="1"/>',
      '<line x1="12" y1="4" x2="12" y2="7.5"/>',
      '<line x1="12" y1="16.5" x2="12" y2="20"/>',
      '<line x1="4" y1="12" x2="7.5" y2="12"/>',
      '<line x1="16.5" y1="12" x2="20" y2="12"/>',
    ];
    const treadAngles = [30, 60, 120, 150, 210, 240, 300, 330];
    for (const deg of treadAngles) {
      const a = (deg * Math.PI) / 180;
      const x1 = 12 + 9 * Math.cos(a);
      const y1 = 12 + 9 * Math.sin(a);
      const x2 = 12 + 10.4 * Math.cos(a);
      const y2 = 12 + 10.4 * Math.sin(a);
      lines.push(
        `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(
          2
        )}" y2="${y2.toFixed(2)}"/>`
      );
    }
    return lines.join("\n    ");
  })(),
  chain: (() => {
    const cx = 8;
    const cy = 12;
    const rOuter = 5;
    const rInner = 3.6;
    const teethCount = 10;
    const step = (Math.PI * 2) / (teethCount * 2);
    const points: string[] = [];
    for (let i = 0; i < teethCount * 2; i += 1) {
      const a = i * step - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      points.push(
        `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(
          2
        )}`
      );
    }
    const sprocketPath = `M ${points[0]} L ${points.slice(1).join(" L ")} Z`;
    return [
      `<path d="${sprocketPath}"/>`,
      `<circle cx="${cx}" cy="${cy}" r="1.2"/>`,
      `<circle cx="15" cy="10" r="1.2"/>`,
      `<circle cx="18.2" cy="11.6" r="1.2"/>`,
      `<path d="M 13.9 10.4 L 12.9 10.7"/>`,
      `<path d="M 17 10.6 L 16.2 11"/>`,
      `<path d="M 20.4 12.4 L 19.4 12.1"/>`,
    ].join("\n    ");
  })(),
  suspension: `
    <circle cx="12" cy="3.2" r="1.4"/>
    <line x1="12" y1="4.6" x2="12" y2="6.5"/>
    <rect x="10.4" y="6.5" width="3.2" height="1.8" rx="0.4"/>
    <path d="M 9 9 C 16 9 16 11 9 11 C 16 11 16 13 9 13 C 16 13 16 15 9 15 C 16 15 16 17 9 17 C 16 17 16 19 9 19"/>
    <rect x="10.4" y="19" width="3.2" height="1.8" rx="0.4"/>
    <line x1="12" y1="20.8" x2="12" y2="22"/>
    <circle cx="12" cy="22.4" r="1.2"/>
  `,
};

export const TOP_NODE_ICON_LABELS_RU: Record<TopNodeIconKey, string> = {
  lubrication: "Смазка",
  engine: "Двигатель / охлаждение",
  brakes: "Тормоза",
  tires: "Шины",
  chain: "Цепь / звёзды",
  suspension: "Подвеска",
};

/**
 * Fallback mapping for platforms that cannot render the shared SVG path-data
 * directly (e.g. the Expo app currently ships without `react-native-svg`).
 * Values reference Material Community Icons names available via
 * `@expo/vector-icons/MaterialCommunityIcons`.
 */
export const TOP_NODE_MATERIAL_COMMUNITY_ICONS: Record<
  TopNodeIconKey,
  string
> = {
  lubrication: "oil",
  engine: "engine-outline",
  brakes: "disc-alert",
  tires: "tire",
  chain: "cog-outline",
  suspension: "shock-absorber",
};
