"use client";

import Image, { type StaticImageData } from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  calculateGarageScore,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getWishlistItemSkuDisplayLines,
  getVehicleSilhouetteClassLabel,
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
  ExpenseSummaryViewModel,
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
  expenseSummary: ExpenseSummaryViewModel;
  serviceEvents: ServiceEventItem[];
  wishlistItems: PartWishlistItemViewModel[];
  isTopServiceNodesLoading: boolean;
  topServiceNodesError: string;
  isServiceEventsLoading: boolean;
  serviceEventsError: string;
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
  onOpenAttention: () => void;
  onOpenAllNodes: () => void;
  onOpenNode: (nodeId: string) => void;
  onOpenNodeIssues: (nodeIds: string[]) => void;
  onOpenServiceLog: () => void;
  onOpenServiceLogEvent: (eventId: string) => void;
  onOpenExpenseDetails: () => void;
  onOpenAttentionItemService: (item: AttentionItemViewModel) => void;
  onOpenAttentionItemLog: (item: AttentionItemViewModel) => void;
  onOpenAttentionItemContext: (item: AttentionItemViewModel) => void;
};

export function VehicleDashboard(props: VehicleDashboardProps) {
  const {
    vehicle,
    detailViewModel,
    vehicleStateViewModel,
    topNodeOverviewCards,
    attentionSummary,
    attentionItems,
    expenseSummary,
    serviceEvents,
    wishlistItems,
    isTopServiceNodesLoading,
    topServiceNodesError,
    isServiceEventsLoading,
    serviceEventsError,
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
  const monthlyChart = buildCurrentMonthChart(serviceEvents, expenseSummary.currentMonthKey);
  const readiness = buildRideReadiness(attentionSummary);
  const seasonProgress = score ?? 0;
  const statsStripItems = buildStatsStripItems({
    vehicleStateViewModel,
    attentionSummary,
    expenseSummary,
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
  const heroMetaLine = [
    vehicle.modelVariant?.year ?? vehicle.year,
    vehicleStateViewModel?.odometerValue ?? `${vehicle.odometer} км`,
    vehicle.variantName || silhouetteClassLabel,
  ]
    .filter(Boolean)
    .join(" • ");

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
        className={styles.midGrid}
      >
        <Card padding="md">
          <SectionHeader
            title="Требует внимания"
            trailing={
              <Button variant="ghost" size="sm" onClick={props.onOpenAttention}>
                Все задачи
              </Button>
            }
          />
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {attentionItems.length === 0 ? (
              <EmptyStateBlock
                title="Критичных замечаний нет"
                details="Все основные узлы сейчас в нормальном состоянии."
              />
            ) : (
              attentionItems.slice(0, 3).map((item) => (
                <AttentionRow
                  key={item.nodeId}
                  item={item}
                  onOpenContext={() => props.onOpenAttentionItemContext(item)}
                  onOpenLog={() => props.onOpenAttentionItemLog(item)}
                  onOpenService={
                    item.canAddServiceEvent ? () => props.onOpenAttentionItemService(item) : undefined
                  }
                />
              ))
            )}
          </div>
        </Card>

        <Card padding="md">
          <SectionHeader
            title="Состояние узлов"
            trailing={
              <Button variant="ghost" size="sm" onClick={props.onOpenAllNodes}>
                Все узлы
              </Button>
            }
          />

          {isTopServiceNodesLoading ? (
            <MutedText style={{ marginTop: 14 }}>Загрузка основных узлов...</MutedText>
          ) : null}
          {!isTopServiceNodesLoading && topServiceNodesError ? (
            <MutedText style={{ marginTop: 14, color: productSemanticColors.error }}>
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
        </Card>
      </section>

      <section
        className={styles.lowerGrid}
      >
        <Card padding="md">
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
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
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
            title={`Расходы за ${capitalizeFirst(expenseSummary.currentMonthLabel)}`}
            trailing={
              <Button variant="ghost" size="sm" onClick={props.onOpenExpenseDetails}>
                Все расходы
              </Button>
            }
          />

          {isServiceEventsLoading ? <MutedText style={{ marginTop: 14 }}>Считаем расходы...</MutedText> : null}
          {!isServiceEventsLoading && serviceEventsError ? (
            <MutedText style={{ marginTop: 14, color: productSemanticColors.error }}>
              {serviceEventsError}
            </MutedText>
          ) : null}

          {!isServiceEventsLoading && !serviceEventsError ? (
            <>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: productSemanticColors.textPrimary, fontSize: 36, fontWeight: 700 }}>
                    {expenseSummary.currentMonthTotalsByCurrency.length > 0
                      ? expenseSummary.currentMonthTotalsByCurrency
                          .map(
                            (row) =>
                              `${formatExpenseAmountRu(row.totalAmount)} ${row.currency}`
                          )
                          .join(" · ")
                      : "0"}
                  </div>
                  <MutedText style={{ marginTop: 4 }}>
                    {monthlyChart.totalCount > 0
                      ? `${monthlyChart.totalCount} ${pluralizeRu(monthlyChart.totalCount, ["событие", "события", "событий"])} с затратами`
                      : "Платных сервисных событий за месяц пока нет"}
                  </MutedText>
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
                    details="Добавьте сумму в сервисную запись, и здесь появится распределение расходов."
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

function SectionHeader(props: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
  onOpenLog: () => void;
  onOpenService?: () => void;
  onOpenContext: () => void;
}) {
  const tokens = statusSemanticTokens[props.item.effectiveStatus];
  const iconAccent = tokens.accent === "transparent" ? tokens.foreground : tokens.accent;
  const iconGlow = `${iconAccent}38`;
  const iconSrc = getAttentionIconSrc(props.item.code);
  return (
    <div
      style={{
        boxSizing: "border-box",
        height: 74,
        padding: "8px 10px",
        borderRadius: 14,
        border: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.cardMuted,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: 10,
          height: "100%",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 13,
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.background,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.025), 0 0 16px ${iconGlow}`,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <Image
            src={iconSrc}
            alt=""
            fill
            sizes="40px"
            style={{
              objectFit: "contain",
              padding: 2,
              filter: `drop-shadow(0 0 7px ${iconAccent}) saturate(1.12)`,
            }}
          />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <div style={{ color: productSemanticColors.textPrimary, fontSize: 13, fontWeight: 700 }}>
              {props.item.name}
            </div>
            <StatusPill status={props.item.effectiveStatus} />
          </div>
          <MutedText
            style={{
              marginTop: 5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {props.item.shortExplanation || props.item.topLevelParentName || "Требуется внимание по регламенту обслуживания."}
          </MutedText>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {props.onOpenService ? (
            <CompactActionButton variant="primary" onClick={props.onOpenService}>
              ТО
            </CompactActionButton>
          ) : null}
          <CompactActionButton onClick={props.onOpenLog}>Журнал</CompactActionButton>
          <CompactActionButton onClick={props.onOpenContext}>Узел</CompactActionButton>
        </div>
      </div>
    </div>
  );
}

function CompactActionButton(props: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "neutral";
}) {
  const isPrimary = props.variant === "primary";
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        height: 26,
        padding: "0 9px",
        borderRadius: 9,
        border: `1px solid ${isPrimary ? "transparent" : productSemanticColors.border}`,
        backgroundColor: isPrimary ? productSemanticColors.primaryAction : "rgba(255,255,255,0.03)",
        color: isPrimary ? productSemanticColors.onPrimaryAction : productSemanticColors.textSecondary,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "pointer",
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
        minHeight: 112,
        overflow: "hidden",
        padding: "10px 82px 10px 12px",
        textAlign: "left",
        borderRadius: 14,
        border: `1px solid ${productSemanticColors.border}`,
        backgroundColor: productSemanticColors.cardMuted,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div>
          <div style={{ color: productSemanticColors.textPrimary, fontSize: 13, fontWeight: 700 }}>
            {normalizeTopNodeLabel(props.card)}
          </div>
        </div>
        <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
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
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "fit-content",
                  maxWidth: "100%",
                  minHeight: 21,
                  borderRadius: 999,
                  border: `1px solid ${nodeTokens.border}`,
                  backgroundColor: nodeTokens.background,
                  color: nodeTokens.foreground,
                  padding: "0 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
                title={`${node.name}: ${node.statusLabel}`}
              >
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>
        {props.card.nodes.length === 0 ? (
          <MutedText style={{ marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
          right: 4,
          top: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 78,
          height: 78,
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
            width: 74,
            height: 74,
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
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${formatIsoCalendarDateRu(event.eventDate)} · ${event.serviceType}. Открыть в журнале`}
      style={{
        display: "grid",
        gap: 3,
        padding: "7px 0",
        borderBottom: `1px solid ${productSemanticColors.divider}`,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        background: "transparent",
        margin: 0,
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: productSemanticColors.textMeta, fontSize: 11, whiteSpace: "nowrap" }}>
            {formatIsoCalendarDateRu(event.eventDate)}
          </span>
          <span
            style={{
              minWidth: 0,
              color: productSemanticColors.textPrimary,
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {event.serviceType}
          </span>
        </div>
        <div style={{ color: productSemanticColors.textPrimary, fontSize: 13, fontWeight: 700 }}>
          {event.costAmount && event.currency
            ? `${formatExpenseAmountRu(event.costAmount)} ${event.currency}`
            : "—"}
        </div>
      </div>
      <MutedText style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {event.node?.name || "Без привязки к узлу"}
      </MutedText>
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
        padding: "3px 10px",
        borderRadius: 999,
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.background,
        color: tokens.foreground,
        fontSize: 12,
        fontWeight: 700,
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

function MutedText(props: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
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
    .slice(0, 3);
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

function buildCurrentMonthChart(events: ServiceEventItem[], monthKey: string) {
  const paidEvents = events.filter((event) => {
    const key = new Date(event.eventDate);
    if (Number.isNaN(key.getTime())) {
      return event.eventDate.slice(0, 7) === monthKey;
    }
    const currentKey = `${key.getFullYear()}-${String(key.getMonth() + 1).padStart(2, "0")}`;
    return (
      currentKey === monthKey &&
      (event.eventKind ?? "SERVICE") !== "STATE_UPDATE" &&
      (event.costAmount ?? 0) > 0 &&
      Boolean(event.currency)
    );
  });

  const byNode = new Map<string, { amount: number; currency: string }>();
  for (const event of paidEvents) {
    const label = event.node?.name || event.serviceType || "Прочее";
    const currency = event.currency?.trim() || "RUB";
    const bucket = byNode.get(label) ?? { amount: 0, currency };
    bucket.amount += event.costAmount ?? 0;
    byNode.set(label, bucket);
  }

  const colors = ["#F97316", "#60A5FA", "#38BDF8", "#FBBF24"];
  const segments = Array.from(byNode.entries())
    .map(([label, value], index) => ({
      label,
      amount: value.amount,
      currency: value.currency,
      color: colors[index % colors.length],
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);

  return {
    totalCount: paidEvents.length,
    segments,
  };
}

function buildSeasonExpenses(summary: ExpenseSummaryViewModel): string {
  if (summary.byMonth.length === 0) {
    return "Нет данных";
  }
  const currentYear = new Date().getFullYear();
  const totals = new Map<string, number>();
  for (const month of summary.byMonth) {
    const year = Number(month.monthKey.slice(0, 4));
    if (year !== currentYear) {
      continue;
    }
    for (const row of month.totalsByCurrency) {
      totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.totalAmount);
    }
  }
  if (totals.size === 0) {
    return "Нет данных";
  }
  return Array.from(totals.entries())
    .map(([currency, amount]) => `${formatExpenseAmountRu(amount)} ${currency}`)
    .join(" · ");
}

function buildStatsStripItems(args: {
  vehicleStateViewModel: VehicleStateViewModel | null;
  attentionSummary: AttentionSummaryViewModel;
  expenseSummary: ExpenseSummaryViewModel;
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
      value: buildSeasonExpenses(args.expenseSummary),
      details:
        args.expenseSummary.paidEventCount > 0
          ? `${args.expenseSummary.paidEventCount} ${pluralizeRu(args.expenseSummary.paidEventCount, ["запись", "записи", "записей"])} с затратами`
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
