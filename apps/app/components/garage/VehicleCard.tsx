import { MaterialIcons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  buildGarageCardProps,
  getVehicleSilhouetteClassLabel,
  resolveGarageAttentionIconKey,
  resolveGarageVehicleSilhouette,
  type GarageAttentionIconKey,
} from "@mototwin/domain";
import type { GarageVehicleItem } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { Button, Card } from "../ui";
import { GarageScore } from "./GarageScore";
import { VehicleSilhouette } from "./VehicleSilhouette";
import brakesFrontPadsIcon from "../../../../images/top-node-icons-dark/brakes/brakes_front_pads.png";
import chainSprocketsIcon from "../../../../images/top-node-icons-dark/chain_sprockets/chain_sprockets.png";
import engineCoolingIcon from "../../../../images/top-node-icons-dark/engine_cooling/engine_cooling.png";
import lubricationIcon from "../../../../images/top-node-icons-dark/lubrication/lubrication.png";
import suspensionIcon from "../../../../images/top-node-icons-dark/suspension/suspension.png";
import tiresIcon from "../../../../images/top-node-icons-dark/tires/tires.png";
import tiresRearIcon from "../../../../images/top-node-icons-dark/tires/tires_rear.png";

const TOP_NODE_ICONS: Record<GarageAttentionIconKey, typeof brakesFrontPadsIcon> = {
  brakes: brakesFrontPadsIcon,
  brakes_front_pads: brakesFrontPadsIcon,
  chain_sprockets: chainSprocketsIcon,
  engine_cooling: engineCoolingIcon,
  lubrication: lubricationIcon,
  suspension: suspensionIcon,
  tires: tiresIcon,
  tires_rear: tiresRearIcon,
};

type AttentionTone = "soon" | "overdue";

export function VehicleCard(props: {
  vehicle: GarageVehicleItem;
  onOpenVehicle: (id: string) => void;
  onAddServiceEvent: (id: string) => void;
  onOpenExpenses: (id: string) => void;
}) {
  const card = buildGarageCardProps(props.vehicle);
  const openVehicle = () => props.onOpenVehicle(props.vehicle.id);
  const silhouetteKey = resolveGarageVehicleSilhouette(props.vehicle);
  const silhouetteLabel = getVehicleSilhouetteClassLabel(silhouetteKey);
  const attentionTotal = props.vehicle.attentionSummary?.totalCount ?? 0;
  const soonCount = props.vehicle.attentionSummary?.soonCount ?? 0;
  const overdueCount = props.vehicle.attentionSummary?.overdueCount ?? 0;
  const okCount = Math.max(0, 10 - attentionTotal);
  const recentlyCount = 0;
  const generation = props.vehicle.motorcycleGeneration;
  const generationYear = generation.yearsLabel?.trim() || generation.yearFrom || null;
  const metaLine = [
    generationYear,
    card.summary.odometerLine,
    props.vehicle.motorcycleVariant.name,
  ]
    .filter((chunk): chunk is string | number => Boolean(chunk))
    .join(" · ");

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Pressable onPress={openVehicle} style={styles.titlePressable}>
            <Text style={styles.title} numberOfLines={2}>
              {card.summary.title}
            </Text>
          </Pressable>
          <Text style={styles.meta}>{metaLine || card.summary.yearVersionLine}</Text>
        </View>
        <Pressable onPress={openVehicle} style={styles.moreButton}>
          <MaterialIcons name="more-horiz" size={22} color={c.textMuted} />
        </Pressable>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.silhouetteBlock}>
          <VehicleSilhouette vehicle={props.vehicle} />
          <Text style={styles.caption}>Изображение класса • {silhouetteLabel}</Text>
        </View>
        <GarageScore
          score={card.garageScore}
          okCount={okCount}
          soonCount={soonCount}
          overdueCount={overdueCount}
          recentlyCount={recentlyCount}
        />
      </View>

      <View style={styles.attentionBlock}>
        {attentionTotal > 0 ? (
          <>
            <Text style={styles.attentionTitle}>Требует внимания</Text>
            <View style={styles.attentionList}>
              {(props.vehicle.attentionSummary?.items ?? []).map((item) => (
                <AttentionRow
                  key={item.nodeId}
                  tone={item.effectiveStatus === "OVERDUE" ? "overdue" : "soon"}
                  iconKey={resolveGarageAttentionIconKey(item.code)}
                  title={item.name}
                  badgeLabel={item.statusLabelRu}
                  subtitle={item.subtitle}
                />
              ))}
            </View>
          </>
        ) : (
          <HealthyRow />
        )}
      </View>

      <View style={styles.actions}>
        <Button variant="primary" size="sm" onPress={openVehicle} style={styles.openButton}>
          Открыть
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => props.onAddServiceEvent(props.vehicle.id)}
          style={styles.secondaryButton}
        >
          <Text style={styles.centeredButtonLabel}>Новое ТО</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => props.onOpenExpenses(props.vehicle.id)}
          style={styles.secondaryButton}
          leadingIcon={<MaterialIcons name="account-balance-wallet" size={16} color={c.textPrimary} />}
        >
          Расход
        </Button>
      </View>
    </Card>
  );
}

function AttentionRow(props: {
  tone: AttentionTone;
  iconKey: GarageAttentionIconKey;
  title: string;
  badgeLabel: string;
  subtitle: string;
}) {
  const accent = props.tone === "overdue" ? "#FF5A4D" : "#F6C453";
  return (
    <View style={styles.attentionRow}>
      <Image
        source={TOP_NODE_ICONS[props.iconKey]}
        style={styles.attentionIcon}
        resizeMode="contain"
        alt=""
      />
      <View style={styles.attentionTextWrap}>
        <View style={styles.attentionHeadline}>
          <Text style={styles.attentionRowTitle}>{props.title}</Text>
          <View style={[styles.badge, { backgroundColor: `${accent}26` }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{props.badgeLabel}</Text>
          </View>
        </View>
        <Text style={styles.attentionSubtitle}>{props.subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={c.textMuted} />
    </View>
  );
}

function HealthyRow() {
  return (
    <View style={styles.attentionRow}>
      <View style={styles.okIconWrap}>
        <MaterialIcons name="check" size={28} color="#2ED267" />
      </View>
      <View style={styles.attentionTextWrap}>
        <Text style={styles.healthyTitle}>Все в порядке</Text>
        <Text style={styles.attentionSubtitle}>Нет просроченных задач</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerText: { flex: 1 },
  titlePressable: { flex: 1 },
  title: {
    color: c.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  meta: { marginTop: 4, color: c.textMuted, fontSize: 14, lineHeight: 18, fontWeight: "500" },
  moreButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  silhouetteBlock: { flex: 1, minWidth: 0 },
  caption: { marginTop: 2, color: c.textMuted, fontSize: 12, textAlign: "center" },
  attentionBlock: { marginTop: 2 },
  attentionTitle: { color: c.textPrimary, fontSize: 14, fontWeight: "700" },
  attentionList: { marginTop: 4, gap: 6 },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: c.cardMuted,
  },
  attentionIcon: { width: 30, height: 30 },
  okIconWrap: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  attentionTextWrap: { flex: 1, minWidth: 0 },
  attentionHeadline: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  attentionRowTitle: { color: c.textPrimary, fontSize: 14, fontWeight: "700" },
  attentionSubtitle: { marginTop: 2, color: c.textMuted, fontSize: 12 },
  healthyTitle: { color: c.textPrimary, fontSize: 14, fontWeight: "700" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
  actions: { flexDirection: "row", gap: 6, flexWrap: "nowrap", marginTop: 2 },
  openButton: {
    flex: 0.9,
    minWidth: 0,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  secondaryButton: {
    flex: 1,
    minWidth: 0,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  centeredButtonLabel: {
    flex: 1,
    textAlign: "center",
    color: c.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 15,
  },
});
