"use client";

import Image, { type StaticImageData } from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  buildExpenseAnalyticsFromItems,
  calculateGarageScore,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getCurrentExpenseMonthKey,
  getExpenseCategoryLabelRu,
  getExpenseMonthKeyFromIso,
  getWishlistItemSkuDisplayLines,
  getVehicleSilhouetteClassLabel,
  getNodeTightUiDisplayName,
  resolveGarageVehicleSilhouette,
} from "@mototwin/domain";
import {
  productSemanticColors,
  statusBadgeLabelsEn,
  statusSemanticTokens,
} from "@mototwin/design-tokens";
import type {
  AttentionItemViewModel,
  AttentionSummaryViewModel,
  ExpenseAnalyticsSummary,
  ExpenseItem,
  NodeStatus,
  PartWishlistItemViewModel,
  ServiceEventItem,
  TopNodeOverviewCard,
  VehicleDetail,
  VehicleDetailViewModel,
  VehicleStateViewModel,
} from "@mototwin/types";
import { Button, Card } from "@/components/ui";
import styles from "./VehicleDashboard.module.css";
import adventureTouring from "../../../../../images/Motocycles/adventure_touring.png";
import enduroDualSport from "../../../../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadster from "../../../../../images/Motocycles/naked_roadster.png";
import sportSupersport from "../../../../../images/Motocycles/sport_supersport.png";
import cruiser from "../../../../../images/Motocycles/cruiser.png";
import classicRetro from "../../../../../images/Motocycles/classic_retro.png";
import scooterMaxiScooter from "../../../../../images/Motocycles/scooter_maxi_scooter.png";
import brakesIcon from "../../../../../images/top-node-icons-dark/brakes/brakes.png";
import brakesFluidIcon from "../../../../../images/top-node-icons-dark/brakes/brakes_fluid.png";
import brakesFrontPadsIcon from "../../../../../images/top-node-icons-dark/brakes/brakes_front_pads.png";
import brakesRearPadsIcon from "../../../../../images/top-node-icons-dark/brakes/brakes_rear_pads.png";
import chainSprocketsIcon from "../../../../../images/top-node-icons-dark/chain_sprockets/chain_sprockets.png";
import drivetrainChainIcon from "../../../../../images/top-node-icons-dark/chain_sprockets/drivetrain_chain.png";
import drivetrainFrontSprocketIcon from "../../../../../images/top-node-icons-dark/chain_sprockets/drivetrain_front_sprocket.png";
import drivetrainRearSprocketIcon from "../../../../../images/top-node-icons-dark/chain_sprockets/drivetrain_rear_sprocket.png";
import coolingLiquidCoolantIcon from "../../../../../images/top-node-icons-dark/engine_cooling/cooling_liquid_coolant.png";
import electricsIgnitionSparkIcon from "../../../../../images/top-node-icons-dark/engine_cooling/electrics_ignition_spark.png";
import engineCoolingIcon from "../../../../../images/top-node-icons-dark/engine_cooling/engine_cooling.png";
import intakeFilterIcon from "../../../../../images/top-node-icons-dark/engine_cooling/intake_filter.png";
import engineLubeFilterIcon from "../../../../../images/top-node-icons-dark/lubrication/engine_lube_filter.png";
import engineLubeOilIcon from "../../../../../images/top-node-icons-dark/lubrication/engine_lube_oil.png";
import lubricationIcon from "../../../../../images/top-node-icons-dark/lubrication/lubrication.png";
import suspensionIcon from "../../../../../images/top-node-icons-dark/suspension/suspension.png";
import suspensionFrontOilIcon from "../../../../../images/top-node-icons-dark/suspension/suspension_front_oil.png";
import suspensionFrontSealsIcon from "../../../../../images/top-node-icons-dark/suspension/suspension_front_seals.png";
import tiresIcon from "../../../../../images/top-node-icons-dark/tires/tires.png";
import tiresFrontIcon from "../../../../../images/top-node-icons-dark/tires/tires_front.png";
import tiresRearIcon from "../../../../../images/top-node-icons-dark/tires/tires_rear.png";

const SILHOUETTE_SRC = {
  adventure_touring: adventureTouring,
  enduro_dual_sport: enduroDualSport,
  naked_roadster: nakedRoadster,
  sport_supersport: sportSupersport,
  cruiser,
  classic_retro: classicRetro,
  scooter_maxi_scooter: scooterMaxiScooter,
} as const satisfies Record<string, StaticImageData>;

const TOP_NODE_CARD_ICON_SRC = {
  brakes: brakesIcon,
  chain: chainSprocketsIcon,
  engine: engineCoolingIcon,
  lubrication: lubricationIcon,
  suspension: suspensionIcon,
  tires: tiresIcon,
} as const satisfies Record<TopNodeOverviewCard["key"], StaticImageData>;

/** С `max-width: 1120px` в `.midGrid` одна колонка — здесь порог двух колонок. */
const MID_GRID_TWO_COLUMN_MIN_PX = 1121;

function subscribeMidGridTwoColumn(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mq = window.matchMedia(`(min-width: ${MID_GRID_TWO_COLUMN_MIN_PX}px)`);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMidGridTwoColumnSnapshot(): boolean {
  if (typeof window === "undefined") {
    return getMidGridTwoColumnServerSnapshot();
  }
  return window.matchMedia(`(min-width: ${MID_GRID_TWO_COLUMN_MIN_PX}px)`).matches;
}

function getMidGridTwoColumnServerSnapshot(): boolean {
  return true;
}

/** Допуск по вертикали: бейджи в одном flex-ряду при align-items:center могли давать разный offsetTop. */
const BADGE_ROW_CLUSTER_PX = 10;

/** Сколько визуальных строк бейджей в flex-wrap контейнере. */
function countBadgeRows(strip: HTMLElement): number {
  if (strip.children.length === 0) {
    return 0;
  }
  const tops = [...strip.children].map((c) =>
    Math.round((c as HTMLElement).getBoundingClientRect().top)
  );
  tops.sort((a, b) => a - b);
  let rows = 1;
  let anchor = tops[0]!;
  for (let i = 1; i < tops.length; i++) {
    const t = tops[i]!;
    if (t - anchor > BADGE_ROW_CLUSTER_PX) {
      rows++;
      anchor = t;
    }
  }
  return rows;
}

const TOP_NODE_LEAF_ICON_SRC: Record<string, StaticImageData> = {
  "BRAKES.FLUID": brakesFluidIcon,
  "BRAKES.FRONT.PADS": brakesFrontPadsIcon,
  "BRAKES.REAR.PADS": brakesRearPadsIcon,
  "COOLING.LIQUID.COOLANT": coolingLiquidCoolantIcon,
  "DRIVETRAIN.CHAIN": drivetrainChainIcon,
  "DRIVETRAIN.FRONT_SPROCKET": drivetrainFrontSprocketIcon,
  "DRIVETRAIN.REAR_SPROCKET": drivetrainRearSprocketIcon,
  "ELECTRICS.IGNITION.SPARK": electricsIgnitionSparkIcon,
  "ENGINE.LUBE.FILTER": engineLubeFilterIcon,
  "ENGINE.LUBE.OIL": engineLubeOilIcon,
  "INTAKE.FILTER": intakeFilterIcon,
  "SUSPENSION.FRONT.OIL": suspensionFrontOilIcon,
  "SUSPENSION.FRONT.SEALS": suspensionFrontSealsIcon,
  "TIRES.FRONT": tiresFrontIcon,
  "TIRES.REAR": tiresRearIcon,
};

type VehicleDashboardProps = {
  vehicle: VehicleDetail;
  detailViewModel: VehicleDetailViewModel | null;
  vehicleStateViewModel: VehicleStateViewModel | null;
  topNodeOverviewCards: TopNodeOverviewCard[];
  attentionSummary: AttentionSummaryViewModel;
  attentionItems: AttentionItemViewModel[];
  expenseItems: ExpenseItem[];
  serviceEvents: ServiceEventItem[];
  wishlistItems: PartWishlistItemViewModel[];
  isTopServiceNodesLoading: boolean;
  topServiceNodesError: string;
  isServiceEventsLoading: boolean;
  serviceEventsError: string;
  isExpensesLoading: boolean;
  expensesError: string;
  isWishlistLoading: boolean;
  wishlistError: string;
  moveToTrashError: string;
  onEditProfile: () => void;
  onMoveToTrash: () => void;
  onUpdateMileage: () => void;
  onAddService: () => void;
  onAddExpense: () => void;
  onOpenParts: () => void;
  onOpenPartItem: (itemId: string) => void;
  onOpenAllNodes: () => void;
  onOpenNode: (nodeId: string) => void;
  onOpenNodeIssues: (nodeIds: string[]) => void;
  onOpenServiceLog: () => void;
  onOpenServiceLogEvent: (eventId: string) => void;
  onOpenExpenseDetails: () => void;
  onOpenAttentionItemService: (item: AttentionItemViewModel) => void;
  onOpenAttentionItemLog: (item: AttentionItemViewModel) => void;
  onOpenAttentionItemParts: (item: AttentionItemViewModel) => void;
};

export function VehicleDashboard(props: VehicleDashboardProps) {
  const {
    vehicle,
    detailViewModel,
    vehicleStateViewModel,
    topNodeOverviewCards,
    attentionSummary,
    attentionItems,
    expenseItems,
    serviceEvents,
    wishlistItems,
    isTopServiceNodesLoading,
    topServiceNodesError,
    isServiceEventsLoading,
    serviceEventsError,
    isExpensesLoading,
    expensesError,
    isWishlistLoading,
    wishlistError,
    moveToTrashError,
  } = props;
  const score = calculateGarageScore({
    totalCount: attentionSummary.totalCount,
    overdueCount: attentionSummary.overdueCount,
    soonCount: attentionSummary.soonCount,
  });
  const recentEvents = getRecentEvents(serviceEvents);
  const currentExpenseYear = new Date().getFullYear();
  const expenseAnalytics = buildExpenseAnalyticsFromItems(expenseItems, currentExpenseYear);
  const currentExpenseMonthKey = getCurrentExpenseMonthKey();
  const currentExpenseMonthLabel =
    expenseAnalytics.byMonth.find((month) => month.key === currentExpenseMonthKey)?.label ??
    new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const currentMonthExpenses = expenseItems.filter(
    (expense) => getExpenseMonthKeyFromIso(expense.expenseDate) === currentExpenseMonthKey
  );
  const monthlyChart = buildCurrentMonthExpenseChart(currentMonthExpenses);
  const currentMonthTotalsLabel = formatExpenseTotalsFromRows(
    expenseAnalytics.byMonth.find((month) => month.key === currentExpenseMonthKey)?.totalsByCurrency ?? []
  );
  const seasonTotalsLabel = formatExpenseTotalsFromRows(expenseAnalytics.selectedYearTotalsByCurrency);
  const readiness = buildRideReadiness(attentionSummary);
  const seasonProgress = score ?? 0;
  const statsStripItems = buildStatsStripItems({
    vehicleStateViewModel,
    attentionSummary,
    expenseAnalytics,
    serviceEvents,
  });
  const silhouetteKey = resolveGarageVehicleSilhouette({
    brand: { name: vehicle.brandName },
    model: { name: vehicle.modelName },
    modelVariant: {
      year: vehicle.year,
      versionName: vehicle.variantName,
      engineType: vehicle.modelVariant?.engineType ?? null,
      coolingType: vehicle.modelVariant?.coolingType ?? null,
    },
    rideProfile: vehicle.rideProfile,
  });
  const silhouetteClassLabel = getVehicleSilhouetteClassLabel(silhouetteKey);
  const silhouetteSrc = SILHOUETTE_SRC[silhouetteKey] ?? SILHOUETTE_SRC.naked_roadster;
  const wishlistItemByNodeId = new Map<string, PartWishlistItemViewModel>();
  for (const item of wishlistItems) {
    if (item.nodeId && !wishlistItemByNodeId.has(item.nodeId)) {
      wishlistItemByNodeId.set(item.nodeId, item);
    }
  }
  const heroMetaLine = [
    vehicle.modelVariant?.year ?? vehicle.year,
    vehicleStateViewModel?.odometerValue ?? `${vehicle.odometer} км`,
    vehicle.variantName || silhouetteClassLabel,
  ]
    .filter(Boolean)
    .join(" • ");

  const systemsPanelMeasureRef = useRef<HTMLDivElement>(null);
  const midGridRef = useRef<HTMLDivElement>(null);
  const [attentionPanelHeightPx, setAttentionPanelHeightPx] = useState<number | null>(null);
  const [midGridFr, setMidGridFr] = useState({ left: 52, right: 48 });
  const midGridTwoColumn = useSyncExternalStore(
    subscribeMidGridTwoColumn,
    getMidGridTwoColumnSnapshot,
    getMidGridTwoColumnServerSnapshot
  );

  useLayoutEffect(() => {
    const root = midGridRef.current;
    if (!root) {
      return;
    }

    const compute = () => {
      if (!window.matchMedia(`(min-width: ${MID_GRID_TWO_COLUMN_MIN_PX}px)`).matches) {
        root.style.removeProperty("grid-template-columns");
        setMidGridFr({ left: 52, right: 48 });
        return;
      }

      const strips = root.querySelectorAll<HTMLElement>("[data-system-badge-strip]");
      if (strips.length === 0) {
        return;
      }

      const total = 100;
      const ok = (rightFr: number) => {
        const leftFr = total - rightFr;
        root.style.setProperty(
          "grid-template-columns",
          `minmax(0, ${leftFr}fr) minmax(0, ${rightFr}fr)`
        );
        void root.offsetWidth;
        void strips[0]?.offsetWidth;
        for (let i = 0; i < strips.length; i++) {
          if (countBadgeRows(strips[i]!) > 2) {
            return false;
          }
        }
        return true;
      };

      let rightFr = 48;
      if (!ok(48)) {
        let lo = 49;
        let hi = 97;
        let ans = 97;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (ok(mid)) {
            ans = mid;
            hi = mid - 1;
          } else {
            lo = mid + 1;
          }
        }
        rightFr = ans;
        if (!ok(rightFr)) {
          rightFr = 97;
        }
      }
      root.style.removeProperty("grid-template-columns");
      setMidGridFr({ left: total - rightFr, right: rightFr });
    };

    compute();
    const ro = new ResizeObserver(() => {
      compute();
    });
    ro.observe(root);
    return () => {
      ro.disconnect();
      root.style.removeProperty("grid-template-columns");
    };
  }, [
    midGridTwoColumn,
    vehicle.id,
    topNodeOverviewCards,
    isTopServiceNodesLoading,
    topServiceNodesError,
  ]);

  useLayoutEffect(() => {
    const el = systemsPanelMeasureRef.current;
    if (!el) {
      return;
    }
    const readHeight = (entry?: ResizeObserverEntry) => {
      const fromRo =
        entry?.borderBoxSize && entry.borderBoxSize.length > 0
          ? entry.borderBoxSize[0]?.blockSize
          : undefined;
      const rect = el.getBoundingClientRect().height;
      const fallback = Math.max(el.offsetHeight, el.clientHeight);
      const raw = fromRo ?? Math.max(rect, fallback);
      return Math.round(raw);
    };
    const apply = (entry?: ResizeObserverEntry) => {
      const h = readHeight(entry);
      if (h > 0) {
        setAttentionPanelHeightPx(h);
      }
    };
    apply();
    const ro = new ResizeObserver((entries) => {
      apply(entries[0]);
    });
    ro.observe(el);
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      apply();
      requestAnimationFrame(() => {
        if (!cancelled) {
          apply();
        }
      });
    });
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [
    vehicle.id,
    topNodeOverviewCards,
    isTopServiceNodesLoading,
    topServiceNodesError,
  ]);

  return (
    <div className={styles.dashboardRoot}>
      <VehicleDashboardTopBar
        onAddExpense={props.onAddExpense}
        onAddService={props.onAddService}
        onOpenParts={props.onOpenParts}
      />

      {moveToTrashError ? (
        <Card
          style={{
            borderColor: productSemanticColors.errorBorder,
            backgroundColor: productSemanticColors.errorSurface,
          }}
        >
          <div style={{ color: productSemanticColors.error, fontSize: 14 }}>{moveToTrashError}</div>
        </Card>
      ) : null}

      <section
        className={styles.topGrid}
      >
        <Card
          padding="lg"
          style={{
            minWidth: 0,
            overflow: "hidden",
            padding: "22px 24px 16px",
            boxShadow: `0 18px 40px rgba(0, 0, 0, 0.28)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  color: productSemanticColors.textPrimary,
                  fontSize: 34,
                  lineHeight: "40px",
                  fontWeight: 700,
                  letterSpacing: -0.8,
                }}
              >
                {detailViewModel?.displayName || `${vehicle.brandName} ${vehicle.modelName}`}
              </h1>
              <div style={{ marginTop: 8, color: productSemanticColors.textSecondary, fontSize: 13 }}>
                {heroMetaLine}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: productSemanticColors.textMuted,
                  fontSize: 12,
                }}
              >
                <span>VIN: {vehicle.vin || "Не указан"}</span>
                <span style={{ color: productSemanticColors.textTertiary }}>•</span>
                <span>{silhouetteClassLabel}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MileageActionButton onClick={props.onUpdateMileage} />
              <IconButton label="Редактировать" onClick={props.onEditProfile}>
                <EditIcon />
              </IconButton>
              <IconButton label="Переместить на свалку" onClick={props.onMoveToTrash} tone="danger">
                <TrashIcon />
              </IconButton>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src={silhouetteSrc}
              alt={detailViewModel?.displayName || "Изображение мотоцикла"}
              priority
              sizes="(min-width: 1280px) 820px, 100vw"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: 360,
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

        </Card>

        <div className={styles.kpiStack}>
          <ScoreCard score={score} attentionSummary={attentionSummary} />
          <ProgressSummaryCard title={`Сезон ${new Date().getFullYear()}`} value={seasonProgress} />
          <ReadinessCard readiness={readiness} />
        </div>
      </section>

      <section
        ref={midGridRef}
        className={styles.midGrid}
        style={
          midGridTwoColumn
            ? {
                gridTemplateColumns: `minmax(0, ${midGridFr.left}fr) minmax(0, ${midGridFr.right}fr)`,
              }
            : undefined
        }
      >
        <Card
          className={styles.midGridCard}
          padding="md"
          style={{
            display: "flex",
            minHeight: 0,
            alignSelf: "start",
            flexDirection: "column",
            overflow: "hidden",
            ...(attentionPanelHeightPx != null
              ? {
                  height: attentionPanelHeightPx,
                  maxHeight: attentionPanelHeightPx,
                }
              : { minHeight: 220 }),
          }}
        >
          <SectionHeader title="Требует внимания" />
          <div className={styles.attentionScrollShell}>
            <div className={styles.attentionScrollList}>
              {attentionItems.length === 0 ? (
                <EmptyStateBlock
                  title="Критичных замечаний нет"
                  details="Все основные узлы сейчас в нормальном состоянии."
                />
              ) : (
                attentionItems.map((item) => (
                  <AttentionRow
                    key={item.nodeId}
                    item={item}
                    wishlistItem={wishlistItemByNodeId.get(item.nodeId) ?? null}
                    onOpenNode={() => props.onOpenNode(item.nodeId)}
                    onOpenLog={() => props.onOpenAttentionItemLog(item)}
                    onOpenService={
                      item.canAddServiceEvent ? () => props.onOpenAttentionItemService(item) : undefined
                    }
                    onOpenWishlistItem={(itemId) => props.onOpenPartItem(itemId)}
                    onOpenParts={() => props.onOpenAttentionItemParts(item)}
                  />
                ))
              )}
            </div>
          </div>
        </Card>

        <div
          ref={systemsPanelMeasureRef}
          style={{
            minWidth: 0,
            alignSelf: "start",
            height: "fit-content",
          }}
        >
          <Card
            padding="md"
            style={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <SectionHeader
              title="Состояние узлов"
              trailing={
                <Button variant="ghost" size="sm" onClick={props.onOpenAllNodes}>
                  Все узлы
                </Button>
              }
            />

            <div className={styles.systemsGridBody}>
              {isTopServiceNodesLoading ? (
                <MutedText style={{ marginTop: 12 }}>Загрузка основных узлов...</MutedText>
              ) : null}
              {!isTopServiceNodesLoading && topServiceNodesError ? (
                <MutedText style={{ marginTop: 12, color: productSemanticColors.error }}>
                  {topServiceNodesError}
                </MutedText>
              ) : null}

              {!isTopServiceNodesLoading && !topServiceNodesError ? (
                <div className={styles.systemsGrid}>
                  {topNodeOverviewCards.map((card) => (
                    <SystemStatusCard
                      key={card.key}
                      card={card}
                      onOpenNode={props.onOpenNode}
                      onOpenNodeIssues={props.onOpenNodeIssues}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </section>

      <section
        className={styles.lowerGrid}
      >
        <Card
          padding="md"
          style={{
            minWidth: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SectionHeader
            title="Последние события"
            trailing={
              <Button variant="ghost" size="sm" onClick={props.onOpenServiceLog}>
                Открыть журнал
              </Button>
            }
          />

          {isServiceEventsLoading ? <MutedText style={{ marginTop: 14 }}>Загрузка журнала...</MutedText> : null}
          {!isServiceEventsLoading && serviceEventsError ? (
            <MutedText style={{ marginTop: 14, color: productSemanticColors.error }}>
              {serviceEventsError}
            </MutedText>
          ) : null}
          {!isServiceEventsLoading && !serviceEventsError ? (
            <div className={styles.recentEventsList}>
              {recentEvents.length === 0 ? (
                <EmptyStateBlock
                  title="Пока нет сервисных записей"
                  details="После первого ТО или расхода здесь появятся последние события."
                />
              ) : (
                recentEvents.map((event) => (
                  <RecentEventRow key={event.id} event={event} onOpen={() => props.onOpenServiceLogEvent(event.id)} />
                ))
              )}
            </div>
          ) : null}
        </Card>

        <Card padding="md">
          <SectionHeader
            title={`Расходы за ${capitalizeFirst(currentExpenseMonthLabel)}`}
            trailing={
              <Button variant="ghost" size="sm" onClick={props.onOpenExpenseDetails}>
                Все расходы
              </Button>
            }
          />

          {isExpensesLoading ? <MutedText style={{ marginTop: 14 }}>Считаем расходы...</MutedText> : null}
          {!isExpensesLoading && expensesError ? (
            <MutedText style={{ marginTop: 14, color: productSemanticColors.error }}>
              {expensesError}
            </MutedText>
          ) : null}

          {!isExpensesLoading && !expensesError ? (
            <>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: productSemanticColors.textPrimary, fontSize: 18, fontWeight: 700 }}>
                    {currentMonthTotalsLabel}
                  </div>
                  <MutedText style={{ marginTop: 4 }}>
                    {monthlyChart.totalCount > 0
                      ? `${monthlyChart.totalCount} ${pluralizeRu(monthlyChart.totalCount, ["расход", "расхода", "расходов"])} за месяц`
                      : "Расходов за месяц пока нет"}
                  </MutedText>
                  <div
                    style={{
                      marginTop: 12,
                      borderTop: `1px solid ${productSemanticColors.border}`,
                      paddingTop: 10,
                    }}
                  >
                    <MutedText>За сезон {currentExpenseYear}</MutedText>
                    <div style={{ marginTop: 3, color: productSemanticColors.textPrimary, fontSize: 18, fontWeight: 700 }}>
                      {seasonTotalsLabel}
                    </div>
                    <MutedText style={{ marginTop: 2 }}>
                      {expenseAnalytics.selectedYearExpenseCount > 0
                        ? `${expenseAnalytics.selectedYearExpenseCount} ${pluralizeRu(expenseAnalytics.selectedYearExpenseCount, ["расход", "расхода", "расходов"])}`
                        : "Сезонных расходов пока нет"}
                    </MutedText>
                  </div>
                </div>
                <DonutChart segments={monthlyChart.segments} />
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                {monthlyChart.segments.length > 0 ? (
                  monthlyChart.segments.map((segment) => (
                    <LegendRow
                      key={segment.label}
                      color={segment.color}
                      label={segment.label}
                      value={`${formatExpenseAmountRu(segment.amount)} ${segment.currency}`}
                    />
                  ))
                ) : (
                  <EmptyStateBlock
                    title="Нет данных для диаграммы"
                    details="Добавьте расход, и здесь появится распределение по категориям."
                  />
                )}
              </div>
            </>
          ) : null}
        </Card>

        <Card padding="md">
          <SectionHeader
            title="Подбор деталей"
            trailing={
              <Button variant="ghost" size="sm" onClick={props.onOpenParts}>
                Открыть подбор
              </Button>
            }
          />

          {isWishlistLoading ? <MutedText style={{ marginTop: 14 }}>Подбираем детали...</MutedText> : null}
          {!isWishlistLoading && wishlistError ? (
            <MutedText style={{ marginTop: 14, color: productSemanticColors.error }}>
              {wishlistError}
            </MutedText>
          ) : null}
          {!isWishlistLoading && !wishlistError ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {wishlistItems.length === 0 ? (
                <EmptyStateBlock
                  title="Позиции пока не добавлены"
                  details="Откройте подбор деталей и добавьте первые расходники или запчасти."
                />
              ) : (
                wishlistItems
                  .slice(0, 3)
                  .map((item) => (
                    <PartRecommendationRow
                      key={item.id}
                      item={item}
                      onOpen={() => props.onOpenPartItem(item.id)}
                    />
                  ))
              )}
            </div>
          ) : null}
        </Card>
      </section>

      <Card
        padding="none"
        style={{
          overflow: "hidden",
          backgroundColor: productSemanticColors.cardMuted,
        }}
      >
        <div className={styles.statsGrid}>
          {statsStripItems.map((item, index) => (
            <StatsStripItem
              key={item.title}
              item={item}
              showDivider={index < statsStripItems.length - 1}
            />
          ))}
        </div>
      </Card>

    </div>
  );
}

function VehicleDashboardTopBar(props: {
  onAddService: () => void;
  onAddExpense: () => void;
  onOpenParts: () => void;
}) {
  return (
    <Card variant="subtle" padding="none" style={{ padding: "8px 10px 8px 12px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: `1px solid ${productSemanticColors.borderStrong}`,
              backgroundColor: productSemanticColors.card,
              color: productSemanticColors.textPrimary,
            }}
          >
            <ArrowLeftIcon />
          </span>
          <div>
            <div style={{ color: productSemanticColors.textMuted, fontSize: 11 }}>Мой гараж</div>
            <div style={{ color: productSemanticColors.textPrimary, fontSize: 14, fontWeight: 600 }}>
              Обзор мотоцикла
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Button variant="secondary" leadingIcon={<WrenchIcon />} onClick={props.onAddService}>
            Добавить ТО
          </Button>
          <Button variant="secondary" leadingIcon={<WalletIcon />} onClick={props.onAddExpense}>
            Добавить расход
          </Button>
          <Button variant="primary" leadingIcon={<PartsIcon />} onClick={props.onOpenParts}>
            Подобрать деталь
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Matches `Button` `size="sm"` height so mid-grid cards align with/without header actions. */
const SECTION_HEADER_ROW_MIN_HEIGHT_PX = 34;

function SectionHeader(props: { title: string; trailing?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: SECTION_HEADER_ROW_MIN_HEIGHT_PX,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: productSemanticColors.textPrimary,
          fontSize: 15,
          lineHeight: "20px",
          fontWeight: 700,
          letterSpacing: -0.15,
        }}
      >
        {props.title}
      </h2>
      {props.trailing}
    </div>
  );
}

function ScoreCard(props: {
  score: number | null;
  attentionSummary: AttentionSummaryViewModel;
}) {
  const score = props.score ?? 0;
  return (
        <Card padding="md">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: productSemanticColors.textSecondary, fontSize: 12, fontWeight: 700 }}>
            Garage Score
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ color: productSemanticColors.primaryAction, fontSize: 44, lineHeight: 1, fontWeight: 700 }}>
              {score}
            </span>
            <span style={{ color: productSemanticColors.textMuted, fontSize: 14 }}>/100</span>
          </div>
          <MutedText style={{ marginTop: 5 }}>Состояние текущего мотоцикла</MutedText>
        </div>
        <Gauge score={score} />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <KpiStat
          value={String(Math.max(0, 10 - props.attentionSummary.totalCount))}
          label="В норме"
          color={statusSemanticTokens.OK.foreground}
        />
        <KpiStat
          value={String(props.attentionSummary.soonCount)}
          label="Скоро"
          color={statusSemanticTokens.SOON.foreground}
        />
        <KpiStat
          value={String(props.attentionSummary.overdueCount)}
          label="Просрочено"
          color={statusSemanticTokens.OVERDUE.foreground}
        />
      </div>
    </Card>
  );
}

function ProgressSummaryCard(props: { title: string; value: number }) {
  return (
        <Card padding="md">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: productSemanticColors.textSecondary, fontSize: 12, fontWeight: 700 }}>
            {props.title}
          </div>
          <MutedText style={{ marginTop: 6 }}>Готовность на основе текущего состояния</MutedText>
        </div>
        <div style={{ color: productSemanticColors.primaryAction, fontSize: 30, fontWeight: 700 }}>
          {props.value}%
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          height: 8,
          borderRadius: 999,
          backgroundColor: productSemanticColors.cardSubtle,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, props.value))}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: productSemanticColors.primaryAction,
          }}
        />
      </div>
    </Card>
  );
}

function ReadinessCard(props: {
  readiness: { title: string; details: string; tone: "OK" | "SOON" | "OVERDUE" };
}) {
  const tokens = statusSemanticTokens[props.readiness.tone];
  return (
    <Card padding="md">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: tokens.background,
            color: tokens.foreground,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <ShieldIcon />
        </span>
        <div>
          <div style={{ color: productSemanticColors.textPrimary, fontSize: 14, fontWeight: 700 }}>
            Ride readiness
          </div>
          <div style={{ marginTop: 5, color: productSemanticColors.textSecondary, fontSize: 12 }}>
            {props.readiness.title}
          </div>
          <MutedText style={{ marginTop: 4 }}>{props.readiness.details}</MutedText>
        </div>
      </div>
    </Card>
  );
}

function AttentionRow(props: {
  item: AttentionItemViewModel;
  wishlistItem: PartWishlistItemViewModel | null;
  onOpenLog: () => void;
  onOpenService?: () => void;
  onOpenNode: () => void;
  onOpenWishlistItem: (itemId: string) => void;
  onOpenParts: () => void;
}) {
  const tokens = statusSemanticTokens[props.item.effectiveStatus];
  const iconAccent = tokens.accent === "transparent" ? tokens.foreground : tokens.accent;
  const iconGlow = `${iconAccent}38`;
  const iconSrc = getAttentionIconSrc(props.item.code);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={props.onOpenNode}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onOpenNode();
        }
      }}
      style={{
        boxSizing: "border-box",
        alignSelf: "start",
        width: "100%",
        minHeight: 0,
        padding: "8px 10px 10px",
        borderRadius: 14,
        border: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.cardMuted,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 9,
          width: "100%",
          minWidth: 0,
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 13,
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.background,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.025), 0 0 16px ${iconGlow}`,
            flexShrink: 0,
            overflow: "hidden",
            alignSelf: "flex-start",
          }}
        >
          <Image
            src={iconSrc}
            alt=""
            fill
            sizes="36px"
            style={{
              objectFit: "contain",
              padding: 2,
              filter: `drop-shadow(0 0 7px ${iconAccent}) saturate(1.12)`,
            }}
          />
        </span>
        <div style={{ minWidth: 0, flex: "1 1 0%", minHeight: "min-content", overflow: "visible" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: productSemanticColors.textPrimary,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {props.item.name}
            </div>
            <StatusPill status={props.item.effectiveStatus} />
          </div>
          <MutedText
            style={{
              marginTop: 4,
              paddingBottom: 2,
              fontSize: 11,
              lineHeight: "14px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {props.item.shortExplanation || props.item.topLevelParentName || "Требуется внимание по регламенту обслуживания."}
          </MutedText>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
            alignContent: "flex-start",
            gap: 6,
            flex: "0 1 auto",
            minWidth: 0,
            maxWidth: "100%",
            alignSelf: "flex-start",
          }}
        >
          {props.onOpenService ? (
            <CompactActionButton onClick={props.onOpenService}>
              ТО
            </CompactActionButton>
          ) : null}
          <CompactActionButton onClick={props.onOpenLog}>Журнал</CompactActionButton>
          <CompactActionButton
            variant={props.wishlistItem ? "cart" : "disabled"}
            title={
              props.wishlistItem
                ? `В корзине: ${props.wishlistItem.title}`
                : "Для этого узла пока нет позиции в корзине"
            }
            disabled={!props.wishlistItem}
            onClick={() => {
              if (props.wishlistItem) {
                props.onOpenWishlistItem(props.wishlistItem.id);
              }
            }}
          >
            В корзине
          </CompactActionButton>
          <CompactActionButton variant="primary" onClick={props.onOpenParts}>Подбор</CompactActionButton>
        </div>
      </div>
    </div>
  );
}

function CompactActionButton(props: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "neutral" | "cart" | "disabled";
  title?: string;
  disabled?: boolean;
}) {
  const isPrimary = props.variant === "primary";
  const isCart = props.variant === "cart";
  const isDisabled = props.disabled || props.variant === "disabled";
  return (
    <button
      type="button"
      title={props.title}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation();
        if (isDisabled) {
          return;
        }
        props.onClick();
      }}
      style={{
        flexShrink: 0,
        height: 26,
        padding: "0 8px",
        borderRadius: 9,
        border: `1px solid ${
          isPrimary
            ? "transparent"
            : isCart
              ? statusSemanticTokens.OK.border
              : isDisabled
                ? "rgba(255,255,255,0.018)"
              : productSemanticColors.border
        }`,
        backgroundColor: isPrimary
          ? productSemanticColors.primaryAction
          : isCart
            ? statusSemanticTokens.OK.background
            : isDisabled
              ? "rgba(2,6,23,0.08)"
            : "rgba(255,255,255,0.03)",
        color: isPrimary
          ? productSemanticColors.onPrimaryAction
          : isCart
            ? statusSemanticTokens.OK.foreground
            : isDisabled
              ? "rgba(148,163,184,0.28)"
            : productSemanticColors.textSecondary,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        cursor: isDisabled ? "default" : "pointer",
        opacity: isDisabled ? 0.24 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {props.children}
    </button>
  );
}

function SystemStatusCard(props: {
  card: TopNodeOverviewCard;
  onOpenNode: (nodeId: string) => void;
  onOpenNodeIssues: (nodeIds: string[]) => void;
}) {
  const tokens = getStatusTokens(props.card.status);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        padding: "4px 54px 5px 8px",
        textAlign: "left",
        borderRadius: 12,
        border: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.cardMuted,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            color: productSemanticColors.textPrimary,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: "14px",
          }}
        >
          {normalizeTopNodeLabel(props.card)}
        </div>
        <div
          data-system-badge-strip
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 4,
            alignItems: "flex-start",
            alignContent: "flex-start",
          }}
        >
          {props.card.nodes.map((node) => {
            const nodeTokens = getStatusTokens(node.status);
            return (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onOpenNode(node.id);
                }}
                key={node.code}
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 11,
                  border: `1px solid ${nodeTokens.border}`,
                  backgroundColor: nodeTokens.background,
                  color: nodeTokens.foreground,
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1.25,
                  textAlign: "center",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
                title={`${node.name}: ${node.statusLabel}`}
              >
                <span style={{ whiteSpace: "nowrap" }}>{getNodeTightUiDisplayName(node.code, node.name)}</span>
              </button>
            );
          })}
        </div>
        {props.card.nodes.length === 0 ? (
          <MutedText style={{ marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {props.card.details}
          </MutedText>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => props.onOpenNodeIssues(props.card.nodes.map((node) => node.id))}
        aria-label={`Показать проблемные узлы группы ${props.card.title}`}
        title="Показать узлы со статусом Скоро или Просрочено"
        style={{
          position: "absolute",
          right: 1,
          top: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 50,
          height: 50,
          opacity: 0.98,
          transform: "translateY(-50%)",
          border: 0,
          padding: 0,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            width: 46,
            height: 46,
            backgroundColor: tokens.foreground,
            maskImage: `url(${TOP_NODE_CARD_ICON_SRC[props.card.key].src})`,
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskImage: `url(${TOP_NODE_CARD_ICON_SRC[props.card.key].src})`,
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
          }}
        />
      </button>
    </div>
  );
}

function RecentEventRow({ event, onOpen }: { event: ServiceEventItem; onOpen: () => void }) {
  const costLabel =
    event.costAmount != null && event.costAmount > 0 && event.currency?.trim()
      ? `${formatExpenseAmountRu(event.costAmount)} ${event.currency.trim()}`
      : "—";
  const nodeLabel = event.node?.name?.trim() || "Без привязки к узлу";
  const metaLine = `${formatIsoCalendarDateRu(event.eventDate)} · ${nodeLabel}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${formatIsoCalendarDateRu(event.eventDate)} · ${event.serviceType}. Открыть в журнале`}
      style={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        borderRadius: 14,
        border: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.cardMuted,
        textAlign: "left",
        cursor: "pointer",
        overflow: "hidden",
        font: "inherit",
        color: "inherit",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: productSemanticColors.cardSubtle,
          color: productSemanticColors.primaryAction,
          flexShrink: 0,
        }}
      >
        <WrenchIcon />
      </span>
      <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "6px 10px",
            alignItems: "baseline",
          }}
        >
          <div
            title={event.serviceType}
            style={{
              minWidth: 0,
              color: productSemanticColors.textPrimary,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: "18px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {event.serviceType}
          </div>
          <div
            title={costLabel === "—" ? undefined : costLabel}
            style={{
              minWidth: 0,
              maxWidth: "10.5rem",
              justifySelf: "end",
              textAlign: "right",
              color: productSemanticColors.textPrimary,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: "18px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {costLabel}
          </div>
        </div>
        <MutedText
          title={metaLine}
          style={{
            marginTop: 3,
            fontSize: 12,
            lineHeight: "16px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {metaLine}
        </MutedText>
      </div>
      <span
        aria-hidden
        style={{
          color: productSemanticColors.textTertiary,
          fontSize: 18,
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        ›
      </span>
    </button>
  );
}

function PartRecommendationRow({
  item,
  onOpen,
}: {
  item: PartWishlistItemViewModel;
  onOpen: () => void;
}) {
  const skuLines = item.sku ? getWishlistItemSkuDisplayLines(item.sku) : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 14,
        border: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.cardMuted,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          width: 42,
          height: 42,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: productSemanticColors.cardSubtle,
          color: productSemanticColors.primaryAction,
          flexShrink: 0,
        }}
      >
        <PartsIcon />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: productSemanticColors.textPrimary, fontSize: 13, fontWeight: 700 }}>
          {item.title}
        </div>
        {skuLines ? (
          <MutedText style={{ marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {skuLines.primaryLine}
          </MutedText>
        ) : null}
        <MutedText style={{ marginTop: 4 }}>
          {item.node?.name ? `${item.node.name} • ${item.statusLabelRu}` : item.statusLabelRu}
        </MutedText>
      </div>
      <span style={{ color: productSemanticColors.textTertiary, fontSize: 18 }}>›</span>
    </button>
  );
}

function StatsStripItem(props: {
  item: { title: string; value: string; details: string; icon: ReactNode };
  showDivider: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 18px",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: productSemanticColors.cardSubtle,
          color: productSemanticColors.primaryAction,
          flexShrink: 0,
        }}
      >
        {props.item.icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: productSemanticColors.textMuted, fontSize: 11 }}>{props.item.title}</div>
        <div style={{ marginTop: 4, color: productSemanticColors.textPrimary, fontSize: 21, fontWeight: 700 }}>
          {props.item.value}
        </div>
        <MutedText style={{ marginTop: 4 }}>{props.item.details}</MutedText>
      </div>
      {props.showDivider ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            top: 18,
            bottom: 18,
            width: 1,
            backgroundColor: productSemanticColors.border,
          }}
        />
      ) : null}
    </div>
  );
}

function KpiStat(props: { value: string; label: string; color: string }) {
  return (
    <div>
      <div style={{ color: props.color, fontSize: 22, fontWeight: 700, lineHeight: "24px" }}>
        {props.value}
      </div>
      <MutedText style={{ marginTop: 2 }}>{props.label}</MutedText>
    </div>
  );
}

function StatusPill({ status }: { status: NodeStatus | null }) {
  const tokens = getStatusTokens(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 999,
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.background,
        color: tokens.foreground,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.25,
        flexShrink: 0,
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function LegendRow(props: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: props.color,
            flexShrink: 0,
          }}
        />
        <span style={{ color: productSemanticColors.textSecondary, fontSize: 13 }}>{props.label}</span>
      </div>
      <span style={{ color: productSemanticColors.textPrimary, fontSize: 13, fontWeight: 600 }}>
        {props.value}
      </span>
    </div>
  );
}

function DonutChart(props: {
  segments: Array<{ label: string; amount: number; color: string; currency: string }>;
}) {
  const total = props.segments.reduce((sum, segment) => sum + segment.amount, 0);
  if (total <= 0) {
    return (
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 999,
          border: `1px solid ${productSemanticColors.border}`,
          backgroundColor: productSemanticColors.cardSubtle,
        }}
      />
    );
  }

  const circumference = 2 * Math.PI * 44;

  return (
    <svg width="104" height="104" viewBox="0 0 124 124" aria-hidden>
      <circle cx="62" cy="62" r="44" fill="none" stroke={productSemanticColors.cardSubtle} strokeWidth="18" />
      {props.segments.map((segment, index) => {
        const length = (segment.amount / total) * circumference;
        const currentOffset = props.segments
          .slice(0, index)
          .reduce((sum, current) => sum + (current.amount / total) * circumference, 0);
        return (
          <circle
            key={segment.label}
            cx="62"
            cy="62"
            r="44"
            fill="none"
            stroke={segment.color}
            strokeWidth="18"
            strokeDasharray={`${length} ${circumference}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
            transform="rotate(-90 62 62)"
          />
        );
      })}
      <circle cx="62" cy="62" r="28" fill={productSemanticColors.card} />
    </svg>
  );
}

function Gauge({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, score));
  const circumference = Math.PI * 44;
  const dash = (value / 100) * circumference;
  return (
    <svg width="96" height="64" viewBox="0 0 110 74" aria-hidden>
      <path
        d="M11 63a44 44 0 0 1 88 0"
        fill="none"
        stroke={productSemanticColors.cardSubtle}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M11 63a44 44 0 0 1 88 0"
        fill="none"
        stroke={productSemanticColors.primaryAction}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
      />
    </svg>
  );
}

function IconButton(props: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const isDanger = props.tone === "danger";
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      style={{
        display: "inline-flex",
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        border: `1px solid ${
          isDanger ? productSemanticColors.errorBorder : productSemanticColors.borderStrong
        }`,
        backgroundColor: isDanger ? productSemanticColors.errorSurface : productSemanticColors.cardSubtle,
        color: isDanger ? productSemanticColors.error : productSemanticColors.textPrimary,
        cursor: "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

function MileageActionButton(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        display: "inline-flex",
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 13px",
        borderRadius: 10,
        border: "1px solid rgba(249, 115, 22, 0.55)",
        backgroundColor: productSemanticColors.primaryAction,
        color: productSemanticColors.onPrimaryAction,
        boxShadow: "0 10px 22px rgba(249, 115, 22, 0.22)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ display: "inline-flex" }}>
        <OdometerIcon />
      </span>
      Обновить пробег
    </button>
  );
}

function EmptyStateBlock(props: { title: string; details: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: `1px dashed ${productSemanticColors.borderStrong}`,
        backgroundColor: productSemanticColors.cardSubtle,
      }}
    >
      <div style={{ color: productSemanticColors.textPrimary, fontSize: 15, fontWeight: 600 }}>
        {props.title}
      </div>
      <MutedText style={{ marginTop: 6 }}>{props.details}</MutedText>
    </div>
  );
}

function MutedText(props: { children: ReactNode; style?: CSSProperties; title?: string }) {
  return (
    <div
      title={props.title}
      style={{
        color: productSemanticColors.textMuted,
        fontSize: 13,
        lineHeight: "18px",
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}

function getRecentEvents(events: ServiceEventItem[]): ServiceEventItem[] {
  return [...events]
    .filter((event) => (event.eventKind ?? "SERVICE") !== "STATE_UPDATE")
    .sort((left, right) => new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime())
    .slice(0, 4);
}

function buildRideReadiness(summary: AttentionSummaryViewModel): {
  title: string;
  details: string;
  tone: "OK" | "SOON" | "OVERDUE";
} {
  if (summary.overdueCount > 0) {
    return {
      title: "Можно ехать, но есть просроченные задачи",
      details: `Проверьте ${summary.overdueCount} ${pluralizeRu(summary.overdueCount, ["узел", "узла", "узлов"])} со статусом «Просрочено».`,
      tone: "OVERDUE",
    };
  }
  if (summary.soonCount > 0) {
    return {
      title: "Поездка допустима, но обслуживание скоро понадобится",
      details: `Внимания требуют ${summary.soonCount} ${pluralizeRu(summary.soonCount, ["узел", "узла", "узлов"])} со статусом «Скоро».`,
      tone: "SOON",
    };
  }
  return {
    title: "Можно ехать, критичных замечаний нет",
    details: "Все ключевые узлы сейчас в нормальном состоянии.",
    tone: "OK",
  };
}

function buildCurrentMonthExpenseChart(expenses: ExpenseItem[]) {
  const byCategory = new Map<string, { amount: number; currency: string }>();
  for (const expense of expenses) {
    const label = getExpenseCategoryLabelRu(expense.category);
    const currency = expense.currency.trim() || "RUB";
    const bucket = byCategory.get(label) ?? { amount: 0, currency };
    bucket.amount += expense.amount;
    byCategory.set(label, bucket);
  }

  const colors = ["#F97316", "#60A5FA", "#38BDF8", "#FBBF24"];
  const segments = Array.from(byCategory.entries())
    .map(([label, value], index) => ({
      label,
      amount: value.amount,
      currency: value.currency,
      color: colors[index % colors.length],
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);

  return {
    totalCount: expenses.length,
    segments,
  };
}

function formatExpenseTotalsFromRows(
  rows: Array<{ currency: string; totalAmount: number }>
): string {
  if (rows.length === 0) {
    return "0";
  }
  return rows
    .map((row) => `${formatExpenseAmountRu(row.totalAmount)} ${row.currency}`)
    .join(" · ");
}

function buildStatsStripItems(args: {
  vehicleStateViewModel: VehicleStateViewModel | null;
  attentionSummary: AttentionSummaryViewModel;
  expenseAnalytics: ExpenseAnalyticsSummary;
  serviceEvents: ServiceEventItem[];
}): Array<{ title: string; value: string; details: string; icon: ReactNode }> {
  const latestEvent = [...args.serviceEvents]
    .filter((event) => (event.eventKind ?? "SERVICE") !== "STATE_UPDATE")
    .sort((left, right) => new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime())[0];

  const nextServiceValue =
    args.attentionSummary.overdueCount > 0
      ? "Сейчас"
      : args.attentionSummary.soonCount > 0
        ? "Скоро"
        : "По плану";
  const nextServiceDetails =
    args.attentionSummary.overdueCount > 0
      ? `${args.attentionSummary.overdueCount} ${pluralizeRu(args.attentionSummary.overdueCount, ["узел просрочен", "узла просрочено", "узлов просрочено"])}`
      : args.attentionSummary.soonCount > 0
        ? `${args.attentionSummary.soonCount} ${pluralizeRu(args.attentionSummary.soonCount, ["узел скоро потребует ТО", "узла скоро потребуют ТО", "узлов скоро потребуют ТО"])}`
        : "Критичных задач нет";

  return [
    {
      title: "Следующее ТО",
      value: nextServiceValue,
      details: nextServiceDetails,
      icon: <WrenchIcon />,
    },
    {
      title: "Текущий пробег",
      value: args.vehicleStateViewModel?.odometerValue ?? "Нет данных",
      details: args.vehicleStateViewModel?.engineHoursValue
        ? `Моточасы: ${args.vehicleStateViewModel.engineHoursValue}`
        : "Моточасы не указаны",
      icon: <OdometerIcon />,
    },
    {
      title: "Сезонные расходы",
      value: formatExpenseTotalsFromRows(args.expenseAnalytics.selectedYearTotalsByCurrency),
      details:
        args.expenseAnalytics.selectedYearExpenseCount > 0
          ? `${args.expenseAnalytics.selectedYearExpenseCount} ${pluralizeRu(args.expenseAnalytics.selectedYearExpenseCount, ["расход", "расхода", "расходов"])}`
          : "Расходы еще не указаны",
      icon: <TrendIcon />,
    },
    {
      title: "Последний сервис",
      value: latestEvent ? formatIsoCalendarDateRu(latestEvent.eventDate) : "Нет данных",
      details: latestEvent ? latestEvent.serviceType : "История обслуживания пока пустая",
      icon: <GaugeIcon />,
    },
  ];
}

function getStatusTokens(status: NodeStatus | null) {
  return status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
}

function getStatusLabel(status: NodeStatus | null): string {
  if (!status) {
    return "Unknown";
  }
  return statusBadgeLabelsEn[status];
}

function normalizeTopNodeLabel(card: TopNodeOverviewCard): string {
  switch (card.key) {
    case "lubrication":
      return "Масло";
    case "engine":
      return "Двигатель";
    case "brakes":
      return "Тормоза";
    case "tires":
      return "Шины";
    case "chain":
      return "Цепь";
    case "suspension":
      return "Подвеска";
    default:
      return card.title;
  }
}

function getAttentionIconSrc(code: string): StaticImageData {
  const direct = TOP_NODE_LEAF_ICON_SRC[code];
  if (direct) {
    return direct;
  }
  if (code.startsWith("ENGINE.LUBE")) {
    return lubricationIcon;
  }
  if (
    code.startsWith("ENGINE") ||
    code.startsWith("INTAKE") ||
    code.startsWith("COOLING") ||
    code.startsWith("ELECTRICS.IGNITION")
  ) {
    return engineCoolingIcon;
  }
  if (code.startsWith("BRAKES")) {
    return brakesIcon;
  }
  if (code.startsWith("TIRES") || code.startsWith("WHEELS")) {
    return tiresIcon;
  }
  if (code.startsWith("DRIVETRAIN")) {
    return chainSprocketsIcon;
  }
  if (code.startsWith("SUSPENSION")) {
    return suspensionIcon;
  }
  return engineCoolingIcon;
}

function pluralizeRu(value: number, variants: [string, string, string]) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return variants[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return variants[1];
  }
  return variants[2];
}

function capitalizeFirst(value: string) {
  return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : value;
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 0 0-5.5 5.6L4 17v3h3l5.1-5.2a4 4 0 0 0 5.6-5.5l-2.6 2.5-2.8-.6-.6-2.8z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h18v10H3z" />
      <path d="M16 12h.01" />
      <path d="M5 7V5h12v2" />
    </svg>
  );
}

function PartsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 0 0-5.5 5.6L4 17v3h3l5.1-5.2a4 4 0 0 0 5.6-5.5l-2.6 2.5-2.8-.6-.6-2.8z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v6c0 5-3.5 7.7-7 9-3.5-1.3-7-4-7-9V6l7-3z" />
    </svg>
  );
}

function OdometerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 18a9 9 0 1 1 14 0" />
      <path d="M12 12l4-3" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 17l5-5 4 4 7-8" />
      <path d="M20 8v5h-5" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 15a7 7 0 1 1 14 0" />
      <path d="M12 12l3-3" />
    </svg>
  );
}
