import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getServiceKitTagRu } from "@mototwin/domain";
import type { ServiceKitMerchandiseTag, ServiceKitViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { PickerKitCompositionBlock } from "./picker-kit-composition";

const KIT_TAG_BG: Record<ServiceKitMerchandiseTag, string> = {
  POPULAR: "#1F2C3A",
  BEST_VALUE: "#2A2310",
  RECOMMENDED: "#1A2A1F",
};

const KIT_TAG_FG: Record<ServiceKitMerchandiseTag, string> = {
  POPULAR: "#A1C8E8",
  BEST_VALUE: "#FFD66B",
  RECOMMENDED: "#7CD9A2",
};

function itemsLabel(n: number): string {
  if (n === 1) return "позицию";
  if (n >= 2 && n <= 4) return "позиции";
  return "позиций";
}

function computeKitTotalAmount(kit: ServiceKitViewModel): number {
  let total = 0;
  for (const item of kit.items) {
    if (item.matchedPriceAmount != null && Number.isFinite(item.matchedPriceAmount)) {
      total += item.matchedPriceAmount * Math.max(item.quantity, 1);
    }
  }
  return total;
}

function pickKitCurrency(kit: ServiceKitViewModel): string | null {
  for (const item of kit.items) {
    const c = item.matchedCurrency?.trim();
    if (c) return c;
  }
  return null;
}

function formatPriceRu(amount: number, currency: string | null): string {
  if (amount <= 0) return "Цена по запросу";
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

export function PickerServiceKitRow(props: {
  kit: ServiceKitViewModel;
  isInDraft: boolean;
  isAdding?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddKit: () => void;
}) {
  const tag = getServiceKitTagRu(props.kit);
  const totalAmount = computeKitTotalAmount(props.kit);
  const currency = pickKitCurrency(props.kit);
  const itemsCount = props.kit.items.length;
  const isDisabled = props.isInDraft || props.isAdding;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={props.onToggleExpand}
        accessibilityRole="button"
        accessibilityState={{ expanded: props.isExpanded }}
        style={({ pressed }) => [styles.topRow, pressed && styles.topRowPressed]}
      >
        <View style={styles.thumb}>
          <Text style={styles.thumbEmoji}>🛠</Text>
        </View>
        <View style={styles.bodyCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {props.kit.title}
            </Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: KIT_TAG_BG[tag.kind] }]}>
                <Text style={[styles.tagText, { color: KIT_TAG_FG[tag.kind] }]} numberOfLines={1}>
                  {tag.labelRu}
                </Text>
              </View>
            ) : null}
          </View>
          {props.kit.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {props.kit.description}
            </Text>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            Включает {itemsCount} {itemsLabel(itemsCount)}
            <Text style={styles.metaToggle}>
              {" "}
              · {props.isExpanded ? "Скрыть состав" : "Показать состав"}
            </Text>
          </Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPriceRu(totalAmount, currency)}
          </Text>
          <View style={styles.fitsRow}>
            <MaterialIcons name="check" size={12} color={c.successStrong} />
            <Text style={styles.fitsText}>Подходит</Text>
          </View>
        </View>
      </Pressable>

      {props.isExpanded ? <PickerKitCompositionBlock kit={props.kit} /> : null}

      <Pressable
        onPress={props.onAddKit}
        disabled={isDisabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.addBtn,
          {
            backgroundColor: props.isInDraft ? c.cardMuted : c.primaryAction,
            opacity: props.isAdding ? 0.7 : 1,
          },
          pressed && !isDisabled && styles.addBtnPressed,
        ]}
      >
        <Text
          style={[
            styles.addBtnText,
            { color: props.isInDraft ? c.textMuted : c.onPrimaryAction },
          ]}
          numberOfLines={1}
        >
          {props.isInDraft
            ? "В корзине ✓"
            : props.isAdding
              ? "Добавляем…"
              : "Добавить комплект"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  topRowPressed: { opacity: 0.92 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 28 },
  bodyCol: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
    flexShrink: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  meta: {
    marginTop: 6,
    fontSize: 11,
    color: c.textMuted,
  },
  metaToggle: {
    color: c.textSecondary,
    fontWeight: "600",
  },
  priceCol: {
    minWidth: 76,
    alignItems: "flex-end",
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: c.textPrimary,
  },
  fitsRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fitsText: { fontSize: 11, color: c.successText },
  addBtn: {
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  addBtnPressed: { opacity: 0.88 },
  addBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
