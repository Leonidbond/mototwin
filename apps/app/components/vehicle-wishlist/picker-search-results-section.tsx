import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getPartSkuViewModelDisplayLines, getPickerSkuSearchStatsLineRu } from "@mototwin/domain";
import type { PartSkuViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { PickerFitmentReportLinkFromSku } from "./picker-fitment-report-link";

const SEARCH_STATS_TOOLTIP =
  "Совместимость и уверенность по каталогу; число установок в отчётах сообщества — по ссылке «Отчёт о совместимости» ниже.";

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
  vehicleId: string;
  nodeId: string | null;
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
          const statsLine = getPickerSkuSearchStatsLineRu(sku, props.nodeId);
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
                <Text
                  style={styles.statsLine}
                  numberOfLines={1}
                  accessibilityLabel={`${statsLine}. ${SEARCH_STATS_TOOLTIP}`}
                >
                  {statsLine}
                </Text>
                <PickerFitmentReportLinkFromSku
                  vehicleId={props.vehicleId}
                  nodeId={props.nodeId}
                  sku={sku}
                  variant="inlineMuted"
                />
                <View style={styles.metaRow}>
                  <Text style={styles.rowPrice}>
                    {formatPriceRu(sku.priceAmount, sku.currency)}
                  </Text>
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
                  size={22}
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
  section: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
  },
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  resetBtnPressed: {
    opacity: 0.85,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textSecondary,
  },
  loadingBox: {
    paddingVertical: 16,
  },
  mutedText: {
    fontSize: 13,
    color: c.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: c.textMuted,
  },
  statsLine: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    color: c.textSecondary,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: c.textPrimary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
