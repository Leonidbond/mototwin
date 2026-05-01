import { useMemo, type ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { resolveGarageVehicleSilhouette } from "@mototwin/domain";
import type { VehicleDetail } from "@mototwin/types";
import adventureTouring from "../../../../../images/Motocycles/adventure_touring.png";
import enduroDualSport from "../../../../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadster from "../../../../../images/Motocycles/naked_roadster.png";
import sportSupersport from "../../../../../images/Motocycles/sport_supersport.png";
import cruiser from "../../../../../images/Motocycles/cruiser.png";
import classicRetro from "../../../../../images/Motocycles/classic_retro.png";
import scooterMaxiScooter from "../../../../../images/Motocycles/scooter_maxi_scooter.png";

const SILHOUETTE_SRC = {
  adventure_touring: adventureTouring,
  enduro_dual_sport: enduroDualSport,
  naked_roadster: nakedRoadster,
  sport_supersport: sportSupersport,
  cruiser,
  classic_retro: classicRetro,
  scooter_maxi_scooter: scooterMaxiScooter,
} as const;

/** Совпадает с типичными карточками сводки на экране корзины (`SUMMARY_CARD_*`). */
const DEFAULT_CARD_BG = "#111923";
const DEFAULT_CARD_BORDER = "#1F2937";
const DEFAULT_TITLE = "#F3F4F6";
const DEFAULT_SUBTITLE = "#9CA3AF";
const DEFAULT_CHEVRON = "#6B7280";

function silhouetteSourceForVehicleDetail(vehicle: VehicleDetail): ImageSourcePropType {
  const key = resolveGarageVehicleSilhouette({
    brand: { name: vehicle.brandName },
    model: { name: vehicle.modelName },
    modelVariant: {
      year: vehicle.year,
      versionName: vehicle.variantName,
      market: vehicle.modelVariant?.market ?? null,
      engineType: vehicle.modelVariant?.engineType ?? null,
      coolingType: vehicle.modelVariant?.coolingType ?? null,
      wheelSizes: vehicle.modelVariant?.wheelSizes ?? null,
      brakeSystem: vehicle.modelVariant?.brakeSystem ?? null,
      chainPitch: vehicle.modelVariant?.chainPitch ?? null,
      stockSprockets: vehicle.modelVariant?.stockSprockets ?? null,
    },
    rideProfile: vehicle.rideProfile,
  });
  return SILHOUETTE_SRC[key] ?? SILHOUETTE_SRC.naked_roadster;
}

export type CompactVehicleContextRowProps = {
  vehicle: VehicleDetail;
  title: string;
  subtitle: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** По умолчанию: показывать стрелку только если есть `onPress`. */
  showChevron?: boolean;
  silhouetteWidth?: number;
  silhouetteHeight?: number;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  chevronColor?: string;
  trailing?: ReactNode;
};

/**
 * Компактная строка контекста мотоцикла: силуэт класса (как в гараже / карточке байка),
 * название и подзаголовок. Стиль карточки по умолчанию — как сводные карточки статусов на корзине.
 */
export function CompactVehicleContextRow({
  vehicle,
  title,
  subtitle,
  onPress,
  style,
  showChevron,
  silhouetteWidth = 68,
  silhouetteHeight = 40,
  cardBackgroundColor = DEFAULT_CARD_BG,
  cardBorderColor = DEFAULT_CARD_BORDER,
  titleColor = DEFAULT_TITLE,
  subtitleColor = DEFAULT_SUBTITLE,
  chevronColor = DEFAULT_CHEVRON,
  trailing,
}: CompactVehicleContextRowProps) {
  const silhouetteSource = useMemo(() => silhouetteSourceForVehicleDetail(vehicle), [vehicle]);
  const resolvedShowChevron = showChevron ?? Boolean(onPress);

  const inner = (
    <>
      <View style={[styles.silhouetteWrap, { width: silhouetteWidth, height: silhouetteHeight }]}>
        <Image
          source={silhouetteSource}
          style={styles.silhouetteImage}
          resizeMode="contain"
          accessibilityLabel="Силуэт класса мотоцикла"
        />
      </View>
      <View style={styles.textCol}>
        <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: subtitleColor }]}>
          {subtitle}
        </Text>
      </View>
      {trailing}
      {resolvedShowChevron ? (
        <MaterialIcons name="expand-more" size={20} color={chevronColor} style={styles.chevron} />
      ) : null}
    </>
  );

  const cardColors = { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, cardColors, style, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.row, cardColors, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  rowPressed: { opacity: 0.92 },
  silhouetteWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  silhouetteImage: {
    width: "100%",
    height: "100%",
    opacity: 0.94,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "500",
  },
  chevron: { marginLeft: -2 },
});
