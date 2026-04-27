/**
 * Shared action icons used around node rows, cards, and modals.
 * The SVG bodies are intentionally monochrome (`currentColor`) so callers can
 * color the icon itself without adding a colored background.
 */
export const ACTION_ICON_KEYS = [
  "addToShoppingList",
  "openServiceLog",
  "addServiceEvent",
] as const;

export type ActionIconKey = (typeof ACTION_ICON_KEYS)[number];

export const ACTION_ICON_LABELS_RU: Record<ActionIconKey, string> = {
  addToShoppingList: "Добавить в список покупок",
  openServiceLog: "Открыть журнал",
  addServiceEvent: "Добавить сервисное событие",
};

export const ACTION_SVG_BODIES: Record<ActionIconKey, string> = {
  addToShoppingList: `
    <rect x="5" y="4.5" width="11" height="15.5" rx="2"/>
    <path d="M 8.5 4.5 C 8.5 3.4 9.4 2.5 10.5 2.5 C 11.6 2.5 12.5 3.4 12.5 4.5"/>
    <path d="M 8.2 8.4 L 9.2 9.4 L 11.2 7.4"/>
    <line x1="12.8" y1="8.4" x2="14.2" y2="8.4"/>
    <path d="M 8.2 12 L 9.2 13 L 11.2 11"/>
    <line x1="12.8" y1="12" x2="14.2" y2="12"/>
    <line x1="8.2" y1="16" x2="11.4" y2="16"/>
    <circle cx="17.2" cy="17.2" r="3.2"/>
    <line x1="17.2" y1="15.6" x2="17.2" y2="18.8"/>
    <line x1="15.6" y1="17.2" x2="18.8" y2="17.2"/>
  `,
  openServiceLog: `
    <path d="M 5.2 5.2 C 6.4 4.6 8 4.6 9.2 5.2 C 10.4 5.8 11.6 5.8 12.8 5.2 C 14 4.6 15.6 4.6 18.8 5.2 L 18.8 19 C 15.6 18.4 14 18.4 12.8 19 C 11.6 19.6 10.4 19.6 9.2 19 C 8 18.4 6.4 18.4 5.2 19 Z"/>
    <line x1="12" y1="5.8" x2="12" y2="19.2"/>
    <circle cx="8.4" cy="9" r="0.7"/>
    <line x1="9.8" y1="9" x2="10.6" y2="9"/>
    <circle cx="8.4" cy="12" r="0.7"/>
    <line x1="9.8" y1="12" x2="10.6" y2="12"/>
    <circle cx="8.4" cy="15" r="0.7"/>
    <line x1="9.8" y1="15" x2="10.6" y2="15"/>
    <circle cx="16" cy="14.2" r="2.3"/>
    <path d="M 16 12.9 L 16 14.2 L 17.1 14.8"/>
  `,
  addServiceEvent: `
    <rect x="5" y="5.5" width="12.5" height="13" rx="2"/>
    <line x1="5" y1="9" x2="17.5" y2="9"/>
    <line x1="8" y1="3.8" x2="8" y2="6.7"/>
    <line x1="14.5" y1="3.8" x2="14.5" y2="6.7"/>
    <path d="M 8.2 14.2 L 10.3 12.1"/>
    <path d="M 10.3 12.1 L 12.2 14 L 15.4 10.8"/>
    <path d="M 8.1 17.2 L 10.4 14.9"/>
    <circle cx="17.6" cy="17.2" r="3"/>
    <line x1="17.6" y1="15.7" x2="17.6" y2="18.7"/>
    <line x1="16.1" y1="17.2" x2="19.1" y2="17.2"/>
  `,
};
