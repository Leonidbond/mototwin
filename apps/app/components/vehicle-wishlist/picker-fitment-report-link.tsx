import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getPickerFitmentShortLabelRu,
  getPickerSkuCatalogFitHintRu,
} from "@mototwin/domain";
import type { PartRecommendationViewModel, PartSkuViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { buildVehicleWishlistFitmentReportHref } from "./hrefs";

const REPORT_LINK_TITLE = "Отчёт о совместимости";

export function PickerFitmentReportLink(props: {
  vehicleId: string;
  nodeId: string | null;
  partMasterId: string | null;
  /** Короткая подпись уровня совместимости (каталог / сообщество). */
  label: string;
  variant?: "cardFooter" | "inlineMuted";
}) {
  const router = useRouter();
  const href =
    props.partMasterId && props.nodeId
      ? buildVehicleWishlistFitmentReportHref(props.vehicleId, {
          nodeId: props.nodeId,
          partMasterId: props.partMasterId,
        })
      : null;

  const isMuted = props.variant === "inlineMuted";
  const disabledHint = !props.partMasterId
    ? "Нет канонической карточки детали"
    : !props.nodeId
      ? "Выберите узел мотоцикла"
      : null;

  const accessibilityLabel = href
    ? REPORT_LINK_TITLE
    : disabledHint ?? REPORT_LINK_TITLE;

  const content = (
    <View style={[styles.textCol, isMuted && styles.textColMuted]}>
      <View style={styles.titleRow}>
        <MaterialIcons
          name="check"
          size={14}
          color={href ? c.successStrong : c.textMuted}
          style={styles.checkIcon}
        />
        <Text
          style={[
            styles.reportTitle,
            href ? styles.reportTitleActive : styles.reportTitleDisabled,
            isMuted && styles.reportTitleMuted,
          ]}
          numberOfLines={2}
        >
          {REPORT_LINK_TITLE}
        </Text>
        {href ? <Text style={styles.arrow}>→</Text> : null}
      </View>
      {props.label.trim() ? (
        <Text
          style={[styles.fitHint, href ? styles.fitHintActive : styles.fitHintDisabled]}
          numberOfLines={2}
        >
          {props.label}
        </Text>
      ) : null}
      {!href && disabledHint ? (
        <Text style={styles.disabledHint} numberOfLines={2}>
          {disabledHint}
        </Text>
      ) : null}
    </View>
  );

  if (!href) {
    return (
      <View
        style={[styles.row, isMuted && styles.rowMuted]}
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.row,
        isMuted && styles.rowMuted,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      {content}
    </Pressable>
  );
}

export function PickerFitmentReportLinkFromRecommendation(props: {
  vehicleId: string;
  nodeId: string | null;
  recommendation: PartRecommendationViewModel;
  variant?: "cardFooter" | "inlineMuted";
}) {
  const rec = props.recommendation;
  const nodeId = props.nodeId ?? rec.primaryNode?.id ?? null;
  return (
    <PickerFitmentReportLink
      vehicleId={props.vehicleId}
      nodeId={nodeId}
      partMasterId={rec.partMasterId}
      label={getPickerFitmentShortLabelRu(rec)}
      variant={props.variant}
    />
  );
}

export function PickerFitmentReportLinkFromSku(props: {
  vehicleId: string;
  nodeId: string | null;
  sku: PartSkuViewModel;
  variant?: "cardFooter" | "inlineMuted";
}) {
  const sku = props.sku;
  const nodeId = props.nodeId ?? sku.primaryNodeId ?? sku.nodeLinks[0]?.nodeId ?? null;
  return (
    <PickerFitmentReportLink
      vehicleId={props.vehicleId}
      nodeId={nodeId}
      partMasterId={sku.partMasterId}
      label={getPickerSkuCatalogFitHintRu(sku)}
      variant={props.variant}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 4,
    minWidth: 0,
  },
  rowMuted: {
    marginTop: 2,
  },
  rowPressed: {
    opacity: 0.85,
  },
  textCol: {
    minWidth: 0,
    gap: 2,
  },
  textColMuted: {
    gap: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  checkIcon: {
    flexShrink: 0,
  },
  reportTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 0,
  },
  reportTitleActive: {
    color: c.primaryAction,
  },
  reportTitleMuted: {
    fontSize: 11,
  },
  reportTitleDisabled: {
    color: c.textMuted,
    fontWeight: "700",
    opacity: 0.7,
  },
  arrow: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "800",
    color: c.primaryAction,
    opacity: 0.9,
  },
  fitHint: {
    fontSize: 11,
    lineHeight: 14,
    paddingLeft: 20,
  },
  fitHintActive: {
    color: c.textSecondary,
    fontWeight: "600",
  },
  fitHintDisabled: {
    color: c.textMuted,
    fontWeight: "500",
    opacity: 0.8,
  },
  disabledHint: {
    fontSize: 10,
    lineHeight: 13,
    color: c.textMuted,
    paddingLeft: 20,
    fontStyle: "italic",
  },
});
