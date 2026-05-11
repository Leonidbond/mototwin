import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MERCHANDISE_LABELS_RU } from "@mototwin/domain";
import type {
  PartRecommendationViewModel,
  PickerMerchandiseLabel,
} from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";

const REASON_BULLET_LIMIT = 4;

const ACCENT: Record<PickerMerchandiseLabel, string> = {
  BEST_FIT: "#FF5A00",
  BEST_VALUE: "#FFC400",
  FOR_YOUR_RIDE: "#36A3FF",
};

const BADGE_FG: Record<PickerMerchandiseLabel, string> = {
  BEST_FIT: "#FFFFFF",
  BEST_VALUE: "#1A0F00",
  FOR_YOUR_RIDE: "#04111F",
};

export function PickerRecommendationCard(props: {
  label: PickerMerchandiseLabel;
  recommendation: PartRecommendationViewModel;
  isInDraft: boolean;
  onAdd: () => void;
  width: number;
}) {
  const accent = ACCENT[props.label];
  const labelText = MERCHANDISE_LABELS_RU[props.label];
  const rec = props.recommendation;
  const reasons = buildReasons(rec).slice(0, REASON_BULLET_LIMIT);
  const priceLabel = formatPriceRu(rec.priceAmount, rec.currency);

  return (
    <View style={[styles.card, { borderColor: accent, width: props.width }]}>
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Text style={[styles.badgeText, { color: BADGE_FG[props.label] }]} numberOfLines={1}>
          {labelText}
        </Text>
      </View>
      <View style={styles.imageSlot}>
        <Text style={styles.imageEmoji}>🛞</Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.brand} numberOfLines={1}>
          {rec.brandName}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {rec.canonicalName}
        </Text>
        {rec.partType ? (
          <Text style={styles.specs} numberOfLines={1}>
            {rec.partType.replaceAll("_", " ")}
          </Text>
        ) : null}
      </View>
      <View style={styles.reasonList}>
        {reasons.map((reason, i) => (
          <View key={i} style={styles.reasonRow}>
            <MaterialIcons name="check" size={14} color={c.successStrong} style={styles.reasonIcon} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.price}>{priceLabel}</Text>
          <View style={styles.fitsRow}>
            <MaterialIcons name="check" size={12} color={c.successStrong} />
            <Text style={styles.fitsText}>Подходит</Text>
          </View>
        </View>
        <Pressable
          onPress={props.onAdd}
          disabled={props.isInDraft}
          accessibilityRole="button"
          accessibilityLabel={props.isInDraft ? "Уже в корзине" : "Добавить в корзину"}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: props.isInDraft ? c.cardMuted : c.primaryAction },
            pressed && !props.isInDraft && styles.addBtnPressed,
          ]}
        >
          <MaterialIcons
            name={props.isInDraft ? "check" : "add"}
            size={22}
            color={props.isInDraft ? c.textMuted : c.onPrimaryAction}
          />
        </Pressable>
      </View>
    </View>
  );
}

function buildReasons(rec: PartRecommendationViewModel): string[] {
  const list: string[] = [];
  if (rec.whyRecommended) list.push(rec.whyRecommended);
  if (rec.fitmentNote) list.push(rec.fitmentNote);
  if (rec.compatibilityWarning) list.push(rec.compatibilityWarning);
  return list;
}

function formatPriceRu(amount: number | null, currency: string | null): string {
  if (amount == null || !Number.isFinite(amount)) {
    return "Цена по запросу";
  }
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 18,
    backgroundColor: c.card,
    padding: 14,
    minHeight: 312,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  imageSlot: {
    marginTop: 10,
    height: 48,
    borderRadius: 10,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  imageEmoji: {
    fontSize: 18,
  },
  titleBlock: {
    marginTop: 10,
  },
  brand: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  name: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
    lineHeight: 18,
  },
  specs: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
  },
  reasonList: {
    marginTop: 10,
    gap: 6,
    flex: 1,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  reasonIcon: {
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    fontSize: 17,
    fontWeight: "800",
    color: c.textPrimary,
  },
  fitsRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fitsText: {
    fontSize: 12,
    color: c.successText,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: {
    opacity: 0.85,
  },
});
