import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getDraftTotals,
  getPartSkuViewModelDisplayLines,
} from "@mototwin/domain";
import type { PickerDraftCart } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { PickerKitCompositionBlock } from "./picker-kit-composition";

function positionsLabel(n: number): string {
  if (n === 1) return "позиция";
  if (n >= 2 && n <= 4) return "позиции";
  return "позиций";
}

function formatPriceRu(amount: number, currency: string | null): string {
  if (amount <= 0) return "—";
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

export function PickerDraftCartBar(props: {
  draft: PickerDraftCart;
  isSubmitting: boolean;
  bottomInset: number;
  onCheckout: () => void;
  onOpenSheet: () => void;
}) {
  const totals = useMemo(() => getDraftTotals(props.draft), [props.draft]);
  const isEmpty = props.draft.items.length === 0;
  const positionsText = isEmpty
    ? "Корзина пуста"
    : `Корзина (${totals.positionsCount} ${positionsLabel(totals.positionsCount)})`;

  return (
    <View style={[styles.bar, { paddingBottom: 10 + props.bottomInset }]}>
      <Pressable
        onPress={isEmpty ? undefined : props.onOpenSheet}
        disabled={isEmpty}
        style={({ pressed }) => [styles.left, pressed && !isEmpty && styles.leftPressed]}
        accessibilityRole={isEmpty ? undefined : "button"}
        accessibilityLabel="Открыть корзину"
      >
        <View style={styles.iconWrap}>
          <MaterialIcons name="shopping-cart" size={22} color={c.textPrimary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.positionsText} numberOfLines={1}>
            {positionsText}
          </Text>
          {!isEmpty ? (
            <Text style={styles.totalText} numberOfLines={1}>
              {formatPriceRu(totals.totalAmount, totals.currency)}
            </Text>
          ) : (
            <Text style={styles.emptyHint} numberOfLines={1}>
              Добавьте позиции из рекомендаций или комплектов
            </Text>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={props.onCheckout}
        disabled={isEmpty || props.isSubmitting}
        style={({ pressed }) => [
          styles.cta,
          (isEmpty || props.isSubmitting) && styles.ctaDisabled,
          pressed && !isEmpty && !props.isSubmitting && styles.ctaPressed,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText} numberOfLines={1}>
          {props.isSubmitting ? "Сохранение…" : "Перейти к оформлению"}
        </Text>
      </Pressable>
    </View>
  );
}

export function PickerDraftCartSheet(props: {
  visible: boolean;
  draft: PickerDraftCart;
  bottomInset: number;
  isSubmitting: boolean;
  onClose: () => void;
  onClear: () => void;
  onRemove: (draftId: string) => void;
  onCheckout: () => void;
}) {
  const totals = useMemo(() => getDraftTotals(props.draft), [props.draft]);
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent
      onRequestClose={props.onClose}
    >
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetScrim} onPress={props.onClose} accessibilityLabel="Закрыть" />
        <View
          style={[
            styles.sheetCard,
            { paddingBottom: Math.max(props.bottomInset, 14) + 8 },
          ]}
        >
          <View style={styles.sheetGrab} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              Корзина · {totals.positionsCount} {positionsLabel(totals.positionsCount)}
            </Text>
            <Pressable
              onPress={props.onClose}
              hitSlop={10}
              accessibilityLabel="Закрыть"
              style={styles.sheetCloseBtn}
            >
              <Text style={styles.sheetCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
            {props.draft.items.length === 0 ? (
              <Text style={styles.sheetEmpty}>Корзина пуста.</Text>
            ) : (
              props.draft.items.map((item) =>
                item.kind === "sku" ? (
                  <View key={item.draftId} style={styles.sheetRow}>
                    <View style={styles.sheetTextCol}>
                      <Text style={styles.sheetRowTitle} numberOfLines={2}>
                        {getPartSkuViewModelDisplayLines(item.sku).primaryLine}
                      </Text>
                      <Text style={styles.sheetRowMeta} numberOfLines={1}>
                        SKU
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => props.onRemove(item.draftId)}
                      hitSlop={6}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.sheetRowRemove,
                        pressed && styles.sheetRowRemovePressed,
                      ]}
                    >
                      <MaterialIcons name="close" size={18} color={c.error} />
                    </Pressable>
                  </View>
                ) : (
                  <View key={item.draftId} style={styles.sheetKitCard}>
                    <View style={styles.sheetRow}>
                      <View style={styles.sheetTextCol}>
                        <Text style={styles.sheetRowTitle} numberOfLines={2}>
                          {item.kit.title}
                        </Text>
                        <Text style={styles.sheetRowMeta} numberOfLines={1}>
                          Комплект · {item.kit.items.length} поз.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => props.onRemove(item.draftId)}
                        hitSlop={6}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.sheetRowRemove,
                          pressed && styles.sheetRowRemovePressed,
                        ]}
                      >
                        <MaterialIcons name="close" size={18} color={c.error} />
                      </Pressable>
                    </View>
                    <PickerKitCompositionBlock kit={item.kit} heading="Состав в корзине" />
                  </View>
                )
              )
            )}
          </ScrollView>
          <View style={styles.sheetFooter}>
            <Pressable
              onPress={props.onClear}
              disabled={props.draft.items.length === 0}
              style={({ pressed }) => [
                styles.sheetClear,
                props.draft.items.length === 0 && { opacity: 0.5 },
                pressed && props.draft.items.length > 0 && styles.sheetClearPressed,
              ]}
            >
              <Text style={styles.sheetClearText}>Очистить корзину</Text>
            </Pressable>
            <Pressable
              onPress={props.onCheckout}
              disabled={props.draft.items.length === 0 || props.isSubmitting}
              style={({ pressed }) => [
                styles.sheetCheckout,
                (props.draft.items.length === 0 || props.isSubmitting) && styles.ctaDisabled,
                pressed &&
                  props.draft.items.length > 0 &&
                  !props.isSubmitting &&
                  styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaText} numberOfLines={1}>
                {props.isSubmitting ? "Сохранение…" : "Перейти к оформлению"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leftPressed: { opacity: 0.85 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0 },
  positionsText: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
  },
  totalText: {
    marginTop: 1,
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
  },
  emptyHint: {
    marginTop: 1,
    fontSize: 11,
    color: c.textMuted,
  },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.5 },
  ctaPressed: { opacity: 0.9 },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCard: {
    width: "100%",
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderColor: c.borderStrong,
    overflow: "hidden",
  },
  sheetGrab: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.borderStrong,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 22,
    color: c.textMuted,
    lineHeight: 24,
  },
  sheetScroll: { maxHeight: 420 },
  sheetScrollContent: { padding: 12, gap: 8 },
  sheetEmpty: {
    paddingVertical: 24,
    textAlign: "center",
    color: c.textMuted,
    fontSize: 13,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetTextCol: { flex: 1, minWidth: 0 },
  sheetRowTitle: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
  sheetRowMeta: { marginTop: 2, fontSize: 11, color: c.textMuted },
  sheetRowRemove: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRowRemovePressed: { opacity: 0.7 },
  sheetKitCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    gap: 4,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
  },
  sheetClear: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetClearPressed: { opacity: 0.85 },
  sheetClearText: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textSecondary,
  },
  sheetCheckout: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
});
