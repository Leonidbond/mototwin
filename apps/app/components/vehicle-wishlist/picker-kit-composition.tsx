import { StyleSheet, Text, View } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { ServiceKitItemViewModel, ServiceKitViewModel } from "@mototwin/types";

function formatLineTotal(
  unitAmount: number | null | undefined,
  quantity: number,
  currency: string | null | undefined
): string {
  const q = Math.max(quantity, 1);
  if (unitAmount == null || !Number.isFinite(unitAmount) || unitAmount <= 0) {
    return "—";
  }
  const line = unitAmount * q;
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(line);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

function formatCatalogSkuNumbers(partNumbers: string[]): string {
  const parts = partNumbers.map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function KitLine({ item }: { item: ServiceKitItemViewModel }) {
  const lineTotal = formatLineTotal(item.matchedPriceAmount, item.quantity, item.matchedCurrency);
  const catalogSku = formatCatalogSkuNumbers(item.matchedPartNumbers);
  const showPickName =
    Boolean(item.matchedSkuTitle?.trim()) &&
    item.matchedSkuTitle!.trim() !== item.title.trim();
  const nodeShort = item.nodeCode.replaceAll("_", "·");

  const summaryParts = [item.title];
  if (showPickName && item.matchedSkuTitle) {
    summaryParts.push(item.matchedSkuTitle);
  }
  summaryParts.push(`SKU ${catalogSku}`);
  summaryParts.push(nodeShort);
  const summaryText = summaryParts.join(" · ");

  return (
    <View style={styles.lineWrap}>
      <View style={styles.lineBody}>
        <Text style={styles.lineText}>
          {summaryText}
          {item.warning ? (
            <Text style={styles.warnInline}> · {item.warning}</Text>
          ) : null}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.qty}>×{Math.max(item.quantity, 1)}</Text>
          <Text style={styles.price}>{lineTotal}</Text>
        </View>
      </View>
    </View>
  );
}

export function PickerKitCompositionBlock(props: {
  kit: ServiceKitViewModel;
  heading?: string;
}) {
  const heading = props.heading ?? "Состав комплекта";
  const desc = props.kit.description?.trim() ?? "";

  return (
    <View style={styles.block}>
      <Text style={styles.heading}>{heading}</Text>
      {desc ? <Text style={styles.kitDescription}>{desc}</Text> : null}
      {props.kit.items.map((it) => (
        <KitLine key={it.key} item={it} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderStrong,
  },
  heading: {
    fontSize: 11,
    fontWeight: "800",
    color: c.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  kitDescription: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 22,
    color: c.textPrimary,
  },
  lineWrap: {
    borderRadius: 8,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  lineBody: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  lineText: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 22,
    color: c.textPrimary,
  },
  warnInline: {
    fontSize: 13,
    fontWeight: "400",
    color: c.error,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    gap: 10,
    marginTop: 6,
  },
  qty: {
    fontSize: 12,
    fontWeight: "400",
    color: c.textMuted,
  },
  price: {
    fontSize: 13,
    fontWeight: "400",
    color: c.textPrimary,
  },
});
