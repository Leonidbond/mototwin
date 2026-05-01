/**
 * UI parity checklist (plan §0): spec `docs/mototwin-parts-cart-and-picker-ui-spec.md` part A/B vs PNGs
 * under `images/examples/Корзина и подбор/`. Implementation targets each block:
 *
 * Cart: CartHeader, VehicleCompactCard (mobile), CartSummaryCards×5, CartStatusTabs,
 * CartSearchAndFilters, CartGroupedList + row selection, CartItemDetailPanel (desktop 360px),
 * CartBottomActionsMobile, loading/empty/error/delete states §5.
 *
 * Picker: PartPickerShell wide layout, tabs Поиск / Рекомендации / Комплекты, grid 320|1fr|360,
 * bottom actions, mobile order §8 + sticky selection §11.
 */
export const PARTS_UI_PARITY_VERSION = 1;
