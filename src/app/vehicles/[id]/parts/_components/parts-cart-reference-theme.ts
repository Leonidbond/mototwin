/**
 * Визуальные константы, выровненные по референсу
 * `images/examples/Корзина и подбор/Корзина запчастей web.png` (MOTOTWIN Digital Garage).
 * Используются только на экране корзины веб, чтобы не менять глобальные токены продукта.
 */
export const PARTS_CART_REF = {
  /** Фон основной области контента под макет (~#0D0D0D). */
  canvas: "#0D0D0D",
  /** Карточки / строки (~#1A1A1A). */
  surface: "#1A1A1A",
  surfaceElevated: "#1E1E1E",
  border: "#2A2A2A",
  borderSubtle: "#242424",
  /** Акцент макета (~#FF6B00). */
  orange: "#FF6B00",
  orangeHover: "#FF8533",
  text: "#F3F4F6",
  textMuted: "#9CA3AF",
  textSubtle: "#6B7280",
  radiusLg: 12,
  radiusMd: 10,
  radiusSm: 8,
  /** Статусы как на макете. */
  statusNeeded: "#FF3B30",
  statusOrdered: "#F5C400",
  statusBought: "#36A3FF",
  statusInstalled: "#30D158",
  statusMuted: "#8E8E93",
} as const;
