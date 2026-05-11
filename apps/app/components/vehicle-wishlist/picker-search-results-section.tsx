import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getPartSkuViewModelDisplayLines } from "@mototwin/domain";
import type { PartSkuViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";

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

export function PickerSearchResultsSection(props: {
  query: string;
  results: PartSkuViewModel[];
  isLoading: boolean;
  draftSkuIds: Set<string>;
  onAddSku: (sku: PartSkuViewModel) => void;
  onResetSearch: () => void;
}) {
  const count = props.results.length;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title} numberOfLines={1}>
            {props.isLoading
              ? `Поиск: «${props.query}»`
              : count > 0
                ? `Найдено: ${count}`
                : `По запросу «${props.query}» ничего не найдено`}
          </Text>
          {!props.isLoading && count === 0 ? (
            <Text style={styles.subtitle}>
              Попробуйте сократить запрос или сменить узел.
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={props.onResetSearch}
          style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.resetBtnText}>Сбросить</Text>
        </Pressable>
      </View>

      {props.isLoading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.mutedText}>Ищем по каталогу…</Text>
        </View>
      ) : (
        props.results.map((sku) => {
          const lines = getPartSkuViewModelDisplayLines(sku);
          const inDraft = props.draftSkuIds.has(sku.id);
          return (
            <View key={sku.id} style={styles.row}>
              <View style={styles.thumb}>
                <MaterialIcons name="inventory-2" size={20} color={c.textMuted} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {lines.primaryLine}
                </Text>
                {lines.secondaryLine ? (
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {lines.secondaryLine}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.rowPrice}>
                    {formatPriceRu(sku.priceAmount, sku.currency)}
                  </Text>
                  <View style={styles.fitsRow}>
                    <MaterialIcons name="check" size={12} color={c.successStrong} />
                    <Text style={styles.fitsText}>Подходит</Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => props.onAddSku(sku)}
                disabled={inDraft}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: inDraft ? c.cardMuted : c.primaryAction },
                  pressed && !inDraft && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={inDraft ? "Уже в корзине" : "Добавить в корзину"}
              >
                <MaterialIcons
                  name={inDraft ? "check" : "add"}
                  size={20}
                  color={inDraft ? c.textMuted : c.onPrimaryAction}
                />
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTextCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: c.textMuted,
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  resetBtnPressed: { opacity: 0.85 },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textMuted,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
  },
  mutedText: { fontSize: 13, color: c.textMuted, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
  rowSub: { marginTop: 2, fontSize: 11, color: c.textMuted },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowPrice: { fontSize: 14, fontWeight: "800", color: c.textPrimary },
  fitsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  fitsText: { fontSize: 11, color: c.successText },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
