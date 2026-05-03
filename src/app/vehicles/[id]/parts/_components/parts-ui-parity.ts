/**
 * UI parity checklist (plan §0): spec `docs/mototwin-parts-cart-and-picker-ui-spec.md` part A/B vs PNGs
 * under `images/examples/Корзина и подбор/`. Implementation targets each block:
 *
 * Cart: CartHeader, VehicleCompactCard (mobile), CartSummaryCards×5, CartStatusTabs,
 * CartSearchAndFilters, CartGroupedList + row selection, CartItemDetailPanel (desktop 360px),
 * CartBottomActionsMobile, loading/empty/error/delete states §5.
 *
 * Picker: `/parts/picker` single-page (PartPickerPage) + draft cart; edit existing rows via WishlistItemEditModal.
 */
export const PARTS_UI_PARITY_VERSION = 1;
