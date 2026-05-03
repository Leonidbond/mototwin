import { useMemo } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { formatRideStyleChipLabelRu } from "@mototwin/domain";
import type {
  PartRecommendationViewModel,
  PickerMerchandiseRecommendations,
  VehicleRideProfile,
} from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { PickerRecommendationCard } from "./picker-recommendation-card";

const CARD_GAP = 10;
const SCREEN_PADDING_X = 16;

function getCardWidth(): number {
  const win = Dimensions.get("window").width;
  // На небольших экранах ~285px, оставляем место для подглядывания следующей карточки.
  return Math.min(300, Math.max(250, Math.round(win - SCREEN_PADDING_X * 2 - 36)));
}

export function PickerRecommendationsSection(props: {
  nodeName: string | null;
  rideProfile: VehicleRideProfile | null;
  recommendations: PickerMerchandiseRecommendations;
  draftSkuIds: Set<string>;
  hasSelectedNode: boolean;
  isLoading: boolean;
  onAddSku: (rec: PartRecommendationViewModel) => void;
  onEditRideProfile: () => void;
  onShowMore: () => void;
  alternativesVisible: boolean;
}) {
  const { bestFit, bestValue, forYourRide, alternatives } = props.recommendations;
  const cards = useMemo(() => {
    const list: Array<{ label: "BEST_FIT" | "BEST_VALUE" | "FOR_YOUR_RIDE"; rec: PartRecommendationViewModel }> = [];
    if (bestFit) list.push({ label: "BEST_FIT", rec: bestFit });
    if (bestValue) list.push({ label: "BEST_VALUE", rec: bestValue });
    if (forYourRide) list.push({ label: "FOR_YOUR_RIDE", rec: forYourRide });
    return list;
  }, [bestFit, bestValue, forYourRide]);

  const cardWidth = getCardWidth();
  const titleText = props.nodeName
    ? `Рекомендации для узла «${props.nodeName}»`
    : "Рекомендации";
  const rideStyleLabel = formatRideStyleChipLabelRu(props.rideProfile);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {titleText}
            </Text>
            <MaterialIcons name="info-outline" size={16} color={c.textMuted} />
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            Подобрано на основе мотоцикла, профиля езды и условий
          </Text>
        </View>
        <Pressable
          onPress={props.onEditRideProfile}
          style={({ pressed }) => [styles.rideChip, pressed && styles.rideChipPressed]}
          accessibilityRole="button"
          accessibilityLabel="Изменить профиль езды"
        >
          <Text style={styles.rideChipText} numberOfLines={1}>
            {rideStyleLabel}
          </Text>
          <MaterialIcons name="edit" size={12} color={c.textMuted} />
        </Pressable>
      </View>

      {!props.hasSelectedNode ? (
        <View style={styles.emptyBox}>
          <Text style={styles.mutedText}>
            Сначала выберите узел над строкой поиска — здесь появятся рекомендации узла.
          </Text>
        </View>
      ) : props.isLoading ? (
        <View style={styles.loadingBox}>
          <Text style={styles.mutedText}>Загружаем рекомендации…</Text>
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.mutedText}>Для выбранного узла рекомендаций пока нет.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={cardWidth + CARD_GAP}
          decelerationRate="fast"
        >
          {cards.map(({ label, rec }, idx) => (
            <View
              key={`${label}_${rec.skuId}`}
              style={[styles.cardWrap, idx > 0 && { marginLeft: CARD_GAP }]}
            >
              <PickerRecommendationCard
                label={label}
                recommendation={rec}
                isInDraft={props.draftSkuIds.has(rec.skuId)}
                onAdd={() => props.onAddSku(rec)}
                width={cardWidth}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {!props.isLoading && props.hasSelectedNode && alternatives.length > 0 ? (
        <View style={styles.altWrap}>
          <Pressable
            onPress={props.onShowMore}
            style={({ pressed }) => [styles.showMoreBtn, pressed && styles.showMoreBtnPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.showMoreText}>
              {props.alternativesVisible
                ? "Свернуть дополнительные рекомендации"
                : `Показать ещё рекомендации (${alternatives.length})`}
            </Text>
            <MaterialIcons
              name={props.alternativesVisible ? "expand-less" : "expand-more"}
              size={18}
              color={c.textMuted}
            />
          </Pressable>
          {props.alternativesVisible ? (
            <View style={styles.altList}>
              {alternatives.map((rec) => {
                const inDraft = props.draftSkuIds.has(rec.skuId);
                return (
                  <View key={rec.skuId} style={styles.altRow}>
                    <View style={styles.altTextCol}>
                      <Text style={styles.altTitle} numberOfLines={2}>
                        {rec.brandName} {rec.canonicalName}
                      </Text>
                      <Text style={styles.altSub} numberOfLines={1}>
                        {rec.recommendationLabel}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => props.onAddSku(rec)}
                      disabled={inDraft}
                      style={({ pressed }) => [
                        styles.altAddBtn,
                        { backgroundColor: inDraft ? c.cardMuted : c.primaryAction },
                        pressed && !inDraft && { opacity: 0.85 },
                      ]}
                    >
                      <MaterialIcons
                        name={inDraft ? "check" : "add"}
                        size={20}
                        color={inDraft ? c.textMuted : c.onPrimaryAction}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
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
    gap: 10,
  },
  headerTextCol: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  rideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  rideChipPressed: { opacity: 0.85 },
  rideChipText: {
    maxWidth: 130,
    fontSize: 11,
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
  emptyBox: {
    paddingVertical: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
  },
  mutedText: { fontSize: 13, color: c.textMuted, textAlign: "center", paddingHorizontal: 16 },
  scrollContent: {
    paddingRight: SCREEN_PADDING_X,
  },
  cardWrap: {
    flexShrink: 0,
  },
  altWrap: {
    marginTop: 4,
    gap: 8,
  },
  showMoreBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  showMoreBtnPressed: { opacity: 0.85 },
  showMoreText: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },
  altList: { gap: 6 },
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  altTextCol: { flex: 1, minWidth: 0 },
  altTitle: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  altSub: { marginTop: 2, fontSize: 11, color: c.textMuted },
  altAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
