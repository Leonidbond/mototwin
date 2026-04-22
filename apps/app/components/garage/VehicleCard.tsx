import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  buildGarageCardProps,
  filterMeaningfulGarageSpecHighlights,
} from "@mototwin/domain";
import type { GarageVehicleItem } from "@mototwin/types";
import { productSemanticColors as c, typeScale } from "@mototwin/design-tokens";
import { Button, Card, StatusBadge } from "../ui";
import { VehicleSilhouette } from "./VehicleSilhouette";

export function VehicleCard(props: {
  vehicle: GarageVehicleItem;
  isUsageProfileExpanded: boolean;
  isTechnicalSummaryExpanded: boolean;
  onOpenVehicle: (id: string) => void;
  onToggleUsageProfile: () => void;
  onToggleTechnicalSummary: () => void;
}) {
  const card = buildGarageCardProps(props.vehicle);
  const specHighlights = filterMeaningfulGarageSpecHighlights(card.specHighlights);

  return (
    <Card padding="lg" style={styles.card}>
      <Text style={styles.caption}>{card.brandModelCaption}</Text>
      <View style={styles.titleRow}>
        <Pressable onPress={() => props.onOpenVehicle(props.vehicle.id)} style={styles.titlePressable}>
          <Text style={styles.title} numberOfLines={2}>{card.summary.title}</Text>
        </Pressable>
        {card.attentionIndicator.isVisible ? (
          <StatusBadge
            status={card.attentionIndicator.semanticKey}
            label={String(card.attentionIndicator.totalCount)}
            size="sm"
          />
        ) : null}
      </View>
      <Text style={styles.meta}>{card.summary.yearVersionLine.replace(" · ", " | ")}</Text>

      <View style={styles.metricsRow}>
        <Metric label="Пробег" value={card.summary.odometerLine} />
        <Metric label="Моточасы" value={card.summary.engineHoursLineWithUnit ?? "Не указаны"} />
        <Metric label="VIN" value={card.summary.vinLine || "Не указан"} />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => props.onOpenVehicle(props.vehicle.id)}><Button size="sm">Открыть</Button></Pressable>
        <Pressable onPress={() => props.onOpenVehicle(props.vehicle.id)}><Button variant="ghost" size="sm">ТО</Button></Pressable>
        <Pressable onPress={() => props.onOpenVehicle(props.vehicle.id)}><Button variant="ghost" size="sm">Расход</Button></Pressable>
      </View>

      <VehicleSilhouette vehicle={props.vehicle} />

      <Card variant="muted" padding="sm" style={styles.section}>
        <Pressable onPress={props.onToggleUsageProfile} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Профиль эксплуатации</Text>
          <Text style={styles.sectionChevron}>{props.isUsageProfileExpanded ? "▾" : "▸"}</Text>
        </Pressable>
        {props.isUsageProfileExpanded ? (
          card.rideProfile ? (
            <View style={styles.tagWrap}>
              <Tag text={`Сценарий: ${card.rideProfile.usageType}`} />
              <Tag text={`Стиль: ${card.rideProfile.ridingStyle}`} />
              <Tag text={`Нагрузка: ${card.rideProfile.loadType}`} />
              <Tag text={`Интенсивность: ${card.rideProfile.usageIntensity}`} />
            </View>
          ) : (
            <Text style={styles.emptyText}>Профиль эксплуатации пока не задан.</Text>
          )
        ) : null}
      </Card>

      <Card variant="muted" padding="sm" style={styles.section}>
        <Pressable onPress={props.onToggleTechnicalSummary} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Техническая сводка</Text>
          <Text style={styles.sectionChevron}>{props.isTechnicalSummaryExpanded ? "▾" : "▸"}</Text>
        </Pressable>
        {props.isTechnicalSummaryExpanded ? (
          specHighlights.length > 0 ? (
            <View style={styles.tagWrap}>
              {specHighlights.map((spec) => (
                <Tag key={spec.label} text={`${spec.label}: ${spec.value}`} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Технические параметры пока не заполнены.</Text>
          )
        ) : null}
      </Card>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="subtle" padding="sm" style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}><Text style={styles.tagText}>{text}</Text></View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  caption: { color: c.textMuted, fontSize: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titlePressable: { flex: 1 },
  title: {
    color: c.textPrimary,
    fontSize: typeScale.cardTitle.fontSize,
    lineHeight: typeScale.cardTitle.lineHeight,
    fontWeight: typeScale.cardTitle.weight,
    letterSpacing: -0.2,
  },
  meta: { color: c.textMuted, fontSize: 14 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metric: { flex: 1 },
  metricLabel: { color: c.textMuted, fontSize: 11, textTransform: "uppercase", fontWeight: "600" },
  metricValue: { color: c.textPrimary, fontSize: 13, marginTop: 4, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  section: { marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: c.textPrimary, fontSize: 15, fontWeight: "600" },
  sectionChevron: { color: c.textMuted, fontSize: 14 },
  tagWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: c.chipBackground, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { color: c.textSecondary, fontSize: 12, fontWeight: "500" },
  emptyText: { marginTop: 8, color: c.textMuted, fontSize: 12 },
});
