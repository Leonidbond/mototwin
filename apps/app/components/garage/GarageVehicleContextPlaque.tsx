import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildVehicleDetailViewModel, formatRideStyleChipRu, resolveGarageVehicleSilhouette } from "@mototwin/domain";
import type { GarageVehicleItem, VehicleDetail } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../src/api-base-url";
import { replaceVehicleIdInPath } from "../../src/garage-vehicle-route";
import { writeLastViewedVehicleId } from "../../src/ui-last-viewed-vehicle";
import adventureTouring from "../../../../images/Motocycles/adventure_touring.png";
import enduroDualSport from "../../../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadster from "../../../../images/Motocycles/naked_roadster.png";
import sportSupersport from "../../../../images/Motocycles/sport_supersport.png";
import cruiser from "../../../../images/Motocycles/cruiser.png";
import classicRetro from "../../../../images/Motocycles/classic_retro.png";
import scooterMaxiScooter from "../../../../images/Motocycles/scooter_maxi_scooter.png";

const SILHOUETTE_SRC: Record<string, ImageSourcePropType> = {
  adventure_touring: adventureTouring,
  enduro_dual_sport: enduroDualSport,
  naked_roadster: nakedRoadster,
  sport_supersport: sportSupersport,
  cruiser,
  classic_retro: classicRetro,
  scooter_maxi_scooter: scooterMaxiScooter,
};

const CARD_BG = "#111923";
const CARD_BORDER = "#1F2937";

function silhouetteSourceForVehicle(vehicle: VehicleDetail): ImageSourcePropType {
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

function formatPlaqueSubtitle(vehicle: VehicleDetail): string {
  const year = vehicle.modelVariant?.year ?? vehicle.year;
  const odometerLabel = vehicle.odometer.toLocaleString("ru-RU");
  const ride = formatRideStyleChipRu(vehicle.rideProfile);
  const base = `${year || "—"} · ${odometerLabel} км`;
  return ride ? `${base} · ${ride}` : base;
}

function labelForGarageVehicle(v: GarageVehicleItem): string {
  return v.nickname?.trim() || `${v.brand.name} ${v.model.name}`.trim();
}

/** Собираем query без `id` — id мотоцикла уже в pathname (`/vehicles/[id]/…`). */
function queryStringFromGlobalParams(params: Record<string, string | string[] | undefined>): string {
  const u = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "id") continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined && v !== "") u.append(key, String(v));
      }
    } else if (value !== "") {
      u.append(key, String(value));
    }
  }
  return u.toString();
}

export type GarageVehicleContextPlaqueProps = {
  vehicle: VehicleDetail | null;
  currentVehicleId: string;
  style?: StyleProp<ViewStyle>;
  /** Компактный режим: в строке только название + мини-силуэт, детали раскрываются отдельно. */
  compactByDefault?: boolean;
};

/**
 * Компактная плашка контекста мотоцикла под крошками (аналог web {@link SidebarVehiclePlaque}):
 * тап по карточке — экран мотоцикла; при нескольких ТС в гараже — выбор другого мотоцикла с сохранением «хвоста» маршрута.
 */
export function GarageVehicleContextPlaque({
  vehicle,
  currentVehicleId,
  style,
  compactByDefault = false,
}: GarageVehicleContextPlaqueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams();
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleItem[]>([]);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const client = createApiClient({ baseUrl: getApiBaseUrl() });
          const endpoints = createMotoTwinEndpoints(client);
          const res = await endpoints.getGarageVehicles();
          if (!cancelled) {
            setGarageVehicles((res.vehicles ?? []).filter((v) => !v.trashedAt));
          }
        } catch {
          if (!cancelled) {
            setGarageVehicles([]);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const silhouetteSource = useMemo(
    () => (vehicle ? silhouetteSourceForVehicle(vehicle) : nakedRoadster),
    [vehicle]
  );

  const title = useMemo(() => {
    if (!vehicle) return "";
    return buildVehicleDetailViewModel(vehicle).displayName;
  }, [vehicle]);

  const subtitle = useMemo(() => (vehicle ? formatPlaqueSubtitle(vehicle) : ""), [vehicle]);

  const canPick = garageVehicles.length > 1;

  const preservedQuery = useMemo(
    () => queryStringFromGlobalParams(globalParams as Record<string, string | string[] | undefined>),
    [globalParams]
  );

  const openDashboard = useCallback(() => {
    if (!currentVehicleId.trim()) return;
    writeLastViewedVehicleId(currentVehicleId);
    router.push(`/vehicles/${currentVehicleId}`);
  }, [currentVehicleId, router]);

  const applyVehicleSwitch = useCallback(
    (newId: string) => {
      if (!newId.trim() || newId === currentVehicleId) {
        setSwitchOpen(false);
        return;
      }
      writeLastViewedVehicleId(newId);
      setSwitchOpen(false);
      const nextPath = replaceVehicleIdInPath(pathname, newId);
      if (!nextPath) {
        router.replace(`/vehicles/${encodeURIComponent(newId)}`);
        return;
      }
      router.replace(preservedQuery ? `${nextPath}?${preservedQuery}` : nextPath);
    },
    [currentVehicleId, pathname, preservedQuery, router]
  );

  if (!vehicle) {
    return null;
  }

  return (
    <>
      <View style={[styles.wrap, style]}>
        <Pressable
          onPress={openDashboard}
          style={({ pressed }) => [
            styles.card,
            compactByDefault && styles.cardCompact,
            pressed && styles.cardPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Открыть мотоцикл: ${title}`}
        >
          <View style={styles.silhouetteWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- RN Image uses accessibilityLabel */}
            <Image
              source={silhouetteSource}
              style={styles.silhouetteImage}
              resizeMode="contain"
              accessibilityLabel="Силуэт класса мотоцикла"
            />
          </View>
          <View style={styles.textCol}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {!compactByDefault || detailsExpanded ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {compactByDefault ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setDetailsExpanded((prev) => !prev);
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.detailsToggle, pressed && styles.pickerBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={detailsExpanded ? "Скрыть детали мотоцикла" : "Показать детали мотоцикла"}
            >
              <MaterialIcons name={detailsExpanded ? "expand-less" : "expand-more"} size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
          {canPick ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setSwitchOpen(true);
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.inlinePickerBtn, pressed && styles.pickerBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Выбрать другой мотоцикл из гаража"
            >
              <MaterialIcons name="swap-horiz" size={16} color={c.textMuted} />
            </Pressable>
          ) : null}
        </Pressable>
        {canPick && !compactByDefault ? (
          <Pressable
            onPress={() => setSwitchOpen(true)}
            hitSlop={12}
            style={({ pressed }) => [styles.pickerBtn, pressed && styles.pickerBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Выбрать другой мотоцикл из гаража"
          >
            <MaterialIcons name="expand-more" size={22} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {compactByDefault && detailsExpanded ? (
        <View style={styles.detailsRow}>
          <Text numberOfLines={1} style={styles.detailsRowText}>
            {subtitle}
          </Text>
        </View>
      ) : null}

      <Modal visible={switchOpen} animationType="fade" transparent onRequestClose={() => setSwitchOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalScrim} onPress={() => setSwitchOpen(false)} accessibilityLabel="Закрыть" />
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Text style={styles.modalTitle}>Мотоцикл в гараже</Text>
            <FlatList
              data={garageVehicles}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.modalList}
              renderItem={({ item }) => {
                const active = item.id === currentVehicleId;
                return (
                  <Pressable
                    onPress={() => applyVehicleSwitch(item.id)}
                    style={({ pressed }) => [
                      styles.listRow,
                      active && styles.listRowActive,
                      pressed && styles.listRowPressed,
                    ]}
                  >
                    <Text style={[styles.listRowText, active && styles.listRowTextActive]} numberOfLines={2}>
                      {labelForGarageVehicle(item)}
                    </Text>
                    {active ? <MaterialIcons name="check" size={20} color={c.primaryAction} /> : null}
                  </Pressable>
                );
              }}
            />
            <Pressable onPress={() => setSwitchOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  card: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
  },
  cardCompact: {
    borderRadius: 10,
  },
  cardPressed: { opacity: 0.9 },
  silhouetteWrap: {
    width: 48,
    height: 28,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#F3F4F6",
    letterSpacing: -0.15,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  detailsToggle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePickerBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  pickerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
  },
  pickerBtnPressed: { opacity: 0.88 },
  detailsRow: {
    marginTop: 4,
    marginHorizontal: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
  },
  detailsRowText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    maxHeight: "72%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 1,
  },
  modalList: { maxHeight: 360 },
  modalTitle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  listRowActive: { backgroundColor: c.cardMuted },
  listRowPressed: { opacity: 0.9 },
  listRowText: { flex: 1, fontSize: 14, fontWeight: "600", color: c.textPrimary },
  listRowTextActive: { color: c.textPrimary },
  modalClose: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.primaryAction,
  },
});
