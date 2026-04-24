import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  buildGarageCardProps,
  filterMeaningfulGarageSpecHighlights,
} from "@mototwin/domain";
import type { GarageVehicleItem } from "@mototwin/types";
import { productSemanticColors as c, typeScale } from "@mototwin/design-tokens";
import { Button, Card, StatusBadge } from "../ui";
import { LabeledMetricCard } from "./LabeledMetricCard";
import { GarageScore } from "./GarageScore";
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
  const openVehicle = () => props.onOpenVehicle(props.vehicle.id);
  const metricItems = [
    { label: "Пробег", value: card.summary.odometerLine },
    { label: "Моточасы", value: card.summary.engineHoursLineWithUnit ?? "Не указаны" },
    { label: "VIN", value: card.summary.vinLine || "Не указан" },
  ];
  const quickActions = [
    { key: "open", label: "Открыть", variant: "primary" as const },
    { key: "service", label: "ТО", variant: "ghost" as const },
    { key: "costs", label: "Расход", variant: "ghost" as const },
  ];
  const rideProfileTags = card.rideProfile
    ? [
        `Сценарий: ${card.rideProfile.usageType}`,
        `Стиль: ${card.rideProfile.ridingStyle}`,
        `Нагрузка: ${card.rideProfile.loadType}`,
        `Интенсивность: ${card.rideProfile.usageIntensity}`,
      ]
    : [];

  return (
    <Card padding="lg" style={styles.card}>
      <Text style={styles.caption}>{card.brandModelCaption}</Text>
      <View style={styles.titleRow}>
        <Pressable onPress={openVehicle} style={styles.titlePressable}>
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
      <GarageScore score={card.garageScore} />

      <View style={styles.metricsRow}>
        {metricItems.map((metric) => (
          <LabeledMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            containerStyle={styles.metric}
            labelStyle={styles.metricLabel}
            valueStyle={styles.metricValue}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {quickActions.map((action) => (
          <Pressable key={action.key} onPress={openVehicle}>
            <Button variant={action.variant} size="sm">{action.label}</Button>
          </Pressable>
        ))}
      </View>

      <Card variant="muted" padding="sm" style={styles.attentionBlock}>
        <Text style={styles.attentionTitle}>Состояние обслуживания</Text>
        {card.attentionIndicator.isVisible ? (
          <View style={styles.attentionRow}>
            <StatusBadge
              status={card.attentionIndicator.semanticKey}
              label={String(card.attentionIndicator.totalCount)}
              size="sm"
            />
            <Text style={styles.attentionText}>
              Требует внимания: {card.attentionIndicator.totalCount}
            </Text>
          </View>
        ) : (
          <Text style={styles.attentionTextStandalone}>Все в порядке</Text>
        )}
      </Card>

      <VehicleSilhouette vehicle={props.vehicle} />

      <CollapsibleSection
        title="Профиль эксплуатации"
        expanded={props.isUsageProfileExpanded}
        onToggle={props.onToggleUsageProfile}
      >
        {props.isUsageProfileExpanded ? (
          rideProfileTags.length > 0 ? (
            <View style={styles.tagWrap}>
              {rideProfileTags.map((tag) => (
                <Tag key={tag} text={tag} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Профиль эксплуатации пока не задан.</Text>
          )
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        title="Техническая сводка"
        expanded={props.isTechnicalSummaryExpanded}
        onToggle={props.onToggleTechnicalSummary}
      >
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
      </CollapsibleSection>
    </Card>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

function CollapsibleSection(props: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card variant="muted" padding="sm" style={styles.section}>
      <Pressable onPress={props.onToggle} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{props.title}</Text>
        <Text style={styles.sectionChevron}>{props.expanded ? "▾" : "▸"}</Text>
      </Pressable>
      {props.children}
    </Card>
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
  metricLabel: {
    color: c.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  metricValue: { color: c.textPrimary, fontSize: 13, marginTop: 4, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  attentionBlock: { marginTop: 2 },
  attentionTitle: { color: c.textMuted, fontSize: 11, textTransform: "uppercase", fontWeight: "600" },
  attentionRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  attentionText: { color: c.textPrimary, fontSize: 13, fontWeight: "500" },
  attentionTextStandalone: { marginTop: 8, color: c.textPrimary, fontSize: 13, fontWeight: "500" },
  section: { marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: c.textPrimary, fontSize: 15, fontWeight: "600" },
  sectionChevron: { color: c.textMuted, fontSize: 14 },
  tagWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: c.chipBackground,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: c.textSecondary, fontSize: 12, fontWeight: "500" },
  emptyText: { marginTop: 8, color: c.textMuted, fontSize: 12 },
});
