"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildNodeTreeSectionProps,
  canOpenNodeStatusExplanationModal,
  buildRideProfileViewModel,
  buildVehicleHeaderProps,
  buildVehicleStateViewModel,
  buildVehicleTechnicalInfoViewModel,
  vehicleDetailFromApiRecord,
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromNode,
  createInitialAddServiceEventFromWishlistItem,
  createInitialEditServiceEventValues,
  buildInitialVehicleProfileFormValues,
  createInitialVehicleStateFormValues,
  createServiceLogNodeFilter,
  findNodePathById,
  findNodeTreeItemById,
  getNodeSubtreeById,
  getTopLevelNodeTreeItems,
  buildNodeSearchResultActions,
  buildNodeContextViewModel,
  searchNodeTree,
  formatIsoCalendarDateRu,
  getRecentServiceEventsForNode,
  getAvailableChildrenForSelectedPath,
  getNodeSelectLevels,
  getSelectedNodeFromPath,
  getStatusExplanationTriggeredByLabel,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  normalizeVehicleProfileFormValues,
  normalizeVehicleStatePayload,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  validateAddServiceEventFormValues,
  validateVehicleProfileFormValues,
  validateVehicleStateFormValues,
  buildExpenseSummaryFromServiceEvents,
  formatExpenseAmountRu,
  expenseCategoryLabelsRu,
  buildAttentionSummaryFromNodeTree,
  calculateSnoozeUntilDate,
  buildNodeMaintenancePlanViewModel,
  formatSnoozeUntilLabel,
  getDefaultCurrencyFromSettings,
  buildPartWishlistItemViewModel,
  createInitialPartWishlistFormValues,
  flattenNodeTreeToSelectOptions,
  groupPartWishlistItemsByStatus,
  filterActiveWishlistItems,
  normalizeCreatePartWishlistPayload,
  normalizeUpdatePartWishlistPayload,
  partWishlistFormValuesFromItem,
  partWishlistStatusLabelsRu,
  PART_WISHLIST_STATUS_ORDER,
  validatePartWishlistFormValues,
  isWishlistTransitionToInstalled,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
  applyPartSkuViewModelToPartWishlistFormValues,
  buildPartRecommendationGroupsForDisplay,
  buildServiceKitPreview,
  buildTopNodeOverviewCards,
  getPartRecommendationWarningLabel,
  getWishlistItemSkuDisplayLines,
  isNodeSnoozed,
  normalizeUserLocalSettings,
  DEFAULT_USER_LOCAL_SETTINGS,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
} from "@mototwin/domain";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors, statusSemanticTokens, statusTextLabelsRu } from "@mototwin/design-tokens";
import { ACTION_SVG_BODIES, type ActionIconKey } from "@mototwin/icons";
import { TopNodeIcon } from "@/components/icons/top-nodes";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import { getNodeTreeIconWebSrc } from "@/node-tree-icons";
import { VehicleDashboard } from "./_components/VehicleDashboard";
import { PartsCartPage } from "./parts/_components/PartsCartPage";
import { PartPickerShell, type PartPickerTab } from "./parts/_components/PartPickerShell";
import {
  buildPartSkuViewModelFromRecommendation,
  normalizePartNumberForLookup,
} from "./parts/_components/part-picker-utils";
import type {
  AttentionItemViewModel,
  NodeSnoozeOption,
  EditVehicleProfileFormValues,
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemViewModel,
  NodeTreeSearchResultViewModel,
  NodeTreeSearchActionKey,
  NodeContextViewModel,
  SelectedNodePath,
  ExpenseNodeSummaryItem,
  ExpenseItem,
  ServiceEventItem,
  VehicleDetail,
  VehicleDetailApiRecord,
  AddServiceEventFormValues,
  PartRecommendationViewModel,
  PartRecommendationGroup,
  ServiceKitViewModel,
  ServiceKitPreviewViewModel,
  PartWishlistItemStatus,
  PartWishlistFormValues,
  PartWishlistItem,
  PartWishlistItemViewModel,
  PartSkuViewModel,
  TopNodeOverviewCard,
  TopServiceNodeItem,
} from "@mototwin/types";

const vehicleDetailApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function NodeContextReferencePanel({
  viewModel,
  showSubtreeCompositionSection,
  subtreeCompositionItems,
  onSelectCompositionNode,
  isAddingCompatiblePart,
  isCompatiblePartLoading,
  compatiblePartError,
  recommendations,
  serviceKits,
  isServiceKitsLoading,
  serviceKitsError,
  addingServiceKitCode,
  snoozeLabel,
  canSnooze,
  uninstalledParts,
  totalUninstalledParts,
  updatingWishlistItemId,
  onAddService,
  onPickParts,
  onOpenAllEvents,
  onOpenEvent,
  onOpenStatusExplanation,
  onOpenCompatiblePart,
  onAddCompatiblePart,
  onOpenServiceKit,
  onAddServiceKit,
  onSnooze7Days,
  onSnooze30Days,
  onClearSnooze,
  onOpenWishlistPart,
  onAdvanceWishlistPartStatus,
  onOpenAllUninstalledParts,
  nodeExpenseSummary,
  onOpenNodeExpenses,
}: {
  viewModel: NodeContextViewModel;
  showSubtreeCompositionSection: boolean;
  subtreeCompositionItems: { id: string; name: string; depthFromSelected: number }[];
  onSelectCompositionNode: (nodeId: string) => void;
  isAddingCompatiblePart: boolean;
  isCompatiblePartLoading: boolean;
  compatiblePartError: string;
  recommendations: PartRecommendationViewModel[];
  serviceKits: ServiceKitViewModel[];
  isServiceKitsLoading: boolean;
  serviceKitsError: string;
  addingServiceKitCode: string;
  snoozeLabel: string | null;
  canSnooze: boolean;
  uninstalledParts: PartWishlistItemViewModel[];
  totalUninstalledParts: number;
  updatingWishlistItemId: string;
  onAddService: () => void;
  onPickParts: () => void;
  onOpenAllEvents: () => void;
  onOpenEvent: (eventId: string, eventNodeId: string) => void;
  onOpenStatusExplanation: () => void;
  onOpenCompatiblePart: (rec: PartRecommendationViewModel) => void;
  onAddCompatiblePart: (rec: PartRecommendationViewModel) => void;
  onOpenServiceKit: (kit: ServiceKitViewModel) => void;
  onAddServiceKit: (kit: ServiceKitViewModel) => void;
  onSnooze7Days: () => void;
  onSnooze30Days: () => void;
  onClearSnooze: () => void;
  onOpenWishlistPart: (item: PartWishlistItemViewModel) => void;
  onAdvanceWishlistPartStatus: (item: PartWishlistItemViewModel) => void;
  onOpenAllUninstalledParts: () => void;
  nodeExpenseSummary: NodeContextExpenseSummary;
  onOpenNodeExpenses: () => void;
}) {
  const subtreeCompositionPreviewLimit = 12;
  const [isSubtreeCompositionExpanded, setIsSubtreeCompositionExpanded] = useState(false);
  const statusTokens = viewModel.effectiveStatus
    ? statusSemanticTokens[viewModel.effectiveStatus]
    : statusSemanticTokens.UNKNOWN;
  const events = viewModel.recentServiceEvents.slice(0, 3);
  const maintenance = viewModel.maintenancePlan;
  const border = productSemanticColors.border;
  const card = productSemanticColors.cardSubtle;
  const header = productSemanticColors.cardMuted;
  const availableActionKeys = new Set(viewModel.actions.map((action) => action.key));
  const canAddService = availableActionKeys.has("add_service_event");
  const canPickParts = availableActionKeys.has("add_wishlist");
  const canOpenStatusExplanation = availableActionKeys.has("open_status_explanation");
  const status = viewModel.effectiveStatus;
  const alertTitle =
    status === "OVERDUE"
      ? "Регламент обслуживания превышен."
      : status === "SOON"
      ? "Скоро потребуется обслуживание."
      : status === "RECENTLY_REPLACED"
      ? "Недавно выполнено обслуживание."
      : status === "OK"
      ? "Узел обслужен по регламенту."
      : "Нет данных по регламенту обслуживания.";
  const alertDescription =
    viewModel.shortExplanationLabel ??
    (status === "OVERDUE"
      ? "Рекомендуется выполнить обслуживание в ближайшее время."
      : status === "SOON"
      ? "Запланируйте обслуживание заранее, чтобы не выйти за регламент."
      : status === "RECENTLY_REPLACED"
      ? "Последнее обслуживание учтено, следующий интервал рассчитывается по регламенту."
      : status === "OK"
      ? "Критичных действий по этому узлу сейчас не требуется."
      : "Добавьте сервисное событие или расходник, чтобы рассчитать статус узла.");
  const rawNextServiceLine = maintenance?.dueLines[0] ?? null;
  const nextServiceLine =
    status === "OVERDUE" || !rawNextServiceLine?.includes("Просрочено")
      ? rawNextServiceLine
      : null;
  const nextServiceHint =
    status === "OVERDUE"
      ? "Рекомендуется выполнить сейчас"
      : status === "SOON"
      ? "Подготовьте обслуживание"
      : "По текущему регламенту";
  const nextServiceColor =
    status === "OVERDUE"
      ? productSemanticColors.error
      : status === "SOON"
      ? statusSemanticTokens.SOON.foreground
      : productSemanticColors.textPrimary;
  const lastServiceLine = maintenance?.lastServiceLine ?? "Нет записей";
  const intervalLine = maintenance?.ruleIntervalLine ?? "Интервал не задан";
  const visibleRecommendations = recommendations.slice(0, 5);
  const visibleServiceKits = serviceKits.slice(0, 3);
  const visibleUninstalledParts = uninstalledParts.slice(0, 3);
  const isLeafNode = viewModel.isLeaf;
  const visibleSubtreeCompositionItems = isSubtreeCompositionExpanded
    ? subtreeCompositionItems
    : subtreeCompositionItems.slice(0, subtreeCompositionPreviewLimit);

  const sectionStyle: CSSProperties = {
    minWidth: 0,
    overflow: "hidden",
    border: `1px solid ${border}`,
    borderRadius: 9,
    backgroundColor: card,
  };

  const sectionHeaderStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px 7px",
    borderBottom: `1px solid ${border}`,
    backgroundColor: header,
    fontSize: 13,
    fontWeight: 700,
  };
  const sectionHeaderActionStyle: CSSProperties = {
    border: 0,
    background: "transparent",
    color: productSemanticColors.primaryAction,
    fontSize: 11,
    fontWeight: 700,
  };

  return (
    <aside
      className="garage-dark-surface-text"
      style={{
        border: `1px solid ${border}`,
        borderRadius: 12,
        backgroundColor: productSemanticColors.card,
        boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
        color: productSemanticColors.textPrimary,
        padding: 12,
        display: "grid",
        minWidth: 0,
        maxWidth: "100%",
        alignSelf: "start",
        alignContent: "start",
        gap: 8,
        overflowX: "hidden",
      }}
    >
      <div style={{ display: "flex", minWidth: 0, alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              width: 48,
              height: 48,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: `1px solid ${statusTokens.border}`,
              backgroundColor: statusTokens.background,
              color: statusTokens.foreground,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 42 42" fill="none">
              <circle cx="21" cy="21" r="15" stroke="currentColor" strokeWidth="2" />
              <circle cx="21" cy="21" r="8" stroke="currentColor" strokeWidth="2" />
              <circle cx="21" cy="21" r="3" fill="currentColor" />
              <path d="M21 2v7M21 33v7M2 21h7M33 21h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 18, lineHeight: "22px", fontWeight: 700 }}>
              {viewModel.nodeName}
            </h2>
            <p style={{ margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: productSemanticColors.textSecondary, fontSize: 11, lineHeight: "14px", fontWeight: 700 }}>
              {viewModel.nodeCode} · {viewModel.pathLabel}
            </p>
          </div>
        </div>
        {viewModel.effectiveStatus ? (
          <span
            style={{
              display: "inline-flex",
              height: 32,
              flexShrink: 1,
              minWidth: 0,
              alignItems: "center",
              gap: 6,
              border: `1px solid ${statusTokens.border}`,
              borderRadius: 9,
              backgroundColor: statusTokens.background,
              color: statusTokens.foreground,
              padding: "0 11px",
              fontSize: 12,
              fontWeight: 700,
              maxWidth: "42%",
            }}
          >
            <span aria-hidden style={{ width: 13, height: 13, borderRadius: 999, border: `1px solid ${statusTokens.foreground}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: statusTokens.foreground }} />
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewModel.statusLabel}</span>
          </span>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 65fr) minmax(0, 35fr)", gap: 8 }}>
        <button
          type="button"
          onClick={canOpenStatusExplanation ? onOpenStatusExplanation : undefined}
          disabled={!canOpenStatusExplanation}
          title={canOpenStatusExplanation ? "Открыть пояснение статуса" : undefined}
          style={{
            width: "100%",
            minHeight: 86,
            appearance: "none",
            textAlign: "left",
            border: `1px solid ${border}`,
            borderRadius: 9,
            backgroundColor: card,
            color: productSemanticColors.textPrimary,
            padding: "10px 12px 9px",
            cursor: canOpenStatusExplanation ? "pointer" : "default",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
            <span style={{ marginTop: 5, width: 8, height: 8, flexShrink: 0, borderRadius: 999, backgroundColor: statusTokens.foreground }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 700 }}>{alertTitle}</p>
              <p style={{ margin: "3px 0 0", maxWidth: 520, color: productSemanticColors.textSecondary, fontSize: 11, lineHeight: "14px", fontWeight: 500 }}>
                {alertDescription}
              </p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onOpenNodeExpenses}
          title="Открыть расходы по этому узлу"
          style={{
            minHeight: 86,
            appearance: "none",
            textAlign: "left",
            border: `1px solid ${nodeExpenseSummary.hasExpenses ? productSemanticColors.primaryAction : border}`,
            borderRadius: 9,
            backgroundColor: nodeExpenseSummary.hasExpenses ? "rgba(249, 115, 22, 0.12)" : card,
            color: productSemanticColors.textPrimary,
            padding: "10px 12px 9px",
            cursor: "pointer",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 11, fontWeight: 800 }}>
            Расходы по узлу
          </p>
          <p style={{ margin: "7px 0 0", overflowWrap: "anywhere", color: productSemanticColors.textPrimary, fontSize: 17, lineHeight: "20px", fontWeight: 800 }}>
            {nodeExpenseSummary.totalsLabel}
          </p>
          <p style={{ margin: "4px 0 0", color: productSemanticColors.textSecondary, fontSize: 10, lineHeight: "13px" }}>
            Сезон {nodeExpenseSummary.year} · {nodeExpenseSummary.expenseCount} записей
          </p>
        </button>
      </div>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span>Обслуживание</span>
          {isLeafNode ? (
            <button
              type="button"
              onClick={canAddService ? onAddService : undefined}
              disabled={!canAddService}
              style={{
                ...sectionHeaderActionStyle,
                cursor: canAddService ? "pointer" : "not-allowed",
                opacity: canAddService ? 1 : 0.45,
              }}
            >
              Добавить
            </button>
          ) : null}
        </div>
        <div style={{ display: "grid", minWidth: 0, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", alignItems: "start", fontSize: 11 }}>
          <div style={{ minWidth: 0, padding: "8px 12px 7px" }}>
            <p style={{ margin: 0, color: productSemanticColors.textMuted }}>Последнее обслуживание</p>
            <p style={{ margin: "3px 0 0", overflowWrap: "anywhere", fontSize: 12, lineHeight: "15px", fontWeight: 700 }}>{lastServiceLine}</p>
          </div>
          <div style={{ minWidth: 0, padding: "8px 12px 7px", borderLeft: `1px solid ${border}` }}>
            <p style={{ margin: 0, color: productSemanticColors.textMuted }}>Следующее обслуживание</p>
            <p style={{ margin: "3px 0 0", overflowWrap: "anywhere", color: nextServiceColor, fontSize: 12, lineHeight: "15px", fontWeight: 700 }}>{nextServiceLine ?? "Нет данных"}</p>
            <p style={{ margin: "2px 0 0", color: productSemanticColors.textSecondary, lineHeight: "13px" }}>{nextServiceHint}</p>
          </div>
          <div style={{ minWidth: 0, padding: "8px 12px 7px", borderLeft: `1px solid ${border}` }}>
            <p style={{ margin: 0, color: productSemanticColors.textMuted }}>Интервал обслуживания</p>
            <p style={{ margin: "3px 0 0", overflowWrap: "anywhere", fontSize: 12, lineHeight: "15px", fontWeight: 700 }}>{intervalLine}</p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span>Недавние события</span>
          <button type="button" onClick={onOpenAllEvents} style={sectionHeaderActionStyle}>
            Открыть журнал
          </button>
        </div>
        {events.length === 0 ? (
          <div style={{ padding: "8px 12px 7px", color: productSemanticColors.textMuted, fontSize: 11 }}>
            По этому узлу записей пока нет.
          </div>
        ) : (
          events.map((event, index) => {
            const isReplacement = event.serviceType.toLowerCase().includes("замен");
            const isOverdue = event.serviceType.toLowerCase().includes("просроч");
            const eventColor = isReplacement
              ? productSemanticColors.successStrong
              : isOverdue
              ? productSemanticColors.error
              : "#60A5FA";
            const eventBg = isReplacement
              ? productSemanticColors.successSurface
              : isOverdue
              ? productSemanticColors.errorSurface
              : productSemanticColors.indigoSoftBg;
            return (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpenEvent(event.id, event.nodeId)}
              title="Открыть событие в журнале"
              style={{
                display: "flex",
                width: "100%",
                appearance: "none",
                minWidth: 0,
                alignItems: "center",
                gap: 10,
                padding: "7px 12px 6px",
                border: 0,
                borderTop: index > 0 ? `1px solid ${border}` : undefined,
                backgroundColor: "transparent",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ width: 24, height: 24, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: eventBg, color: eventColor }}>
                {isReplacement ? (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" fill="currentColor" />
                    <path d="M5.2 8.2 7 10l3.8-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
                    <path d="M12.7 2.4 10 5.1l1.9 1.9 2.7-2.7a3 3 0 0 1-3.9 3.9L5.2 13.7a1.5 1.5 0 0 1-2.1-2.1l5.5-5.5a3 3 0 0 1 4.1-3.7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, lineHeight: "14px", fontWeight: 700 }}>{event.serviceType}</p>
                <p style={{ margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: productSemanticColors.textSecondary, fontSize: 11, lineHeight: "13px" }}>
                  {[
                    `Пробег: ${event.odometer} км`,
                    formatIsoCalendarDateRu(event.eventDate),
                    event.costAmount != null
                      ? `${formatExpenseAmountRu(event.costAmount)} ${event.currency ?? ""}`.trim()
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span style={{ color: productSemanticColors.textMuted, fontSize: 19, lineHeight: 1 }}>›</span>
            </button>
          );
          })
        )}
      </section>

      {showSubtreeCompositionSection ? (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span>Что входит в узел</span>
            {subtreeCompositionItems.length > subtreeCompositionPreviewLimit ? (
              <button
                type="button"
                onClick={() => setIsSubtreeCompositionExpanded((v) => !v)}
                style={sectionHeaderActionStyle}
              >
                {isSubtreeCompositionExpanded
                  ? "Свернуть"
                  : `Развернуть (${subtreeCompositionItems.length})`}
              </button>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              minWidth: 0,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "9px 12px 8px",
            }}
          >
            {subtreeCompositionItems.length > 0 ? (
              <p
                style={{
                  minWidth: 0,
                  flex: "1 1 auto",
                  margin: 0,
                  color: productSemanticColors.textSecondary,
                  fontSize: 11,
                  lineHeight: "16px",
                  overflowWrap: "anywhere",
                }}
              >
                {visibleSubtreeCompositionItems.map((item, index) => (
                  <Fragment key={item.id}>
                    {index > 0 ? (
                      <span
                        aria-hidden
                        style={{
                          color: productSemanticColors.textMuted,
                          fontWeight: 600,
                          userSelect: "none",
                        }}
                      >
                        {" "}
                        ·{" "}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelectCompositionNode(item.id)}
                      title={`Перейти к «${item.name}» в дереве`}
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        textAlign: "left",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                        textUnderlineOffset: 2,
                        fontWeight: item.depthFromSelected === 1 ? 700 : 500,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.name}
                    </button>
                  </Fragment>
                ))}
              </p>
            ) : (
              <p
                style={{
                  minWidth: 0,
                  margin: 0,
                  color: productSemanticColors.textSecondary,
                  fontSize: 11,
                  lineHeight: "16px",
                }}
              >
                У этого узла нет дочерних элементов.
              </p>
            )}
            <svg
              width="82"
              height="52"
              viewBox="0 0 108 68"
              fill="none"
              style={{ flexShrink: 0, color: productSemanticColors.textSecondary }}
            >
              <path
                d="M12 42 27 12l52 16 17 16-11 15-52-12-21-5Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M30 17 42 44M68 27 58 51M82 34l-9 20"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle cx="84" cy="40" r="5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </div>
        </section>
      ) : null}

      {isLeafNode ? (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span>Совместимые детали</span>
            <button
              type="button"
              onClick={canPickParts ? onPickParts : undefined}
              disabled={!canPickParts}
              style={{
                ...sectionHeaderActionStyle,
                cursor: canPickParts ? "pointer" : "not-allowed",
                opacity: canPickParts ? 1 : 0.45,
              }}
            >
              Подобрать детали
            </button>
          </div>
          <div style={{ padding: "8px 12px 7px" }}>
            {compatiblePartError ? (
              <p style={{ margin: 0, color: productSemanticColors.error, fontSize: 12, lineHeight: "16px" }}>
                {compatiblePartError}
              </p>
            ) : isCompatiblePartLoading ? (
              <p style={{ margin: 0, color: productSemanticColors.textSecondary, fontSize: 12, lineHeight: "16px" }}>
                Загрузка рекомендаций...
              </p>
            ) : visibleRecommendations.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {visibleRecommendations.map((rec) => {
                  const warning = getPartRecommendationWarningLabel(rec);
                  const priceLabel =
                    rec.priceAmount != null
                      ? `${formatExpenseAmountRu(rec.priceAmount)} ${rec.currency?.trim() || ""}`.trim()
                      : null;
                  return (
                    <div
                      key={rec.skuId}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenCompatiblePart(rec)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenCompatiblePart(rec);
                        }
                      }}
                      title={`Открыть карточку добавления ${rec.brandName} ${rec.canonicalName}`}
                      style={{
                        display: "flex",
                        width: "100%",
                        minWidth: 0,
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        borderTop: rec === visibleRecommendations[0] ? undefined : `1px solid ${border}`,
                        backgroundColor: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        padding: rec === visibleRecommendations[0] ? 0 : "8px 0 0",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700 }}>{rec.brandName} {rec.canonicalName}</p>
                        <p style={{ margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: productSemanticColors.textSecondary, fontSize: 11 }}>
                          {[
                            rec.partNumbers[0] ?? rec.partType,
                            rec.recommendationLabel,
                            priceLabel ? `Цена: ${priceLabel}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {warning ? (
                          <p style={{ margin: "3px 0 0", color: statusSemanticTokens.SOON.foreground, fontSize: 10, lineHeight: "13px" }}>
                            {warning}
                          </p>
                        ) : null}
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isAddingCompatiblePart) {
                            onAddCompatiblePart(rec);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isAddingCompatiblePart) {
                              onAddCompatiblePart(rec);
                            }
                          }
                        }}
                        aria-disabled={isAddingCompatiblePart}
                        style={{ flex: "0 0 auto", border: `1px solid ${productSemanticColors.borderStrong}`, borderRadius: 999, backgroundColor: productSemanticColors.cardMuted, color: productSemanticColors.textPrimary, padding: "7px 10px", fontSize: 11, lineHeight: "13px", fontWeight: 700, whiteSpace: "nowrap", cursor: isAddingCompatiblePart ? "not-allowed" : "pointer", opacity: isAddingCompatiblePart ? 0.6 : 1 }}
                      >
                        {isAddingCompatiblePart ? "Добавляем..." : "В корзину"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, color: productSemanticColors.textSecondary, fontSize: 12 }}>Для этого узла пока нет рекомендаций из каталога.</p>
            )}
          </div>
        </section>
      ) : null}

      {isLeafNode ? (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span>Комплекты обслуживания</span>
            <button
              type="button"
              onClick={() => {
                const firstKit = serviceKits[0];
                if (firstKit) {
                  onAddServiceKit(firstKit);
                }
              }}
              disabled={!availableActionKeys.has("add_kit") || serviceKits.length === 0 || Boolean(addingServiceKitCode)}
              style={{
                ...sectionHeaderActionStyle,
                cursor:
                  availableActionKeys.has("add_kit") && serviceKits.length > 0 && !addingServiceKitCode
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  availableActionKeys.has("add_kit") && serviceKits.length > 0 && !addingServiceKitCode
                    ? 1
                    : 0.45,
              }}
            >
              {addingServiceKitCode ? "Добавляем..." : "Добавить комплект"}
            </button>
          </div>
          <div style={{ padding: "8px 12px 7px" }}>
            {serviceKitsError ? (
              <p style={{ margin: 0, color: productSemanticColors.error, fontSize: 12, lineHeight: "16px" }}>{serviceKitsError}</p>
            ) : isServiceKitsLoading ? (
              <p style={{ margin: 0, color: productSemanticColors.textSecondary, fontSize: 12, lineHeight: "16px" }}>Загрузка комплектов...</p>
            ) : visibleServiceKits.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {visibleServiceKits.map((kit) => {
                  const isAddingThisKit = addingServiceKitCode === kit.code;
                  const canAddThisKit = availableActionKeys.has("add_kit") && !addingServiceKitCode;
                  return (
                  <div
                    key={kit.code}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenServiceKit(kit)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenServiceKit(kit);
                      }
                    }}
                    title={`Открыть подбор комплекта «${kit.title}»`}
                    style={{
                      display: "flex",
                      width: "100%",
                      minWidth: 0,
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderTop: kit === visibleServiceKits[0] ? undefined : `1px solid ${border}`,
                      backgroundColor: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      padding: kit === visibleServiceKits[0] ? 0 : "8px 0 0",
                      textAlign: "left",
                    }}
                  >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700 }}>{kit.title}</p>
                        <p style={{ margin: "3px 0 0", overflowWrap: "anywhere", color: productSemanticColors.textSecondary, fontSize: 11, lineHeight: "14px" }}>
                          {kit.items.length} поз. · {kit.description}
                        </p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (canAddThisKit) {
                            onAddServiceKit(kit);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            if (canAddThisKit) {
                              onAddServiceKit(kit);
                            }
                          }
                        }}
                        aria-disabled={!canAddThisKit}
                        style={{ flex: "0 0 auto", border: `1px solid ${productSemanticColors.borderStrong}`, borderRadius: 999, backgroundColor: productSemanticColors.cardMuted, color: productSemanticColors.textPrimary, cursor: canAddThisKit ? "pointer" : "not-allowed", opacity: canAddThisKit || isAddingThisKit ? 1 : 0.6, padding: "7px 10px", fontSize: 11, lineHeight: "13px", fontWeight: 700 }}
                      >
                        {isAddingThisKit ? "Добавляем..." : "В корзину"}
                      </span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, color: productSemanticColors.textSecondary, fontSize: 12 }}>Для этого узла пока нет готовых комплектов.</p>
            )}
          </div>
        </section>
      ) : null}

      {isLeafNode ? (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span>Неустановленные запчасти</span>
            <button type="button" onClick={onOpenAllUninstalledParts} style={sectionHeaderActionStyle}>
              {totalUninstalledParts > visibleUninstalledParts.length
                ? `Смотреть все (${totalUninstalledParts})`
                : "Открыть корзину"}
            </button>
          </div>
          <div style={{ padding: "8px 12px 7px" }}>
            {visibleUninstalledParts.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {visibleUninstalledParts.map((item) => {
                  const isUpdating = updatingWishlistItemId === item.id;
                  const nextStatus =
                    item.status === "NEEDED"
                      ? "ORDERED"
                      : item.status === "ORDERED"
                      ? "BOUGHT"
                      : "INSTALLED";
                  const nextStatusLabel =
                    item.status === "NEEDED"
                      ? "Заказать"
                      : item.status === "ORDERED"
                      ? "Куплено"
                      : "Установить";
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenWishlistPart(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenWishlistPart(item);
                        }
                      }}
                      title={`Открыть позицию «${item.title}» в корзине`}
                      style={{
                        display: "flex",
                        minWidth: 0,
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderTop: item === visibleUninstalledParts[0] ? undefined : `1px solid ${border}`,
                        cursor: "pointer",
                        paddingTop: item === visibleUninstalledParts[0] ? 0 : 8,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700 }}>{item.title}</p>
                        <p style={{ margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: productSemanticColors.textSecondary, fontSize: 11 }}>
                          {item.statusLabelRu} · Кол-во: {item.quantity}{item.costLabelRu ? ` · ${item.costLabelRu}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAdvanceWishlistPartStatus(item);
                        }}
                        disabled={isUpdating}
                        title={`Сделать статус: ${nextStatus}`}
                        style={{
                          flex: "0 0 auto",
                          border: `1px solid ${productSemanticColors.borderStrong}`,
                          borderRadius: 999,
                          backgroundColor: item.status === "BOUGHT" ? productSemanticColors.primaryAction : productSemanticColors.cardMuted,
                          color: item.status === "BOUGHT" ? productSemanticColors.onPrimaryAction : productSemanticColors.textPrimary,
                          cursor: isUpdating ? "not-allowed" : "pointer",
                          opacity: isUpdating ? 0.6 : 1,
                          padding: "7px 10px",
                          fontSize: 11,
                          lineHeight: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isUpdating ? "Обновляем..." : nextStatusLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, color: productSemanticColors.textSecondary, fontSize: 12 }}>
                Для этого узла нет позиций со статусом «Нужно», «Заказано» или «Куплено».
              </p>
            )}
          </div>
        </section>
      ) : null}

      {canSnooze ? (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>Напоминание</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 12px 7px" }}>
            {snoozeLabel ? (
              <p style={{ flexBasis: "100%", margin: 0, color: productSemanticColors.textSecondary, fontSize: 11 }}>
                Сейчас: {snoozeLabel}
              </p>
            ) : null}
            <button type="button" onClick={onSnooze7Days} style={{ border: `1px solid ${productSemanticColors.borderStrong}`, borderRadius: 999, backgroundColor: productSemanticColors.cardMuted, color: productSemanticColors.textPrimary, padding: "7px 10px", fontSize: 11, fontWeight: 700 }}>
              Отложить 7 дней
            </button>
            <button type="button" onClick={onSnooze30Days} style={{ border: `1px solid ${productSemanticColors.borderStrong}`, borderRadius: 999, backgroundColor: productSemanticColors.cardMuted, color: productSemanticColors.textPrimary, padding: "7px 10px", fontSize: 11, fontWeight: 700 }}>
              Отложить 30 дней
            </button>
            {snoozeLabel ? (
              <button type="button" onClick={onClearSnooze} style={{ border: `1px solid ${productSemanticColors.borderStrong}`, borderRadius: 999, backgroundColor: productSemanticColors.cardMuted, color: productSemanticColors.textPrimary, padding: "7px 10px", fontSize: 11, fontWeight: 700 }}>
                Снять
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

const SIDEBAR_COLLAPSED_KEY = "vehicle.detail.sidebar.collapsed";

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
  pageView?: "dashboard" | "nodeTree" | "partsSelection";
};

type OverlayReturnTarget =
  | { type: "nodeContext"; nodeId: string };

type ServiceLogActionNotice = {
  tone: "success" | "error";
  title: string;
  details?: string;
};

type NodeContextExpenseSummary = {
  year: number;
  totalsLabel: string;
  expenseCount: number;
  hasExpenses: boolean;
};

type PartsStatusFilter = PartWishlistItemStatus | "ALL";

const NODE_STATUS_FILTER_OPTIONS: NodeStatus[] = [
  "OVERDUE",
  "SOON",
  "RECENTLY_REPLACED",
  "OK",
];
const PARTS_SELECTION_INITIAL_VISIBLE_COUNT = 4;

type NodeStatusFilter = NodeStatus | "ALL";

function buildNodeSnoozeStorageKey(vehicleId: string, nodeId: string): string {
  return `mototwin.nodeSnooze.${vehicleId}.${nodeId}`;
}

function buildNodeTreeReturnStateStorageKey(vehicleId: string): string {
  return `mototwin.nodeTree.returnState.${vehicleId}`;
}

function isNodeStatusFilter(value: unknown): value is NodeStatusFilter {
  return value === "ALL" || NODE_STATUS_FILTER_OPTIONS.includes(value as NodeStatus);
}

function findNodeViewModelPathById(
  nodes: NodeTreeItemViewModel[],
  targetNodeId: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id === targetNodeId) {
      return nextPath;
    }
    const nested = findNodeViewModelPathById(node.children, targetNodeId, nextPath);
    if (nested) {
      return nested;
    }
  }
  return null;
}

const NODE_TREE_TOP_NODES_LIMIT = 15;

/** Node ids that lie on a path from a root to at least one target (targets and all ancestors). */
function collectNodeIdsOnPathsToTargets(
  roots: NodeTreeItemViewModel[],
  targetIds: Set<string>
): Set<string> {
  const included = new Set<string>();
  const walk = (node: NodeTreeItemViewModel, ancestors: string[]) => {
    const path = [...ancestors, node.id];
    if (targetIds.has(node.id)) {
      for (const id of path) {
        included.add(id);
      }
    }
    for (const child of node.children) {
      walk(child, path);
    }
  };
  for (const root of roots) {
    walk(root, []);
  }
  return included;
}

function filterNodeTreeToNodeIdSet(
  nodes: NodeTreeItemViewModel[],
  keepIds: Set<string>
): NodeTreeItemViewModel[] {
  return nodes.flatMap((node) => {
    if (!keepIds.has(node.id)) {
      return [];
    }
    const filteredChildren = filterNodeTreeToNodeIdSet(node.children, keepIds);
    return [
      {
        ...node,
        children: filteredChildren,
        hasChildren: filteredChildren.length > 0,
      },
    ];
  });
}

function collectSingleChildExpansionChain(node: NodeTreeItemViewModel): string[] {
  const expandedIds: string[] = [];
  let current: NodeTreeItemViewModel | null = node;

  while (current && current.children.length === 1) {
    expandedIds.push(current.id);
    const onlyChild: NodeTreeItemViewModel | null = current.children[0] ?? null;
    current = onlyChild && onlyChild.children.length > 0 ? onlyChild : null;
  }

  if (expandedIds.length === 0 && node.children.length > 0) {
    expandedIds.push(node.id);
  }

  return expandedIds;
}

function filterNodeViewModelsByStatus(
  nodes: NodeTreeItemViewModel[],
  status: NodeStatus | null
): NodeTreeItemViewModel[] {
  if (!status) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const filteredChildren = filterNodeViewModelsByStatus(node.children, status);
    const matches = node.effectiveStatus === status;
    if (!matches && filteredChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: filteredChildren,
        hasChildren: filteredChildren.length > 0,
      },
    ];
  });
}

function collectExpandedNodeIdsWithStatusDescendants(
  nodes: NodeTreeItemViewModel[],
  status: NodeStatus
): Set<string> {
  const expandedIds = new Set<string>();

  const walk = (node: NodeTreeItemViewModel): boolean => {
    const hasMatchingChild = node.children.some((child) => walk(child));
    const matches = node.effectiveStatus === status;
    if (hasMatchingChild) {
      expandedIds.add(node.id);
    }
    return matches || hasMatchingChild;
  };

  nodes.forEach((node) => walk(node));
  return expandedIds;
}

function countNodeStatuses(nodes: NodeTreeItemViewModel[]): Record<NodeStatus, number> {
  const counts: Record<NodeStatus, number> = {
    OVERDUE: 0,
    SOON: 0,
    RECENTLY_REPLACED: 0,
    OK: 0,
  };

  const walk = (node: NodeTreeItemViewModel) => {
    if (node.effectiveStatus) {
      counts[node.effectiveStatus] += 1;
    }
    node.children.forEach(walk);
  };

  nodes.forEach(walk);
  return counts;
}

function flattenNodeViewModelsById(nodes: NodeTreeItemViewModel[]): Map<string, NodeTreeItemViewModel> {
  const byId = new Map<string, NodeTreeItemViewModel>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }
    byId.set(node.id, node);
    stack.push(...node.children);
  }
  return byId;
}

/** Direct and indirect descendants of `root` in depth-first pre-order (excluding `root`). */
function collectSubtreeDescendantItems(
  root: NodeTreeItemViewModel
): { id: string; name: string; depthFromSelected: number }[] {
  const out: { id: string; name: string; depthFromSelected: number }[] = [];
  const walk = (node: NodeTreeItemViewModel, depthFromSelected: number) => {
    for (const child of node.children) {
      out.push({ id: child.id, name: child.name, depthFromSelected });
      walk(child, depthFromSelected + 1);
    }
  };
  walk(root, 1);
  return out;
}

function formatCurrencyTotalsFromMap(totalsByCurrency: Map<string, number>): string {
  const rows = Array.from(totalsByCurrency.entries())
    .filter(([, amount]) => amount > 0)
    .sort(([left], [right]) => left.localeCompare(right, "en"));
  if (rows.length === 0) {
    return "0";
  }
  return rows.map(([currency, amount]) => `${formatExpenseAmountRu(amount)} ${currency}`).join(" · ");
}

function buildNodeContextExpenseSummary(
  nodeId: string,
  summaryByNodeId: Record<string, ExpenseNodeSummaryItem>,
  year: number
): NodeContextExpenseSummary {
  const summary = summaryByNodeId[nodeId];
  if (!summary) {
    return {
      year,
      totalsLabel: "0",
      expenseCount: 0,
      hasExpenses: false,
    };
  }
  const totalsByCurrency = new Map(summary.totalByCurrency.map((row) => [row.currency, row.amount]));
  return {
    year,
    totalsLabel: formatCurrencyTotalsFromMap(totalsByCurrency),
    expenseCount: summary.expenseCount,
    hasExpenses: summary.expenseCount > 0,
  };
}

function isIssueNodeStatus(status: NodeStatus | null): status is "OVERDUE" | "SOON" {
  return status === "OVERDUE" || status === "SOON";
}

function getWishlistItemIdFromInstalledPartsJson(payload: unknown): string | null {
  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as { source?: unknown; wishlistItemId?: unknown };
  if (record.source !== "wishlist" || typeof record.wishlistItemId !== "string") {
    return null;
  }
  return record.wishlistItemId.trim() || null;
}

export function VehicleDetailClient({ params, pageView = "dashboard" }: VehiclePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [isServiceEventsLoading, setIsServiceEventsLoading] = useState(false);
  const [serviceEventsError, setServiceEventsError] = useState("");
  const [dashboardExpenses, setDashboardExpenses] = useState<ExpenseItem[]>([]);
  const [isDashboardExpensesLoading, setIsDashboardExpensesLoading] = useState(false);
  const [dashboardExpensesError, setDashboardExpensesError] = useState("");
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [nodeExpenseYear, setNodeExpenseYear] = useState(() => new Date().getFullYear());
  const [nodeExpenseSummaryByNodeId, setNodeExpenseSummaryByNodeId] = useState<
    Record<string, ExpenseNodeSummaryItem>
  >({});
  const [isNodeExpenseSummaryLoading, setIsNodeExpenseSummaryLoading] = useState(false);
  const [nodeExpenseSummaryError, setNodeExpenseSummaryError] = useState("");
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isTopServiceNodesLoading, setIsTopServiceNodesLoading] = useState(false);
  const [topServiceNodesError, setTopServiceNodesError] = useState("");
  const [isFullNodeTreeOpen, setIsFullNodeTreeOpen] = useState(false);
  const [isExpenseDetailsModalOpen, setIsExpenseDetailsModalOpen] = useState(false);
  const [isAddServiceEventModalOpen, setIsAddServiceEventModalOpen] = useState(false);
  const [isCreatingServiceEvent, setIsCreatingServiceEvent] = useState(false);
  const [editingServiceEventId, setEditingServiceEventId] = useState<string | null>(null);
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [serviceLogActionNotice, setServiceLogActionNotice] =
    useState<ServiceLogActionNotice | null>(null);
  const [selectedNodePath, setSelectedNodePath] = useState<SelectedNodePath>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [nodeStatusFilter, setNodeStatusFilter] = useState<NodeStatusFilter>("ALL");
  const [nodeTreeTopOnly, setNodeTreeTopOnly] = useState(false);
  const appliedNodeTreeEntryKeyRef = useRef<string | null>(null);
  const [selectedStatusExplanationNode, setSelectedStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [isUsageProfileSectionExpanded, setIsUsageProfileSectionExpanded] = useState(true);
  const [isTechnicalSummarySectionExpanded, setIsTechnicalSummarySectionExpanded] = useState(true);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [debouncedNodeSearchQuery, setDebouncedNodeSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [statusHighlightedNodeIds, setStatusHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNodeContextId, setSelectedNodeContextId] = useState<string | null>(null);
  const overlayReturnStackRef = useRef<OverlayReturnTarget[]>([]);
  const serviceEventCommentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [nodeContextRecommendations, setNodeContextRecommendations] = useState<
    PartRecommendationViewModel[]
  >([]);
  const [nodeContextRecommendationsLoading, setNodeContextRecommendationsLoading] = useState(false);
  const [nodeContextRecommendationsError, setNodeContextRecommendationsError] = useState("");
  const [nodeContextServiceKits, setNodeContextServiceKits] = useState<ServiceKitViewModel[]>([]);
  const [nodeContextServiceKitsLoading, setNodeContextServiceKitsLoading] = useState(false);
  const [nodeContextServiceKitsError, setNodeContextServiceKitsError] = useState("");
  const [nodeContextAddingRecommendedSkuId, setNodeContextAddingRecommendedSkuId] = useState("");
  const [nodeContextAddingKitCode, setNodeContextAddingKitCode] = useState("");
  const [nodeSnoozeByNodeId, setNodeSnoozeByNodeId] = useState<Record<string, string | null>>({});
  const [hasLoadedDetailCollapsePrefs, setHasLoadedDetailCollapsePrefs] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<PartWishlistItem[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wishlistEditingId, setWishlistEditingId] = useState<string | null>(null);
  const [wishlistForm, setWishlistForm] = useState<PartWishlistFormValues>(() =>
    createInitialPartWishlistFormValues()
  );
  const [wishlistFormError, setWishlistFormError] = useState("");
  const [wishlistNotice, setWishlistNotice] = useState("");
  const [isWishlistSaving, setIsWishlistSaving] = useState(false);
  const [wishlistStatusUpdatingId, setWishlistStatusUpdatingId] = useState("");
  const [wishlistPurchaseExpenseItemId, setWishlistPurchaseExpenseItemId] = useState("");
  const [isWishlistPurchaseSaving, setIsWishlistPurchaseSaving] = useState(false);
  const [wishlistPurchaseExpenseForm, setWishlistPurchaseExpenseForm] = useState({
    amount: "",
    currency: "RUB",
    purchasedAt: "",
    vendor: "",
    comment: "",
  });
  const [wishlistPurchaseExpenseError, setWishlistPurchaseExpenseError] = useState("");
  const [wishlistDeletingId, setWishlistDeletingId] = useState("");
  const [pendingWishlistInstallItemId, setPendingWishlistInstallItemId] = useState<string | null>(
    null
  );
  const [partsStatusFilter, setPartsStatusFilter] = useState<PartsStatusFilter>("ALL");
  const [selectedPartsWishlistItemId, setSelectedPartsWishlistItemId] = useState<string | null>(null);
  const [wishlistPickerInitialTab, setWishlistPickerInitialTab] = useState<PartPickerTab>("search");
  const [wishlistModalNonce, setWishlistModalNonce] = useState(0);
  const [partsSearchQuery, setPartsSearchQuery] = useState("");
  const [collapsedPartsStatusGroups, setCollapsedPartsStatusGroups] = useState<
    Partial<Record<PartWishlistItemStatus, boolean>>
  >({ INSTALLED: true });
  const [partsVisibleCountByStatus, setPartsVisibleCountByStatus] = useState<
    Partial<Record<PartWishlistItemStatus, number>>
  >({});
  const [wishlistStatusTransitionHistoryByItemId, setWishlistStatusTransitionHistoryByItemId] = useState<
    Partial<
      Record<
        string,
        {
          changedAt: string;
          previousStatus: PartWishlistItemStatus;
          nextStatus: PartWishlistItemStatus;
        }
      >
    >
  >({});
  const [wishlistSkuQuery, setWishlistSkuQuery] = useState("");
  const [wishlistSkuDebouncedQuery, setWishlistSkuDebouncedQuery] = useState("");
  const [wishlistSkuResults, setWishlistSkuResults] = useState<PartSkuViewModel[]>([]);
  const [wishlistSkuLoading, setWishlistSkuLoading] = useState(false);
  const [wishlistSkuFetchError, setWishlistSkuFetchError] = useState("");
  const [wishlistSkuPickedPreview, setWishlistSkuPickedPreview] = useState<PartSkuViewModel | null>(
    null
  );
  const [wishlistRecommendations, setWishlistRecommendations] = useState<
    PartRecommendationViewModel[]
  >([]);
  const [wishlistRecommendationsLoading, setWishlistRecommendationsLoading] = useState(false);
  const [wishlistRecommendationsError, setWishlistRecommendationsError] = useState("");
  const [wishlistAddingRecommendedSkuId, setWishlistAddingRecommendedSkuId] = useState("");
  const [wishlistServiceKits, setWishlistServiceKits] = useState<ServiceKitViewModel[]>([]);
  const [wishlistServiceKitsLoading, setWishlistServiceKitsLoading] = useState(false);
  const [wishlistServiceKitsError, setWishlistServiceKitsError] = useState("");
  const [wishlistAddingKitCode, setWishlistAddingKitCode] = useState("");
  const [wishlistSelectedKitCode, setWishlistSelectedKitCode] = useState("");
  const wishlistSkuSearchGen = useRef(0);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileFormSuccess, setProfileFormSuccess] = useState("");
  const [isMovingToTrash, setIsMovingToTrash] = useState(false);
  const [moveToTrashError, setMoveToTrashError] = useState("");
  const [profileForm, setProfileForm] = useState<EditVehicleProfileFormValues>(() =>
    buildInitialVehicleProfileFormValues()
  );
  const [isEditingVehicleState, setIsEditingVehicleState] = useState(false);
  const [vehicleStateOdometer, setVehicleStateOdometer] = useState("");
  const [vehicleStateEngineHours, setVehicleStateEngineHours] = useState("");
  const [vehicleStateError, setVehicleStateError] = useState("");
  const [isSavingVehicleState, setIsSavingVehicleState] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [isAdvancedDetailsOpen, setIsAdvancedDetailsOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState(
    () => createInitialAddServiceEventFormValues().currency
  );
  const [comment, setComment] = useState("");
  const [partSku, setPartSku] = useState("");
  const [partName, setPartName] = useState("");
  const [installedPartsJson, setInstalledPartsJson] = useState("");
  const [serviceEventSkuLookup, setServiceEventSkuLookup] = useState("");
  const [serviceEventSkuResults, setServiceEventSkuResults] = useState<PartSkuViewModel[]>([]);
  const [serviceEventSkuLoading, setServiceEventSkuLoading] = useState(false);
  const [serviceEventSkuError, setServiceEventSkuError] = useState("");
  const serviceEventSkuSearchGen = useRef(0);
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // Ignore local storage failures.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore local storage failures.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!profileFormSuccess) {
      return;
    }
    const timer = window.setTimeout(() => setProfileFormSuccess(""), 2200);
    return () => window.clearTimeout(timer);
  }, [profileFormSuccess]);
  const todayDate = getTodayDateString();
  const nodeSelectLevels = useMemo(() => {
    return getNodeSelectLevels(nodeTree, selectedNodePath);
  }, [nodeTree, selectedNodePath]);

  const selectedFinalNode = useMemo(() => {
    return getSelectedNodeFromPath(nodeTree, selectedNodePath);
  }, [nodeTree, selectedNodePath]);

  const selectedPathChildren = useMemo(() => {
    return getAvailableChildrenForSelectedPath(nodeTree, selectedNodePath);
  }, [nodeTree, selectedNodePath]);

  const isLeafNodeSelected = Boolean(
    selectedFinalNode && selectedPathChildren.length === 0
  );


  const { roots: nodeTreeViewModel } = useMemo(
    () => buildNodeTreeSectionProps(nodeTree),
    [nodeTree]
  );
  const topLevelNodeViewModels = useMemo(
    () => getTopLevelNodeTreeItems(nodeTreeViewModel),
    [nodeTreeViewModel]
  );
  const selectedNodeStatusFilter = nodeStatusFilter === "ALL" ? null : nodeStatusFilter;
  const nodeStatusCounts = useMemo(
    () => countNodeStatuses(topLevelNodeViewModels),
    [topLevelNodeViewModels]
  );
  const topNodeStatusByCode = useMemo(() => {
    const statusByCode = new Map<string, NodeStatus | null>();
    const stack = [...nodeTree];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      statusByCode.set(current.code, current.effectiveStatus ?? null);
      if (current.children.length > 0) {
        stack.push(...current.children);
      }
    }
    return statusByCode;
  }, [nodeTree]);
  const topNodeOverviewCards = useMemo<TopNodeOverviewCard[]>(
    () => buildTopNodeOverviewCards(topServiceNodes, topNodeStatusByCode),
    [topServiceNodes, topNodeStatusByCode]
  );
  /** Same order as cards/nodes in «Состояния узлов», only ids present in the tree. */
  const overviewTopNodeIdsOrderedForTree = useMemo(() => {
    const ordered = topNodeOverviewCards.flatMap((card) => card.nodes.map((node) => node.id));
    return ordered.filter(
      (id) => findNodeViewModelPathById(topLevelNodeViewModels, id) != null
    );
  }, [topNodeOverviewCards, topLevelNodeViewModels]);
  const filteredTopLevelNodeViewModels = useMemo(() => {
    let visibleRoots = topLevelNodeViewModels;
    if (nodeTreeTopOnly) {
      const targetIds = new Set(
        overviewTopNodeIdsOrderedForTree.slice(0, NODE_TREE_TOP_NODES_LIMIT)
      );
      const keepIds = collectNodeIdsOnPathsToTargets(topLevelNodeViewModels, targetIds);
      visibleRoots = filterNodeTreeToNodeIdSet(topLevelNodeViewModels, keepIds);
    }
    return filterNodeViewModelsByStatus(visibleRoots, selectedNodeStatusFilter);
  }, [
    topLevelNodeViewModels,
    selectedNodeStatusFilter,
    nodeTreeTopOnly,
    overviewTopNodeIdsOrderedForTree,
  ]);
  const hasExpandedNodeTreeItems = useMemo(
    () => Object.values(expandedNodes).some(Boolean),
    [expandedNodes]
  );
  const selectedNodeContextNode = useMemo(
    () =>
      selectedNodeContextId
        ? getNodeSubtreeById(topLevelNodeViewModels, selectedNodeContextId)
        : null,
    [topLevelNodeViewModels, selectedNodeContextId]
  );
  const selectedNodeContextRawNode = useMemo(
    () =>
      selectedNodeContextId
        ? findNodeTreeItemById(nodeTree, selectedNodeContextId)
        : null,
    [nodeTree, selectedNodeContextId]
  );
  const selectedNodeContextViewModel = useMemo<NodeContextViewModel | null>(() => {
    if (!selectedNodeContextNode || !selectedNodeContextRawNode) {
      return null;
    }
    return buildNodeContextViewModel({
      node: selectedNodeContextNode,
      nodeTree: topLevelNodeViewModels,
      maintenancePlan: buildNodeMaintenancePlanViewModel(selectedNodeContextNode),
      recentServiceEvents: getRecentServiceEventsForNode(selectedNodeContextRawNode, serviceEvents),
      recommendations: nodeContextRecommendations,
      serviceKits: nodeContextServiceKits,
    });
  }, [
    selectedNodeContextNode,
    selectedNodeContextRawNode,
    topLevelNodeViewModels,
    serviceEvents,
    nodeContextRecommendations,
    nodeContextServiceKits,
  ]);
  const nodeSearchResults = useMemo<NodeTreeSearchResultViewModel[]>(
    () =>
      searchNodeTree(filteredTopLevelNodeViewModels, {
        query: debouncedNodeSearchQuery,
        limit: 10,
        minQueryLength: 2,
      }),
    [filteredTopLevelNodeViewModels, debouncedNodeSearchQuery]
  );
  const targetNodeIdFromSearchParams = searchParams.get("nodeId");
  const highlightIssueNodeIdsFromSearchParams = searchParams.get("highlightIssueNodeIds");
  const highlightedWishlistItemIdFromSearchParams = searchParams.get("wishlistItemId");
  const partsStatusFromSearchParams = searchParams.get("partsStatus");
  const installWishlistItemIdFromSearchParams = searchParams.get("installWishlistItemId");

  const focusNodeInTree = useCallback(
    (nodeId: string) => {
      const path = findNodeViewModelPathById(topLevelNodeViewModels, nodeId);
      if (!path || path.length === 0) {
        return;
      }
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setNodeStatusFilter("ALL");
      setHighlightedNodeId(nodeId);
      setSelectedNodeContextId(nodeId);
      setExpandedNodes((prev) => {
        const next = { ...prev };
        for (const ancestorId of path.slice(0, -1)) {
          next[ancestorId] = true;
        }
        return next;
      });
    },
    [topLevelNodeViewModels]
  );

  useEffect(() => {
    if (pageView !== "nodeTree" || !vehicleId || topLevelNodeViewModels.length === 0) {
      return;
    }

    let entryKey = targetNodeIdFromSearchParams ? `url:${targetNodeIdFromSearchParams}` : "empty";
    let restoredNodeId: string | null = targetNodeIdFromSearchParams;
    let restoredExpandedNodes: Record<string, boolean> = {};
    let restoredStatusFilter: NodeStatusFilter | null = null;
    let restoredTopOnly: boolean | null = null;
    let shouldReplaceUrl = false;

    try {
      const raw = sessionStorage.getItem(buildNodeTreeReturnStateStorageKey(vehicleId));
      if (raw) {
        sessionStorage.removeItem(buildNodeTreeReturnStateStorageKey(vehicleId));
        const parsed = JSON.parse(raw) as {
          selectedNodeId?: unknown;
          nodeStatusFilter?: unknown;
          nodeTreeTopOnly?: unknown;
          expandedNodes?: unknown;
        };
        entryKey = `return:${typeof parsed.selectedNodeId === "string" ? parsed.selectedNodeId : ""}`;
        restoredNodeId =
          typeof parsed.selectedNodeId === "string" ? parsed.selectedNodeId : targetNodeIdFromSearchParams;
        restoredExpandedNodes =
          parsed.expandedNodes &&
          typeof parsed.expandedNodes === "object" &&
          !Array.isArray(parsed.expandedNodes)
            ? Object.fromEntries(
                Object.entries(parsed.expandedNodes as Record<string, unknown>).filter(
                  ([, value]) => typeof value === "boolean"
                )
              ) as Record<string, boolean>
            : {};
        restoredStatusFilter = isNodeStatusFilter(parsed.nodeStatusFilter)
          ? parsed.nodeStatusFilter
          : null;
        restoredTopOnly = typeof parsed.nodeTreeTopOnly === "boolean" ? parsed.nodeTreeTopOnly : null;
        shouldReplaceUrl = Boolean(restoredNodeId);
      }
    } catch {
      // Ignore stale return state.
    }

    if (appliedNodeTreeEntryKeyRef.current === entryKey) {
      return;
    }
    appliedNodeTreeEntryKeyRef.current = entryKey;

    if (restoredStatusFilter) {
      setNodeStatusFilter(restoredStatusFilter);
    }
    if (restoredTopOnly !== null) {
      setNodeTreeTopOnly(restoredTopOnly);
    }

    if (!restoredNodeId) {
      return;
    }

    const path = findNodeViewModelPathById(topLevelNodeViewModels, restoredNodeId);
    if (!path || path.length === 0) {
      return;
    }

    setSelectedNodeContextId(restoredNodeId);
    setHighlightedNodeId(restoredNodeId);
    setStatusHighlightedNodeIds(new Set());
    setExpandedNodes(() => {
      const next = { ...restoredExpandedNodes };
      for (const ancestorId of path.slice(0, -1)) {
        next[ancestorId] = true;
      }
      return next;
    });

    if (shouldReplaceUrl) {
      const q = new URLSearchParams(window.location.search);
      q.set("nodeId", restoredNodeId);
      q.delete("highlightIssueNodeIds");
      const nextHref = `/vehicles/${vehicleId}/nodes?${q.toString()}`;
      if (window.location.pathname + window.location.search !== nextHref) {
        window.history.replaceState(window.history.state, "", nextHref);
      }
    }
  }, [pageView, targetNodeIdFromSearchParams, topLevelNodeViewModels, vehicleId]);

  const focusIssueNodesInTree = useCallback(
    (nodeIds: string[]) => {
      const idToNode = flattenNodeViewModelsById(topLevelNodeViewModels);
      const nextHighlightedIds = new Set<string>();
      const nextExpandedNodes: Record<string, boolean> = {};
      let focusNodeId: string | null = null;

      for (const nodeId of nodeIds) {
        const path = findNodeViewModelPathById(topLevelNodeViewModels, nodeId);
        if (!path || path.length === 0) {
          continue;
        }
        for (const ancestorId of path.slice(0, -1)) {
          nextExpandedNodes[ancestorId] = true;
        }
        for (const pathNodeId of path) {
          const pathNode = idToNode.get(pathNodeId);
          if (pathNode && isIssueNodeStatus(pathNode.effectiveStatus)) {
            nextHighlightedIds.add(pathNode.id);
            focusNodeId ??= pathNode.id;
          }
        }
      }

      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setNodeStatusFilter("ALL");
      setStatusHighlightedNodeIds(nextHighlightedIds);
      setHighlightedNodeId(focusNodeId);
      setSelectedNodeContextId(focusNodeId);
      setExpandedNodes((prev) => ({ ...prev, ...nextExpandedNodes }));
    },
    [topLevelNodeViewModels]
  );

  const expenseSummary = useMemo(
    () => buildExpenseSummaryFromServiceEvents(serviceEvents),
    [serviceEvents]
  );

  const attentionSummary = useMemo(
    () => buildAttentionSummaryFromNodeTree(nodeTree),
    [nodeTree]
  );
  useEffect(() => {
    if (!vehicleId) {
      setNodeSnoozeByNodeId({});
      return;
    }
    const candidateNodeIds = Array.from(
      new Set([
        ...attentionSummary.items.map((item) => item.nodeId),
        ...(selectedNodeContextId ? [selectedNodeContextId] : []),
      ])
    );
    if (candidateNodeIds.length === 0) {
      setNodeSnoozeByNodeId({});
      return;
    }
    const next: Record<string, string | null> = {};
    try {
      for (const nodeId of candidateNodeIds) {
        const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
        const raw = localStorage.getItem(key);
        if (isNodeSnoozed(raw)) {
          next[nodeId] = raw;
          continue;
        }
        next[nodeId] = null;
        if (raw) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore local-only storage failures.
    }
    setNodeSnoozeByNodeId(next);
  }, [vehicleId, attentionSummary.items, selectedNodeContextId]);

  const wishlistViewModels = useMemo(
    () => wishlistItems.map(buildPartWishlistItemViewModel),
    [wishlistItems]
  );
  const wishlistActiveViewModels = useMemo(
    () => filterActiveWishlistItems(wishlistViewModels),
    [wishlistViewModels]
  );
  const wishlistGroups = useMemo(
    () => groupPartWishlistItemsByStatus(wishlistActiveViewModels),
    [wishlistActiveViewModels]
  );
  const partsStatusCounts = useMemo(() => {
    const counts = new Map<PartWishlistItemStatus, number>();
    for (const status of PART_WISHLIST_STATUS_ORDER) {
      counts.set(status, 0);
    }
    for (const item of wishlistViewModels) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    return counts;
  }, [wishlistViewModels]);
  const normalizedPartsSearchQuery = partsSearchQuery.trim().toLowerCase();
  const partsNodeFilterIds = useMemo(() => {
    if (pageView !== "partsSelection" || !targetNodeIdFromSearchParams) {
      return null;
    }
    const node = findNodeTreeItemById(nodeTree, targetNodeIdFromSearchParams);
    if (!node) {
      return new Set([targetNodeIdFromSearchParams]);
    }
    return new Set(createServiceLogNodeFilter(node).nodeIds);
  }, [nodeTree, pageView, targetNodeIdFromSearchParams]);
  const filteredPartsWishlistViewModels = useMemo(() => {
    return wishlistViewModels.filter((item) => {
      if (partsNodeFilterIds && (!item.nodeId || !partsNodeFilterIds.has(item.nodeId))) {
        return false;
      }
      if (partsStatusFilter !== "ALL" && item.status !== partsStatusFilter) {
        return false;
      }
      if (!normalizedPartsSearchQuery) {
        return true;
      }
      const skuLines = item.sku ? getWishlistItemSkuDisplayLines(item.sku) : null;
      const haystack = [
        item.title,
        item.statusLabelRu,
        item.node?.name ?? "",
        item.costLabelRu ?? "",
        item.kitOriginLabelRu ?? "",
        item.commentBodyRu ?? "",
        skuLines?.primaryLine ?? "",
        skuLines?.secondaryLine ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedPartsSearchQuery);
    });
  }, [normalizedPartsSearchQuery, partsNodeFilterIds, partsStatusFilter, wishlistViewModels]);
  const filteredPartsWishlistGroups = useMemo(
    () => groupPartWishlistItemsByStatus(filteredPartsWishlistViewModels),
    [filteredPartsWishlistViewModels]
  );
  const installedWishlistServiceEventIdByItemId = useMemo(() => {
    const byWishlistItemId = new Map<string, string>();
    const newestEventsFirst = [...serviceEvents].sort((left, right) => {
      const leftTime = new Date(left.eventDate || left.createdAt).getTime();
      const rightTime = new Date(right.eventDate || right.createdAt).getTime();
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
    for (const event of newestEventsFirst) {
      if (event.eventKind === "STATE_UPDATE") {
        continue;
      }
      const wishlistItemId = getWishlistItemIdFromInstalledPartsJson(event.installedPartsJson);
      if (wishlistItemId && !byWishlistItemId.has(wishlistItemId)) {
        byWishlistItemId.set(wishlistItemId, event.id);
      }
    }
    return byWishlistItemId;
  }, [serviceEvents]);
  const serviceKitNodesByCode = useMemo(() => {
    const out = new Map<string, { id: string; name: string; hasChildren: boolean }>();
    const stack = [...nodeTree];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) {
        continue;
      }
      out.set(node.code, { id: node.id, name: node.name, hasChildren: node.children.length > 0 });
      for (const child of node.children) {
        stack.push(child);
      }
    }
    return out;
  }, [nodeTree]);
  const serviceKitPreviewByCode = useMemo(() => {
    const out = new Map<string, ServiceKitPreviewViewModel>();
    for (const kit of wishlistServiceKits) {
      out.set(
        kit.code,
        buildServiceKitPreview({
          kit,
          nodesByCode: serviceKitNodesByCode,
          activeWishlistItems: wishlistItems,
        })
      );
    }
    return out;
  }, [serviceKitNodesByCode, wishlistItems, wishlistServiceKits]);
  const visibleWishlistServiceKits = useMemo(() => {
    if (!wishlistSelectedKitCode) {
      return wishlistServiceKits;
    }
    return [...wishlistServiceKits].sort((a, b) => {
      if (a.code === wishlistSelectedKitCode) {
        return -1;
      }
      if (b.code === wishlistSelectedKitCode) {
        return 1;
      }
      return 0;
    });
  }, [wishlistSelectedKitCode, wishlistServiceKits]);
  const wishlistNodeOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree),
    [nodeTree]
  );

  const wishlistEditingSourceItem = useMemo(
    () => (wishlistEditingId ? wishlistItems.find((w) => w.id === wishlistEditingId) : undefined),
    [wishlistEditingId, wishlistItems]
  );

  const wishlistRecommendationGroups = useMemo(
    (): PartRecommendationGroup[] =>
      buildPartRecommendationGroupsForDisplay(wishlistRecommendations),
    [wishlistRecommendations]
  );
  const wishlistNodeRequiredError = wishlistFormError.includes("Выберите узел мотоцикла");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedNodeSearchQuery(nodeSearchQuery);
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [nodeSearchQuery]);

  useEffect(() => {
    if (!selectedNodeStatusFilter) {
      return;
    }
    const expandedIds = collectExpandedNodeIdsWithStatusDescendants(
      topLevelNodeViewModels,
      selectedNodeStatusFilter
    );
    setExpandedNodes((prev) => {
      const next = { ...prev };
      expandedIds.forEach((nodeId) => {
        next[nodeId] = true;
      });
      return next;
    });
  }, [topLevelNodeViewModels, selectedNodeStatusFilter]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeContextId) {
      setNodeContextRecommendations([]);
      setNodeContextRecommendationsError("");
      setNodeContextRecommendationsLoading(false);
      return;
    }
    setNodeContextRecommendationsLoading(true);
    setNodeContextRecommendationsError("");
    void vehicleDetailApi
      .getRecommendedSkusForNode(vehicleId, selectedNodeContextId)
      .then((res) => {
        setNodeContextRecommendations(res.recommendations ?? []);
      })
      .catch(() => {
        setNodeContextRecommendations([]);
        setNodeContextRecommendationsError("Не удалось загрузить рекомендации по узлу.");
      })
      .finally(() => {
        setNodeContextRecommendationsLoading(false);
      });
  }, [vehicleId, selectedNodeContextId]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeContextId) {
      setNodeContextServiceKits([]);
      setNodeContextServiceKitsError("");
      setNodeContextServiceKitsLoading(false);
      return;
    }
    setNodeContextServiceKitsLoading(true);
    setNodeContextServiceKitsError("");
    void vehicleDetailApi
      .getServiceKits({
        vehicleId,
        nodeId: selectedNodeContextId,
      })
      .then((res) => {
        setNodeContextServiceKits(res.kits ?? []);
      })
      .catch(() => {
        setNodeContextServiceKits([]);
        setNodeContextServiceKitsError("Не удалось загрузить комплекты обслуживания.");
      })
      .finally(() => {
        setNodeContextServiceKitsLoading(false);
      });
  }, [vehicleId, selectedNodeContextId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    try {
      const usageRaw = localStorage.getItem(`vehicleDetail.${vehicleId}.usageProfile.expanded`);
      const techRaw = localStorage.getItem(`vehicleDetail.${vehicleId}.technicalSummary.expanded`);
      if (usageRaw === "true" || usageRaw === "false") {
        setIsUsageProfileSectionExpanded(usageRaw === "true");
      } else {
        setIsUsageProfileSectionExpanded(true);
      }
      if (techRaw === "true" || techRaw === "false") {
        setIsTechnicalSummarySectionExpanded(techRaw === "true");
      } else {
        setIsTechnicalSummarySectionExpanded(true);
      }
    } catch {
      setIsUsageProfileSectionExpanded(true);
      setIsTechnicalSummarySectionExpanded(true);
    } finally {
      setHasLoadedDetailCollapsePrefs(true);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedDetailCollapsePrefs) {
      return;
    }
    try {
      localStorage.setItem(
        `vehicleDetail.${vehicleId}.usageProfile.expanded`,
        String(isUsageProfileSectionExpanded)
      );
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [vehicleId, hasLoadedDetailCollapsePrefs, isUsageProfileSectionExpanded]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedDetailCollapsePrefs) {
      return;
    }
    try {
      localStorage.setItem(
        `vehicleDetail.${vehicleId}.technicalSummary.expanded`,
        String(isTechnicalSummarySectionExpanded)
      );
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [vehicleId, hasLoadedDetailCollapsePrefs, isTechnicalSummarySectionExpanded]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setWishlistSkuDebouncedQuery(wishlistSkuQuery.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [wishlistSkuQuery]);

  useEffect(() => {
    if (!isWishlistModalOpen) {
      return;
    }
    const q = wishlistSkuDebouncedQuery;
    const nodeFilter = wishlistForm.nodeId.trim();
    const canFetch = q.length >= 2 || (q.length === 0 && nodeFilter.length > 0);
    if (!canFetch) {
      setWishlistSkuResults([]);
      setWishlistSkuFetchError("");
      setWishlistSkuLoading(false);
      return;
    }
    const gen = wishlistSkuSearchGen.current + 1;
    wishlistSkuSearchGen.current = gen;
    setWishlistSkuLoading(true);
    setWishlistSkuFetchError("");
    void vehicleDetailApi
      .getPartSkus({
        search: q.length >= 2 ? q : undefined,
        nodeId: nodeFilter || undefined,
      })
      .then((res) => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuResults(res.skus ?? []);
      })
      .catch(() => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuResults([]);
        setWishlistSkuFetchError("Не удалось выполнить поиск в каталоге.");
      })
      .finally(() => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuLoading(false);
      });
  }, [isWishlistModalOpen, wishlistSkuDebouncedQuery, wishlistForm.nodeId]);

  useEffect(() => {
    if (!isWishlistModalOpen || !vehicleId) {
      return;
    }
    const nodeId = wishlistForm.nodeId.trim();
    if (!nodeId) {
      setWishlistRecommendations([]);
      setWishlistRecommendationsError("");
      setWishlistRecommendationsLoading(false);
      return;
    }
    setWishlistRecommendationsLoading(true);
    setWishlistRecommendationsError("");
    void vehicleDetailApi
      .getRecommendedSkusForNode(vehicleId, nodeId)
      .then((res) => {
        setWishlistRecommendations(res.recommendations ?? []);
      })
      .catch(() => {
        setWishlistRecommendations([]);
        setWishlistRecommendationsError("Не удалось загрузить рекомендации по узлу.");
      })
      .finally(() => {
        setWishlistRecommendationsLoading(false);
      });
  }, [isWishlistModalOpen, vehicleId, wishlistForm.nodeId]);

  useEffect(() => {
    if (!isWishlistModalOpen || !vehicleId) {
      return;
    }
    const nodeId = wishlistForm.nodeId.trim();
    if (!nodeId) {
      setWishlistServiceKits([]);
      setWishlistServiceKitsError("");
      setWishlistServiceKitsLoading(false);
      return;
    }
    setWishlistServiceKitsLoading(true);
    setWishlistServiceKitsError("");
    void vehicleDetailApi
      .getServiceKits({ nodeId, vehicleId })
      .then((res) => {
        const nextKits = res.kits ?? [];
        setWishlistServiceKits((currentKits) => {
          if (!wishlistSelectedKitCode) {
            return nextKits;
          }
          const selectedKit = currentKits.find((kit) => kit.code === wishlistSelectedKitCode);
          if (selectedKit && !nextKits.some((kit) => kit.code === wishlistSelectedKitCode)) {
            return [selectedKit, ...nextKits];
          }
          return nextKits;
        });
      })
      .catch(() => {
        setWishlistServiceKits((currentKits) => (wishlistSelectedKitCode ? currentKits : []));
        setWishlistServiceKitsError("Не удалось загрузить комплекты обслуживания.");
      })
      .finally(() => {
        setWishlistServiceKitsLoading(false);
      });
  }, [isWishlistModalOpen, vehicleId, wishlistForm.nodeId, wishlistSelectedKitCode]);


  useEffect(() => {
    if (!serviceLogActionNotice) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setServiceLogActionNotice(null);
    }, 4500);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [serviceLogActionNotice]);

  const openServiceLogModalFull = () => {
    router.push(`/vehicles/${vehicleId}/service-log`);
  };

  const persistNodeTreeReturnState = (selectedNodeId: string) => {
    if (pageView !== "nodeTree" || !vehicleId) {
      return;
    }
    try {
      sessionStorage.setItem(
        buildNodeTreeReturnStateStorageKey(vehicleId),
        JSON.stringify({
          selectedNodeId,
          nodeStatusFilter,
          nodeTreeTopOnly,
          expandedNodes,
        })
      );
    } catch {
      // Ignore sessionStorage failures; the browser back stack still works.
    }
  };

  const openServiceLogFilteredByNode = (
    node: NodeTreeItemViewModel,
    serviceEventId?: string,
    returnNodeId = node.id
  ) => {
    const raw = findNodeTreeItemById(nodeTree, node.id);
    if (!raw) {
      return;
    }
    persistNodeTreeReturnState(returnNodeId);
    const filter = createServiceLogNodeFilter(raw);
    const q = new URLSearchParams();
    q.set("nodeIds", filter.nodeIds.join(","));
    q.set("nodeLabel", filter.displayLabel);
    q.set("returnNodeId", returnNodeId);
    if (serviceEventId) {
      q.set("serviceEventId", serviceEventId);
    }
    router.push(`/vehicles/${vehicleId}/service-log?${q.toString()}`);
  };

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const resolvedParams = await params;
        setVehicleId(resolvedParams.id);
        setIsLoading(true);
        setError("");

        const data = await vehicleDetailApi.getVehicleDetail(resolvedParams.id);
        const raw = data.vehicle as unknown as VehicleDetailApiRecord | null;
        setVehicle(raw ? vehicleDetailFromApiRecord(raw) : null);
      } catch (requestError) {
        console.error(requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Произошла ошибка при загрузке мотоцикла."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [params]);

  useEffect(() => {
    const shouldOpen = searchParams.get("openServiceEventModal");
    if (shouldOpen !== "1") {
      return;
    }
    const editServiceEventId = searchParams.get("editServiceEventId");
    if (editServiceEventId) {
      const serviceEvent = serviceEvents.find((candidate) => candidate.id === editServiceEventId);
      if (!serviceEvent || serviceEvent.eventKind === "STATE_UPDATE") {
        return;
      }
      const nodePath = findNodePathById(nodeTree, serviceEvent.nodeId);
      if (!nodePath) {
        setServiceEventFormError("Не удалось определить путь узла.");
        return;
      }
      setServiceEventFormError("");
      setEditingServiceEventId(serviceEvent.id);
      setPendingWishlistInstallItemId(null);
      applyAddServiceEventFormValues(createInitialEditServiceEventValues(serviceEvent));
      setSelectedNodePath(nodePath);
      setIsAddServiceEventModalOpen(true);
      return;
    }
    setEditingServiceEventId(null);
    setPendingWishlistInstallItemId(null);
    setSelectedNodePath([]);
    const empty = createInitialAddServiceEventFormValues();
    empty.currency = readDefaultCurrencySetting();
    applyAddServiceEventFormValues(empty);
    setServiceEventFormError("");
    setIsAddServiceEventModalOpen(true);
  }, [searchParams, serviceEvents, nodeTree]);

  useEffect(() => {
    if (
      pageView !== "nodeTree" ||
      !highlightIssueNodeIdsFromSearchParams ||
      topLevelNodeViewModels.length === 0
    ) {
      return;
    }
    const nodeIds = highlightIssueNodeIdsFromSearchParams
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    focusIssueNodesInTree(nodeIds);
  }, [
    focusIssueNodesInTree,
    highlightIssueNodeIdsFromSearchParams,
    pageView,
    topLevelNodeViewModels.length,
  ]);

  useEffect(() => {
    if (pageView !== "partsSelection") {
      return;
    }
    if (
      partsStatusFromSearchParams === "NEEDED" ||
      partsStatusFromSearchParams === "ORDERED" ||
      partsStatusFromSearchParams === "BOUGHT" ||
      partsStatusFromSearchParams === "INSTALLED"
    ) {
      setPartsStatusFilter(partsStatusFromSearchParams);
      setCollapsedPartsStatusGroups((prev) => ({
        ...prev,
        [partsStatusFromSearchParams]: false,
      }));
    }
  }, [pageView, partsStatusFromSearchParams]);

  useEffect(() => {
    if (pageView !== "partsSelection") {
      return;
    }
    setSelectedPartsWishlistItemId(highlightedWishlistItemIdFromSearchParams);
  }, [highlightedWishlistItemIdFromSearchParams, pageView]);

  useEffect(() => {
    if (pageView !== "partsSelection" || !highlightedWishlistItemIdFromSearchParams) {
      return;
    }
    const highlightedItem = wishlistViewModels.find(
      (item) => item.id === highlightedWishlistItemIdFromSearchParams
    );
    if (highlightedItem) {
      setPartsStatusFilter(highlightedItem.status);
      setPartsSearchQuery("");
      setCollapsedPartsStatusGroups((prev) => ({ ...prev, [highlightedItem.status]: false }));
      const itemsInStatus = wishlistViewModels.filter((item) => item.status === highlightedItem.status);
      const highlightedIndex = itemsInStatus.findIndex((item) => item.id === highlightedItem.id);
      if (highlightedIndex >= 0) {
        setPartsVisibleCountByStatus((prev) => ({
          ...prev,
          [highlightedItem.status]: Math.max(
            prev[highlightedItem.status] ?? PARTS_SELECTION_INITIAL_VISIBLE_COUNT,
            highlightedIndex + 1
          ),
        }));
      }
    }
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-wishlist-item-id="${CSS.escape(highlightedWishlistItemIdFromSearchParams)}"]`
      );
      target?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlightedWishlistItemIdFromSearchParams, pageView, wishlistViewModels]);

  useEffect(() => {
    if (pageView !== "partsSelection" || !installWishlistItemIdFromSearchParams) {
      return;
    }
    const item = wishlistItems.find((candidate) => candidate.id === installWishlistItemIdFromSearchParams);
    if (!item || item.status !== "BOUGHT") {
      return;
    }
    const didOpenServiceEventModal = openAddServiceEventPrefilledFromWishlist(item, {
      pendingInstall: true,
    });
    if (didOpenServiceEventModal) {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("installWishlistItemId");
      router.replace(`/vehicles/${vehicleId}/parts${q.toString() ? `?${q.toString()}` : ""}`, { scroll: false });
    }
    // `openAddServiceEventPrefilledFromWishlist` is declared later in this component and
    // reads the latest loaded vehicle/node state when the deep link is handled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    installWishlistItemIdFromSearchParams,
    pageView,
    router,
    searchParams,
    vehicleId,
    wishlistItems,
  ]);

  useEffect(() => {
    if (!isAddServiceEventModalOpen || !serviceEventCommentTextareaRef.current) {
      return;
    }
    const textarea = serviceEventCommentTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 64)}px`;
  }, [comment, isAddServiceEventModalOpen]);

  useEffect(() => {
    if (!isAddServiceEventModalOpen) {
      setServiceEventSkuLookup("");
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setServiceEventSkuLookup(partSku.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isAddServiceEventModalOpen, partSku]);

  useEffect(() => {
    if (!isAddServiceEventModalOpen) {
      return;
    }
    const query = serviceEventSkuLookup;
    if (query.length < 2) {
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const gen = serviceEventSkuSearchGen.current + 1;
    serviceEventSkuSearchGen.current = gen;
    setServiceEventSkuLoading(true);
    setServiceEventSkuError("");
    void vehicleDetailApi
      .getPartSkus({
        search: query,
        nodeId: selectedFinalNode?.id || undefined,
      })
      .then((res) => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        const list = res.skus ?? [];
        const normalizedQuery = normalizePartNumberForLookup(query);
        const exact = list.find((sku) =>
          sku.partNumbers.some(
            (partNumber) =>
              normalizePartNumberForLookup(partNumber.number) === normalizedQuery
          )
        );
        const ordered = exact
          ? [exact, ...list.filter((candidate) => candidate.id !== exact.id)]
          : list;
        setServiceEventSkuResults(ordered.slice(0, 6));
      })
      .catch(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuResults([]);
        setServiceEventSkuError("Не удалось выполнить поиск в каталоге.");
      })
      .finally(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuLoading(false);
      });
  }, [isAddServiceEventModalOpen, selectedFinalNode?.id, serviceEventSkuLookup]);

  const loadServiceEvents = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsServiceEventsLoading(true);
      setServiceEventsError("");
      const data = await vehicleDetailApi.getServiceEvents(vehicleId);
      setServiceEvents(data.serviceEvents ?? []);
    } catch (serviceError) {
      console.error(serviceError);
      setServiceEventsError(
        serviceError instanceof Error
          ? serviceError.message
          : "Произошла ошибка при загрузке журнала."
      );
    } finally {
      setIsServiceEventsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    void loadServiceEvents();
  }, [vehicleId, loadServiceEvents]);

  const loadDashboardExpenses = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsDashboardExpensesLoading(true);
      setDashboardExpensesError("");
      const data = await vehicleDetailApi.getExpenses({
        vehicleId,
        year: new Date().getFullYear(),
      });
      setDashboardExpenses(data.expenses ?? []);
    } catch (expenseLoadError) {
      console.error(expenseLoadError);
      setDashboardExpensesError(
        expenseLoadError instanceof Error
          ? expenseLoadError.message
          : "Произошла ошибка при загрузке расходов."
      );
    } finally {
      setIsDashboardExpensesLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    void loadDashboardExpenses();
  }, [vehicleId, loadDashboardExpenses]);

  const loadNodeTree = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsNodeTreeLoading(true);
      setNodeTreeError("");
      const data = await vehicleDetailApi.getNodeTree(vehicleId);
      setNodeTree(data.nodeTree ?? []);
    } catch (nodeTreeLoadError) {
      console.error(nodeTreeLoadError);
      setNodeTreeError(
        nodeTreeLoadError instanceof Error
          ? nodeTreeLoadError.message
          : "Произошла ошибка при загрузке дерева узлов."
      );
    } finally {
      setIsNodeTreeLoading(false);
    }
  }, [vehicleId]);

  const loadNodeExpenseSummary = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsNodeExpenseSummaryLoading(true);
      setNodeExpenseSummaryError("");
      const data = await vehicleDetailApi.getExpenseNodeSummary({
        vehicleId,
        year: nodeExpenseYear,
      });
      setNodeExpenseSummaryByNodeId(
        Object.fromEntries((data.nodes ?? []).map((summary) => [summary.nodeId, summary]))
      );
    } catch (summaryLoadError) {
      console.error(summaryLoadError);
      setNodeExpenseSummaryByNodeId({});
      setNodeExpenseSummaryError(
        summaryLoadError instanceof Error
          ? summaryLoadError.message
          : "Не удалось загрузить расходы по узлам."
      );
    } finally {
      setIsNodeExpenseSummaryLoading(false);
    }
  }, [nodeExpenseYear, vehicleId]);

  const loadTopServiceNodes = useCallback(async () => {
    try {
      setIsTopServiceNodesLoading(true);
      setTopServiceNodesError("");
      const data = await vehicleDetailApi.getTopServiceNodes();
      setTopServiceNodes(data.nodes ?? []);
    } catch (topNodesLoadError) {
      console.error(topNodesLoadError);
      setTopServiceNodesError(
        topNodesLoadError instanceof Error
          ? topNodesLoadError.message
          : "Не удалось загрузить основные узлы."
      );
      setTopServiceNodes([]);
    } finally {
      setIsTopServiceNodesLoading(false);
    }
  }, []);

  const loadWishlist = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsWishlistLoading(true);
      setWishlistError("");
      const data = await vehicleDetailApi.getVehicleWishlist(vehicleId);
      setWishlistItems(data.items ?? []);
    } catch (e) {
      console.error(e);
      setWishlistError(
        e instanceof Error ? e.message : "Не удалось загрузить список покупок."
      );
    } finally {
      setIsWishlistLoading(false);
    }
  }, [vehicleId]);

  const toggleNodeExpansion = (node: NodeTreeItemViewModel) => {
    const chainIds = collectSingleChildExpansionChain(node);
    setExpandedNodes((prev) => {
      const shouldExpand = !prev[node.id];
      const next = { ...prev };
      for (const id of chainIds) {
        next[id] = shouldExpand;
      }
      return next;
    });
  };

  const applyAddServiceEventFormValues = (values: AddServiceEventFormValues) => {
    setServiceType(values.serviceType);
    setEventDate(values.eventDate);
    setOdometer(values.odometer);
    setEngineHours(values.engineHours);
    setCostAmount(values.costAmount);
    setCurrency(values.currency);
    setComment(values.comment);
    setPartSku(values.partSku);
    setPartName(values.partName);
    setInstalledPartsJson(values.installedPartsJson);
  };

  const readDefaultCurrencySetting = () => {
    try {
      const raw = localStorage.getItem(USER_LOCAL_SETTINGS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_USER_LOCAL_SETTINGS.defaultCurrency;
      }
      const settings = normalizeUserLocalSettings(JSON.parse(raw));
      return getDefaultCurrencyFromSettings(settings);
    } catch {
      return DEFAULT_USER_LOCAL_SETTINGS.defaultCurrency;
    }
  };
  const navigateBackWithFallback = (fallbackHref: string) => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const clearPartsNodeUrlFilter = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("nodeId");
    const qs = q.toString();
    router.replace(`/vehicles/${vehicleId}/parts${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams, vehicleId]);

  const openAddServiceEventFromLeafNode = (leafNodeId: string) => {
    if (!vehicle) {
      setServiceEventFormError("Не удалось загрузить данные мотоцикла.");
      return;
    }
    const nodePath = findNodePathById(nodeTree, leafNodeId);
    const leafNode = findNodeTreeItemById(nodeTree, leafNodeId);

    if (!nodePath || !leafNode) {
      setServiceEventFormError("Не удалось определить путь узла.");
      return;
    }

    const values = createInitialAddServiceEventFromNode({
      nodeId: leafNode.id,
      nodeCode: leafNode.code,
      nodeName: leafNode.name,
      vehicle: {
        odometer: vehicle.odometer,
        engineHours: vehicle.engineHours,
      },
      currentDateYmd: todayDate,
    });
    values.currency = readDefaultCurrencySetting();

    setServiceEventFormError("");
    setEditingServiceEventId(null);
    setPendingWishlistInstallItemId(null);
    applyAddServiceEventFormValues(values);
    setSelectedNodePath(nodePath);
    setIsAddServiceEventModalOpen(true);
  };

  const openAddServiceEventPrefilledFromWishlist = (
    item: PartWishlistItem,
    options: { pendingInstall?: boolean } = {}
  ) => {
    if (!vehicle) {
      setServiceEventFormError("Не удалось загрузить данные мотоцикла.");
      return false;
    }
    if (!item.nodeId) {
      return false;
    }
    const nodePath = findNodePathById(nodeTree, item.nodeId);
    if (!nodePath) {
      setServiceEventFormError("Не удалось определить путь узла для позиции списка.");
      return false;
    }
    setServiceEventFormError("");
    setEditingServiceEventId(null);
    const values = createInitialAddServiceEventFromWishlistItem(
      item,
      { odometer: vehicle.odometer, engineHours: vehicle.engineHours },
      { todayDateYmd: todayDate }
    );
    applyAddServiceEventFormValues(values);
    setSelectedNodePath(nodePath);
    setPendingWishlistInstallItemId(options.pendingInstall ? item.id : null);
    setIsAddServiceEventModalOpen(true);
    return true;
  };

  const openServiceLogForAttentionItem = (item: AttentionItemViewModel) => {
    const raw = findNodeTreeItemById(nodeTree, item.nodeId);
    if (!raw) {
      return;
    }
    const filter = createServiceLogNodeFilter(raw);
    const q = new URLSearchParams();
    q.set("nodeIds", filter.nodeIds.join(","));
    q.set("nodeLabel", filter.displayLabel);
    router.push(`/vehicles/${vehicleId}/service-log?${q.toString()}`);
  };

  const openAddServiceFromAttentionItem = (item: AttentionItemViewModel) => {
    if (!item.canAddServiceEvent) {
      return;
    }
    openAddServiceEventFromLeafNode(item.nodeId);
  };

  const openWishlistModalForCreate = (presetNodeId?: string, pickerTab: PartPickerTab = "search") => {
    setWishlistModalNonce((n) => n + 1);
    setWishlistPickerInitialTab(pickerTab);
    setWishlistNotice("");
    setWishlistEditingId(null);
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    setWishlistSelectedKitCode("");
    const initialWishlistForm = createInitialPartWishlistFormValues({
      nodeId: presetNodeId ?? "",
      status: "NEEDED",
    });
    setWishlistForm({ ...initialWishlistForm, currency: readDefaultCurrencySetting() });
    setWishlistFormError("");
    setIsWishlistModalOpen(true);
  };

  const openWishlistModalForServiceKit = (kit: ServiceKitViewModel, presetNodeId?: string) => {
    setWishlistModalNonce((n) => n + 1);
    setWishlistPickerInitialTab("kits");
    setWishlistNotice("");
    setWishlistEditingId(null);
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([kit]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    setWishlistSelectedKitCode(kit.code);
    const initialWishlistForm = createInitialPartWishlistFormValues({
      nodeId: presetNodeId ?? "",
      status: "NEEDED",
    });
    setWishlistForm({ ...initialWishlistForm, currency: readDefaultCurrencySetting() });
    setWishlistFormError("");
    setIsWishlistModalOpen(true);
  };

  const openWishlistModalForRecommendedSku = (
    rec: PartRecommendationViewModel,
    presetNodeId?: string
  ) => {
    setWishlistModalNonce((n) => n + 1);
    setWishlistPickerInitialTab("recommendations");
    const skuFromRecommendation = buildPartSkuViewModelFromRecommendation(rec);
    setWishlistNotice("");
    setWishlistEditingId(null);
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(skuFromRecommendation);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    setWishlistSelectedKitCode("");
    const initialWishlistForm = createInitialPartWishlistFormValues({
      nodeId: presetNodeId ?? rec.primaryNode?.id ?? "",
      status: "NEEDED",
    });
    setWishlistForm(
      applyPartSkuViewModelToPartWishlistFormValues(
        { ...initialWishlistForm, currency: readDefaultCurrencySetting() },
        skuFromRecommendation
      )
    );
    setWishlistFormError("");
    setIsWishlistModalOpen(true);
  };

  const openWishlistModalForEdit = (item: PartWishlistItem) => {
    setWishlistModalNonce((n) => n + 1);
    setWishlistPickerInitialTab("search");
    setWishlistNotice("");
    setWishlistEditingId(item.id);
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    setWishlistSelectedKitCode("");
    setWishlistForm(partWishlistFormValuesFromItem(item));
    setWishlistFormError("");
    setIsWishlistModalOpen(true);
  };

  const closeWishlistModal = (options: { restorePrevious?: boolean } = {}) => {
    setWishlistPickerInitialTab("search");
    setIsWishlistModalOpen(false);
    setWishlistEditingId(null);
    setWishlistFormError("");
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    setWishlistSelectedKitCode("");
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };

  const submitWishlistForm = async () => {
    if (!vehicleId) {
      return;
    }
    const validation = validatePartWishlistFormValues(wishlistForm);
    if (validation.errors.length > 0) {
      setWishlistFormError(validation.errors.join(" "));
      return;
    }
    setIsWishlistSaving(true);
    setWishlistFormError("");
    try {
      const prevForTransition = wishlistEditingId
        ? wishlistItems.find((w) => w.id === wishlistEditingId)?.status ?? "NEEDED"
        : "NEEDED";
      let savedItem: PartWishlistItem | null = null;

      if (wishlistEditingId) {
        const res = await vehicleDetailApi.updateWishlistItem(
          vehicleId,
          wishlistEditingId,
          normalizeUpdatePartWishlistPayload(wishlistForm)
        );
        savedItem = res.item;
      } else {
        const res = await vehicleDetailApi.createWishlistItem(
          vehicleId,
          normalizeCreatePartWishlistPayload(wishlistForm)
        );
        savedItem = res.item;
      }

      await Promise.all([loadWishlist(), loadServiceEvents(), loadDashboardExpenses(), loadNodeTree(), loadTopServiceNodes()]);
      closeWishlistModal({ restorePrevious: false });

      if (
        savedItem &&
        vehicle &&
        isWishlistTransitionToInstalled(prevForTransition, savedItem.status)
      ) {
        if (savedItem.nodeId) {
          openAddServiceEventPrefilledFromWishlist(savedItem);
        } else {
          setWishlistNotice(WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
        }
      }
    } catch (e) {
      setWishlistFormError(
        e instanceof Error ? e.message : "Не удалось сохранить позицию."
      );
    } finally {
      setIsWishlistSaving(false);
    }
  };

  const addRecommendedSkuToWishlist = async (rec: PartRecommendationViewModel) => {
    if (!vehicleId || wishlistEditingId) {
      const skuFromRecommendation = buildPartSkuViewModelFromRecommendation(rec);
      setWishlistSkuPickedPreview(skuFromRecommendation);
      setWishlistForm((f) => applyPartSkuViewModelToPartWishlistFormValues(f, skuFromRecommendation));
      return;
    }
    try {
      setWishlistAddingRecommendedSkuId(rec.skuId);
      const payload = normalizeCreatePartWishlistPayload({
        ...createInitialPartWishlistFormValues({
          nodeId: wishlistForm.nodeId,
          status: "NEEDED",
        }),
        skuId: rec.skuId,
      });
      await vehicleDetailApi.createWishlistItem(vehicleId, payload);
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice("Рекомендованный SKU добавлен в список покупок.");
      closeWishlistModal({ restorePrevious: false });
    } catch (e) {
      setWishlistFormError(
        e instanceof Error ? e.message : "Не удалось добавить рекомендованный SKU."
      );
    } finally {
      setWishlistAddingRecommendedSkuId("");
    }
  };

  const addServiceKitToWishlist = async (kit: ServiceKitViewModel) => {
    if (!vehicleId || wishlistEditingId) {
      return;
    }
    const contextNodeId = wishlistForm.nodeId.trim();
    if (!contextNodeId) {
      setWishlistFormError("Выберите узел мотоцикла");
      return;
    }
    try {
      setWishlistAddingKitCode(kit.code);
      const res = await vehicleDetailApi.addServiceKitToWishlist(vehicleId, {
        kitCode: kit.code,
        contextNodeId,
      });
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice(
        `Комплект добавлен: ${res.result.createdItems.length} создано, ${res.result.skippedItems.length} пропущено.`
      );
      closeWishlistModal({ restorePrevious: false });
    } catch (e) {
      setWishlistFormError(
        e instanceof Error ? e.message : "Не удалось добавить комплект обслуживания."
      );
    } finally {
      setWishlistAddingKitCode("");
    }
  };

  const deleteWishlistItemById = async (itemId: string, options: { skipConfirm?: boolean } = {}) => {
    if (!vehicleId) {
      return;
    }
    if (!options.skipConfirm && !window.confirm("Удалить позицию из списка покупок?")) {
      return;
    }
    try {
      setWishlistNotice("");
      setWishlistDeletingId(itemId);
      await vehicleDetailApi.deleteWishlistItem(vehicleId, itemId);
      await loadWishlist();
      setWishlistNotice("Позиция удалена из списка покупок.");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Не удалось удалить позицию.";
      setWishlistNotice(`Ошибка: ${msg}`);
    } finally {
      setWishlistDeletingId("");
    }
  };

  const openWishlistPurchaseExpenseForm = (item: PartWishlistItem) => {
    setWishlistPurchaseExpenseItemId(item.id);
    setWishlistPurchaseExpenseError("");
    setWishlistPurchaseExpenseForm({
      amount: item.costAmount != null ? String(item.costAmount) : "",
      currency: item.currency?.trim() || readDefaultCurrencySetting(),
      purchasedAt: new Date().toISOString().slice(0, 10),
      vendor: "",
      comment: item.comment ?? "",
    });
  };

  const closeWishlistPurchaseExpenseForm = () => {
    setWishlistPurchaseExpenseItemId("");
    setWishlistPurchaseExpenseError("");
    setWishlistPurchaseExpenseForm({
      amount: "",
      currency: readDefaultCurrencySetting(),
      purchasedAt: "",
      vendor: "",
      comment: "",
    });
  };

  const submitWishlistPurchaseExpense = async () => {
    const itemId = wishlistPurchaseExpenseItemId;
    if (!itemId) {
      return;
    }
    const amount = Number(wishlistPurchaseExpenseForm.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !wishlistPurchaseExpenseForm.currency.trim()) {
      setWishlistPurchaseExpenseError("Укажите положительную сумму и валюту.");
      return;
    }
    try {
      setIsWishlistPurchaseSaving(true);
      setWishlistPurchaseExpenseError("");
      const sourceItem = wishlistItems.find((item) => item.id === itemId);
      await vehicleDetailApi.createExpenseFromShoppingListItem(itemId, {
        amount,
        currency: wishlistPurchaseExpenseForm.currency.trim().toUpperCase(),
        purchasedAt: wishlistPurchaseExpenseForm.purchasedAt || null,
        vendor: wishlistPurchaseExpenseForm.vendor.trim() || null,
        comment: wishlistPurchaseExpenseForm.comment.trim() || null,
      });
      await Promise.all([loadWishlist(), loadDashboardExpenses(), loadNodeExpenseSummary()]);
      if (sourceItem && sourceItem.status !== "BOUGHT") {
        setWishlistStatusTransitionHistoryByItemId((prev) => ({
          ...prev,
          [itemId]: {
            changedAt: new Date().toISOString(),
            previousStatus: sourceItem.status,
            nextStatus: "BOUGHT",
          },
        }));
      }
      closeWishlistPurchaseExpenseForm();
      setWishlistNotice("Расход создан, позиция отмечена как купленная.");
    } catch (e) {
      setWishlistPurchaseExpenseError(
        e instanceof Error ? e.message : "Не удалось создать расход из позиции списка."
      );
    } finally {
      setIsWishlistPurchaseSaving(false);
    }
  };

  const patchWishlistItemStatus = async (
    itemId: string,
    status: PartWishlistItem["status"],
    previousStatus: PartWishlistItem["status"]
  ) => {
    if (!vehicleId) {
      return;
    }
    if (status === previousStatus) {
      return;
    }
    try {
      setWishlistNotice("");
      const sourceItem = wishlistItems.find((w) => w.id === itemId);
      if (!sourceItem) {
        setWishlistNotice("Ошибка: позиция списка не найдена.");
        return;
      }
      const sourceNodeId = sourceItem?.nodeId?.trim() ?? "";
      const shouldDeferInstalledStatus =
        status === "INSTALLED" && isWishlistTransitionToInstalled(previousStatus, status);
      if (!sourceNodeId) {
        openWishlistModalForEdit(sourceItem);
        setWishlistForm((prev) => ({ ...prev, status }));
        setWishlistFormError(
          status === "INSTALLED"
            ? "Чтобы отметить позицию установленной, выберите конечный узел мотоцикла."
            : "Чтобы менять статус позиции из блока покупок, выберите конечный узел мотоцикла."
        );
        return;
      }
      if (shouldDeferInstalledStatus) {
        const didOpenServiceEventModal = openAddServiceEventPrefilledFromWishlist(sourceItem, {
          pendingInstall: true,
        });
        if (didOpenServiceEventModal) {
          setWishlistNotice(
            "Статус «Установлено» применится после сохранения сервисного события."
          );
        }
        return;
      }
      setWishlistStatusUpdatingId(itemId);
      const res = await vehicleDetailApi.updateWishlistItem(vehicleId, itemId, {
        status,
        nodeId: sourceNodeId,
      });
      await Promise.all([loadWishlist(), loadServiceEvents(), loadDashboardExpenses(), loadNodeTree(), loadTopServiceNodes()]);
      setWishlistStatusTransitionHistoryByItemId((prev) => ({
        ...prev,
        [itemId]: {
          changedAt: res.item.updatedAt,
          previousStatus,
          nextStatus: res.item.status,
        },
      }));
      const becameInstalled =
        res.item.status === "INSTALLED" &&
        isWishlistTransitionToInstalled(previousStatus, res.item.status);
      if (becameInstalled && vehicle) {
        if (res.item.nodeId) {
          openAddServiceEventPrefilledFromWishlist(res.item);
        } else {
          setWishlistNotice(WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
        }
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Не удалось обновить статус.";
      setWishlistNotice(`Ошибка: ${msg}`);
    } finally {
      setWishlistStatusUpdatingId("");
    }
  };

  const pushOverlayReturnTarget = (target: OverlayReturnTarget) => {
    overlayReturnStackRef.current = [...overlayReturnStackRef.current, target];
  };
  const restoreOverlayReturnTarget = (target: OverlayReturnTarget) => {
    if (target.type === "nodeContext") {
      setSelectedNodeContextId(target.nodeId);
      return;
    }
  };
  const restorePreviousOverlay = () => {
    const target = overlayReturnStackRef.current.at(-1);
    if (!target) {
      return;
    }
    overlayReturnStackRef.current = overlayReturnStackRef.current.slice(0, -1);
    window.requestAnimationFrame(() => restoreOverlayReturnTarget(target));
  };
  const getCurrentOverlayReturnTarget = (): OverlayReturnTarget | null => {
    if (selectedNodeContextId) {
      return { type: "nodeContext", nodeId: selectedNodeContextId };
    }
    return null;
  };
  const clearNodeContextModal = () => {
    setSelectedNodeContextId(null);
    setNodeContextAddingRecommendedSkuId("");
    setNodeContextAddingKitCode("");
  };
  const closeNodeContextModal = (options: { restorePrevious?: boolean } = {}) => {
    clearNodeContextModal();
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };
  const closeStatusExplanationModal = (options: { restorePrevious?: boolean } = {}) => {
    setSelectedStatusExplanationNode(null);
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };
  const openWishlistFromAttentionItem = (item: AttentionItemViewModel) => {
    openWishlistModalForCreate(item.nodeId);
  };
  const openTopOverviewNode = (nodeId: string) => {
    if (pageView === "nodeTree") {
      setStatusHighlightedNodeIds(new Set());
      focusNodeInTree(nodeId);
      const q = new URLSearchParams(window.location.search);
      q.set("nodeId", nodeId);
      q.delete("highlightIssueNodeIds");
      const nextHref = `/vehicles/${vehicleId}/nodes?${q.toString()}`;
      if (window.location.pathname + window.location.search !== nextHref) {
        window.history.replaceState(window.history.state, "", nextHref);
      }
      return;
    }
    router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
  };
  const openTopOverviewIssueNodes = (nodeIds: string[]) => {
    if (nodeIds.length === 0) {
      return;
    }
    if (pageView === "nodeTree") {
      focusIssueNodesInTree(nodeIds);
      return;
    }
    router.push(
      `/vehicles/${vehicleId}/nodes?highlightIssueNodeIds=${encodeURIComponent(nodeIds.join(","))}`
    );
  };
  const replaceNodeTreeSelectedNodeInUrl = (nodeId: string) => {
    if (pageView !== "nodeTree" || !vehicleId) {
      return;
    }
    const q = new URLSearchParams(window.location.search);
    q.set("nodeId", nodeId);
    q.delete("highlightIssueNodeIds");
    const nextHref = `/vehicles/${vehicleId}/nodes?${q.toString()}`;
    if (window.location.pathname + window.location.search !== nextHref) {
      window.history.replaceState(window.history.state, "", nextHref);
    }
  };
  const openNodeContextModal = (nodeId: string, returnTarget?: OverlayReturnTarget | null) => {
    if (pageView !== "nodeTree") {
      router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
      return;
    }
    const target = returnTarget ?? getCurrentOverlayReturnTarget();
    if (target) {
      pushOverlayReturnTarget(target);
    }
    setSelectedNodeContextId(nodeId);
    replaceNodeTreeSelectedNodeInUrl(nodeId);
  };
  const openSearchResultInNodeTree = (result: NodeTreeSearchResultViewModel) => {
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setExpandedNodes((prev) => {
      const next = { ...prev };
      for (const ancestorId of result.ancestorIds) {
        next[ancestorId] = true;
      }
      return next;
    });
    openNodeContextModal(result.nodeId);
  };
  const openServiceLogFromSearchResult = (result: NodeTreeSearchResultViewModel) => {
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(null);
    const selectedNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
    if (!selectedNode) {
      return;
    }
    openServiceLogFilteredByNode(selectedNode);
  };
  function openStatusExplanationModal(node: NodeTreeItemViewModel) {
    setSelectedStatusExplanationNode(null);
    window.requestAnimationFrame(() => {
      setSelectedStatusExplanationNode(node);
    });
  }
  const openStatusExplanationFromSearchResult = (result: NodeTreeSearchResultViewModel) => {
    const selectedNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
    if (!selectedNode || !canOpenNodeStatusExplanationModal(selectedNode)) {
      return;
    }
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(null);
    openStatusExplanationModal(selectedNode);
  };
  const addRecommendedSkuToWishlistFromNodeContext = async (rec: PartRecommendationViewModel) => {
    if (!vehicleId || !selectedNodeContextId) {
      return;
    }
    try {
      setNodeContextAddingRecommendedSkuId(rec.skuId);
      const payload = normalizeCreatePartWishlistPayload({
        ...createInitialPartWishlistFormValues({
          nodeId: selectedNodeContextId,
          status: "NEEDED",
        }),
        skuId: rec.skuId,
      });
      await vehicleDetailApi.createWishlistItem(vehicleId, payload);
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice("Рекомендованный SKU добавлен в список покупок.");
    } catch (e) {
      setNodeContextRecommendationsError(
        e instanceof Error ? e.message : "Не удалось добавить рекомендованный SKU."
      );
    } finally {
      setNodeContextAddingRecommendedSkuId("");
    }
  };
  const addServiceKitToWishlistFromNodeContext = async (kit: ServiceKitViewModel) => {
    if (!vehicleId || !selectedNodeContextId) {
      return;
    }
    try {
      setNodeContextAddingKitCode(kit.code);
      const res = await vehicleDetailApi.addServiceKitToWishlist(vehicleId, {
        kitCode: kit.code,
        contextNodeId: selectedNodeContextId,
      });
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice(
        `Комплект добавлен: ${res.result.createdItems.length} создано, ${res.result.skippedItems.length} пропущено.`
      );
      window.alert(
        `Комплект добавлен.\nДобавлено: ${res.result.createdItems.length}\nПропущено: ${res.result.skippedItems.length}`
      );
    } catch (e) {
      const message =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : "Не удалось добавить комплект обслуживания.";
      setNodeContextServiceKitsError(
        message
      );
      window.alert(message);
    } finally {
      setNodeContextAddingKitCode("");
    }
  };
  const handleNodeContextAction = (actionKey: string) => {
    if (!selectedNodeContextNode) {
      return;
    }
    if (actionKey === "journal") {
      closeNodeContextModal({ restorePrevious: false });
      openServiceLogFilteredByNode(selectedNodeContextNode);
      return;
    }
    if (actionKey === "add_service_event" && selectedNodeContextNode.canAddServiceEvent) {
      pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
      closeNodeContextModal({ restorePrevious: false });
      openAddServiceEventFromLeafNode(selectedNodeContextNode.id);
      return;
    }
    if (actionKey === "add_wishlist" && !selectedNodeContextNode.hasChildren) {
      pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
      closeNodeContextModal({ restorePrevious: false });
      openWishlistModalForCreate(selectedNodeContextNode.id);
      return;
    }
    if (actionKey === "add_kit" && nodeContextServiceKits[0]) {
      void addServiceKitToWishlistFromNodeContext(nodeContextServiceKits[0]);
      return;
    }
    if (actionKey === "open_status_explanation" && selectedNodeContextNode.statusExplanation) {
      pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
      closeNodeContextModal({ restorePrevious: false });
      openStatusExplanationModal(selectedNodeContextNode);
    }
  };
  const openWishlistFromSearchResult = (result: NodeTreeSearchResultViewModel) => {
    if (!result.isLeaf) {
      return;
    }
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(null);
    openWishlistModalForCreate(result.nodeId);
  };
  const handleSearchResultAction = (
    actionKey: NodeTreeSearchActionKey,
    result: NodeTreeSearchResultViewModel
  ) => {
    if (actionKey === "open") {
      openNodeContextModal(result.nodeId);
      return;
    }
    if (actionKey === "service_log") {
      openServiceLogFromSearchResult(result);
      return;
    }
    if (actionKey === "buy") {
      openWishlistFromSearchResult(result);
    }
  };
  const openServiceLogFromTreeContext = (node: NodeTreeItemViewModel) => {
    openServiceLogFilteredByNode(node);
  };
  const openAddServiceEventFromTreeContext = (leafNodeId: string) => {
    const target = getCurrentOverlayReturnTarget();
    if (target) {
      pushOverlayReturnTarget(target);
    }
    openAddServiceEventFromLeafNode(leafNodeId);
  };
  const openWishlistFromTreeContext = (nodeId: string) => {
    const target = getCurrentOverlayReturnTarget();
    if (target) {
      pushOverlayReturnTarget(target);
    }
    openWishlistModalForCreate(nodeId);
  };
  const openStatusExplanationFromTreeContext = (node: NodeTreeItemViewModel) => {
    openStatusExplanationModal(node);
  };
  const setNodeSnoozeOption = useCallback(
    (nodeId: string, option: NodeSnoozeOption) => {
      if (!vehicleId) {
        return;
      }
      try {
        const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
        const nextValue = option === "clear" ? null : calculateSnoozeUntilDate(option);
        if (nextValue) {
          localStorage.setItem(key, nextValue);
        } else {
          localStorage.removeItem(key);
        }
        setNodeSnoozeByNodeId((prev) => ({ ...prev, [nodeId]: nextValue }));
      } catch {
        // Ignore local-only storage failures.
      }
    },
    [vehicleId]
  );
  const selectedNodeSnoozeUntil =
    selectedNodeContextId ? (nodeSnoozeByNodeId[selectedNodeContextId] ?? null) : null;
  const selectedNodeSnoozeLabel = formatSnoozeUntilLabel(selectedNodeSnoozeUntil);
  const canSnoozeSelectedNode =
    selectedNodeContextViewModel?.effectiveStatus === "OVERDUE" ||
    selectedNodeContextViewModel?.effectiveStatus === "SOON";

  const formatNodeExpenseTotals = (
    totals: ExpenseNodeSummaryItem["totalByCurrency"]
  ): string => {
    if (totals.length === 0) {
      return "—";
    }
    return totals
      .map((row) => `${formatExpenseAmountRu(row.amount)} ${row.currency === "RUB" ? "₽" : row.currency}`)
      .join(" · ");
  };

  const formatNodeExpenseDate = (date: string): string => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date.slice(0, 10);
    }
    return parsed.toLocaleDateString("ru-RU");
  };

  const openExpensesForNode = (nodeId: string) => {
    router.push(
      `/expenses?vehicleId=${encodeURIComponent(vehicleId)}&nodeId=${encodeURIComponent(nodeId)}&year=${nodeExpenseYear}`
    );
  };

  const renderChildTreeNode = (
    node: NodeTreeItemViewModel,
    depth: number,
    isLast = false,
    ancestorLasts: boolean[] = []
  ): ReactNode => {
    const hasChildren = node.hasChildren;
    const isExpanded = Boolean(expandedNodes[node.id]);
    const nodeExpenseSummary = nodeExpenseSummaryByNodeId[node.id] ?? null;
    const shortExplanationLabel = node.shortExplanationLabel;
    const canOpenStatusExplanation = canOpenNodeStatusExplanationModal(node);
    const statusHighlightTokens =
      statusHighlightedNodeIds.has(node.id) && isIssueNodeStatus(node.effectiveStatus)
        ? statusSemanticTokens[node.effectiveStatus]
        : null;
    if (pageView === "nodeTree") {
      const isSelected = selectedNodeContextId === node.id;
      const metaCount = node.children.length;
      const connectorColor = productSemanticColors.border;
      const guideColumnPx = 24;
      const selectionTokens = node.effectiveStatus
        ? statusSemanticTokens[node.effectiveStatus]
        : statusSemanticTokens.UNKNOWN;
      const selectionBorderColor = selectionTokens.border;
      const iconColor = productSemanticColors.textSecondary;
      const rowStatusTokens = node.effectiveStatus
        ? statusSemanticTokens[node.effectiveStatus]
        : statusSemanticTokens.UNKNOWN;
      const rowStatusLabel =
        node.effectiveStatus === "OVERDUE"
          ? "Просрочено"
          : node.effectiveStatus === "SOON"
          ? "Скоро"
          : node.effectiveStatus === "RECENTLY_REPLACED"
          ? "Недавно"
          : "ОК";
      const handlePrimaryRowAction = () => {
        if (hasChildren) {
          toggleNodeExpansion(node);
          return;
        }
        openNodeContextModal(node.id);
      };
      const handleOpenNodeDetails = () => {
        openNodeContextModal(node.id);
      };
      const renderIndentGuides = () => (
        <>
          {ancestorLasts.slice(0, -1).map((ancestorIsLast, index) => (
            <div
              key={`anc-${index}`}
              className="relative shrink-0 self-stretch"
              style={{ width: guideColumnPx }}
              aria-hidden
            >
              {ancestorIsLast ? null : (
                <span
                  className="absolute"
                  style={{
                    left: "50%",
                    width: 1,
                    top: -1,
                    bottom: -1,
                    transform: "translateX(-0.5px)",
                    backgroundColor: connectorColor,
                  }}
                />
              )}
            </div>
          ))}
          {depth > 0 ? (
            <div
              className="relative shrink-0 self-stretch"
              style={{ width: guideColumnPx }}
              aria-hidden
            >
              <span
                className="absolute"
                style={{
                  left: "50%",
                  width: 1,
                  top: -1,
                  transform: "translateX(-0.5px)",
                  bottom: isLast ? "calc(50% + 6px)" : -1,
                  backgroundColor: connectorColor,
                }}
              />
              <svg
                className="absolute"
                width={guideColumnPx}
                height="18"
                viewBox={`0 0 ${guideColumnPx} 18`}
                fill="none"
                style={{
                  top: "50%",
                  left: 0,
                  transform: "translateY(-9px)",
                  overflow: "visible",
                }}
              >
                <path
                  d={`M ${guideColumnPx / 2} 0 V 5 Q ${guideColumnPx / 2} 9 ${guideColumnPx / 2 + 4} 9 H ${guideColumnPx - 3}`}
                  stroke={connectorColor}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${guideColumnPx - 7} 6 L ${guideColumnPx - 3} 9 L ${guideColumnPx - 7} 12`}
                  stroke={connectorColor}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : null}
        </>
      );
      const renderTreeIcon = () => {
        const iconSrc = getNodeTreeIconWebSrc(node.code, node.name);
        if (iconSrc) {
          return (
            <Image
              src={iconSrc}
              alt=""
              width={22}
              height={22}
              className="object-contain"
              aria-hidden
            />
          );
        }
        const codeUpper = node.code.toUpperCase();
        const segments = codeUpper.replace(/[._]/g, "-").split("-").filter(Boolean);
        const lastSeg = segments[segments.length - 1] ?? "";
        const name = node.name.toLowerCase();
        const stroke = "currentColor";
        const sw = 1.7;
        if (lastSeg === "OIL" || (name.includes("мотор") && name.includes("масл"))) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4h6v3H9z" />
              <path d="M8 7h8l1 2v9.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18.5V9l1-2Z" />
              <path d="M11 11h2.5l-1.5 2.5h2L11 17" />
            </svg>
          );
        }
        if (lastSeg === "FLTR" || name.includes("фильтр")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="4" width="8" height="16" rx="1.6" />
              <path d="M9.5 7.5v9M12 7.5v9M14.5 7.5v9" />
            </svg>
          );
        }
        if (lastSeg === "PADS" || name.includes("колодк")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9c0-2 1.5-3 3.5-3h7c2 0 3.5 1 3.5 3v6c0 2-1.5 3-3.5 3h-7C6.5 18 5 17 5 15Z" />
              <path d="M5 12h14" />
            </svg>
          );
        }
        if (lastSeg === "DISC" || name.includes("диск")) {
          return <TopNodeIcon iconKey="brakes" size={22} />;
        }
        if (lastSeg === "HEAD" || name.includes("верх")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13a7 7 0 0 1 14 0v6H5z" />
              <path d="M5 16h14" />
            </svg>
          );
        }
        if (lastSeg === "BLOCK" || lastSeg === "BOTTOMEND" || name.includes("низ")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="6" width="14" height="12" rx="1.6" />
              <path d="M5 10h14M5 14h14" />
            </svg>
          );
        }
        if ((segments[0] === "ENG" || segments[0] === "ENGINE") && segments[1] === "LUB") {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.5C8.8 8.8 6.4 11.8 6.4 14.8a5.6 5.6 0 1 0 11.2 0c0-3-2.4-6-5.6-11.3Z" />
            </svg>
          );
        }
        if (lastSeg === "FRONT" || lastSeg === "REAR" || name.includes("контур")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.5C8.8 8.8 6.4 11.8 6.4 14.8a5.6 5.6 0 1 0 11.2 0c0-3-2.4-6-5.6-11.3Z" />
            </svg>
          );
        }
        if (segments[0] === "BRK" || segments[0] === "BRAKE" || name.includes("торм")) {
          return <TopNodeIcon iconKey="brakes" size={22} />;
        }
        if (segments[0] === "SUS" || name.includes("подвес")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 3 6 13h5l-2 8 9-12h-5l2-6Z" />
            </svg>
          );
        }
        if (segments[0] === "ELEC" || name.includes("элект")) {
          return (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 3 6 13h5l-2 8 9-12h-5l2-6Z" />
            </svg>
          );
        }
        if (segments[0] === "ENG" || segments[0] === "ENGINE" || name.includes("двиг")) {
          return <TopNodeIcon iconKey="engine" size={22} />;
        }
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="5" width="12" height="14" rx="2" />
            <path d="M9 9h6M9 13h6M9 17h3" />
          </svg>
        );
      };
      return (
        <div key={node.id}>
          <div
            data-node-tree-id={node.id}
            role="button"
            tabIndex={0}
            onClick={handlePrimaryRowAction}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handlePrimaryRowAction();
              }
            }}
            title={hasChildren ? "Развернуть или свернуть ветку" : "Открыть контекст узла"}
            aria-label={
              hasChildren
                ? `${isExpanded ? "Свернуть" : "Развернуть"} ветку ${node.name}`
                : `Открыть контекст узла ${node.name}`
            }
            className="flex min-h-[52px] items-stretch text-left transition hover:bg-slate-800/40"
            style={{
              backgroundColor: productSemanticColors.card,
              color: productSemanticColors.textPrimary,
            }}
          >
            {renderIndentGuides()}
            <div
              className="flex flex-1 items-center gap-2 border-b px-2.5 py-2"
              style={{
                borderBottomColor: productSemanticColors.border,
                outline: isSelected ? `1.5px solid ${selectionBorderColor}` : undefined,
                outlineOffset: isSelected ? "-1.5px" : undefined,
                borderRadius: isSelected ? 10 : 0,
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (hasChildren) {
                    toggleNodeExpansion(node);
                  }
                }}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{ color: productSemanticColors.textSecondary }}
                aria-label={hasChildren ? (isExpanded ? "Свернуть ветку" : "Развернуть ветку") : undefined}
              >
                {hasChildren ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{
                      transform: isExpanded ? "rotate(90deg)" : undefined,
                      transition: "transform 120ms ease",
                    }}
                  >
                    <path d="M6 4.5 9.5 8 6 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="h-3.5 w-3.5" />
                )}
              </button>
              <div
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center"
                style={{ color: iconColor }}
              >
                {renderTreeIcon()}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold leading-tight"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {node.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide" style={{ color: productSemanticColors.textMuted }}>
                    {node.code}
                  </p>
                  {metaCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <rect x="3" y="3" width="8" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M5 1.8h4v2H5z" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                      {metaCount}
                    </span>
                  ) : null}
                </div>
              </div>
              {node.effectiveStatus ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openServiceLogFromTreeContext(node);
                  }}
                  className="inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold leading-none"
                  style={{
                    borderColor: rowStatusTokens.foreground,
                    backgroundColor: productSemanticColors.cardSubtle,
                    color: rowStatusTokens.foreground,
                  }}
                >
                  <span>{rowStatusLabel}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenNodeDetails();
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition hover:bg-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
                title="Открыть контекст узла"
                aria-label={`Открыть контекст узла ${node.name}`}
              >
                <OpenContextIcon />
              </button>
            </div>
          </div>
          {hasChildren && isExpanded ? (
            <div>
              {node.children.map((child, childIndex) =>
                renderChildTreeNode(child, depth + 1, childIndex === node.children.length - 1, [
                  ...ancestorLasts,
                  isLast,
                ])
              )}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div key={node.id} className="space-y-1">
        <div
          data-node-tree-id={node.id}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (hasChildren) {
              toggleNodeExpansion(node);
              return;
            }
            openNodeContextModal(node.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (hasChildren) {
                toggleNodeExpansion(node);
                return;
              }
              openNodeContextModal(node.id);
            }
          }}
          title={hasChildren ? "Развернуть или свернуть ветку" : "Открыть контекст узла"}
          aria-label={
            hasChildren
              ? `${isExpanded ? "Свернуть" : "Развернуть"} ветку ${node.name}`
              : `Открыть контекст узла ${node.name}`
          }
          className={`rounded-xl border bg-slate-900 px-3 py-2 text-left transition hover:border-slate-500 ${
            statusHighlightTokens
              ? "ring-2"
              : selectedNodeContextId === node.id
              ? "ring-2"
              : highlightedNodeId === node.id
              ? "ring-2"
              : "border-slate-700"
          }`}
          style={{
            marginLeft: `${depth * 18}px`,
            backgroundColor: productSemanticColors.cardMuted,
            borderColor:
              statusHighlightTokens
                ? statusHighlightTokens.border
                : selectedNodeContextId === node.id
                ? statusSemanticTokens.SOON.border
                : highlightedNodeId === node.id
                ? statusSemanticTokens.SOON.border
                : productSemanticColors.borderStrong,
            boxShadow: statusHighlightTokens
              ? `0 0 0 2px ${statusHighlightTokens.accent}`
              : selectedNodeContextId === node.id
              ? `0 0 0 1px ${statusSemanticTokens.SOON.accent}`
              : highlightedNodeId === node.id
              ? `0 0 0 2px ${statusSemanticTokens.SOON.accent}`
              : undefined,
            color: productSemanticColors.textPrimary,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleNodeExpansion(node);
                    }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-600 text-slate-200 transition hover:bg-slate-800"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textPrimary,
                    }}
                    title={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                    aria-label={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                ) : (
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center text-slate-500"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    •
                  </span>
                )}
                <span
                  className="truncate text-sm font-semibold text-slate-100"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {node.name}
                </span>
                <span className="truncate text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                  {node.code}
                </span>
              </div>
              {shortExplanationLabel && canOpenStatusExplanation ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openStatusExplanationFromTreeContext(node);
                  }}
                  className="mt-1 pl-8 text-left text-xs text-slate-300 underline decoration-dotted underline-offset-2 transition hover:text-slate-100"
                  style={{ color: productSemanticColors.textSecondary }}
                >
                  {shortExplanationLabel}
                </button>
              ) : null}
              {shortExplanationLabel && !canOpenStatusExplanation ? (
                <p className="mt-1 pl-8 text-xs text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  {shortExplanationLabel}
                </p>
              ) : null}
              {nodeExpenseSummary ? (
                <div className="mt-1.5 space-y-1 pl-8 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                  <p>
                    Расходы за сезон:{" "}
                    <span className="font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                      {formatNodeExpenseTotals(nodeExpenseSummary.totalByCurrency)}
                    </span>
                  </p>
                  {nodeExpenseSummary.purchasedNotInstalledCount > 0 ? (
                    <p>
                      Куплено, не установлено:{" "}
                      <span className="font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                        {nodeExpenseSummary.purchasedNotInstalledCount}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {node.effectiveStatus ? (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openServiceLogFromTreeContext(node);
                    }}
                    className="inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium transition hover:ring-2 hover:ring-slate-500 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400"
                    style={getStatusBadgeStyle(node.effectiveStatus)}
                    title="Журнал"
                    aria-label={`Открыть журнал обслуживания по узлу «${node.name}»`}
                  >
                    <ActionIcon iconKey="openServiceLog" className="mr-1 h-3.5 w-3.5" />
                    {node.statusLabel}
                  </button>
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    Журнал
                  </span>
                </div>
              ) : null}
              <div className="group relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openWishlistFromTreeContext(node.id);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                      title="Добавить в список покупок"
                      aria-label="Добавить в список покупок"
                    >
                      <ActionIcon iconKey="addToShoppingList" />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      Добавить в список покупок
                    </span>
              </div>
              <div className="group relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openNodeContextModal(node.id);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                      title="Открыть контекст узла"
                      aria-label="Открыть контекст узла"
                    >
                      <OpenContextIcon />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      Открыть контекст узла
                    </span>
              </div>
              {node.canAddServiceEvent ? (
                <div className="group relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAddServiceEventFromTreeContext(node.id);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 text-slate-100 transition hover:bg-slate-700"
                        style={{
                          backgroundColor: productSemanticColors.cardSubtle,
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textPrimary,
                        }}
                        aria-label="Добавить сервисное событие"
                        title="Добавить сервисное событие"
                      >
                        <ActionIcon iconKey="addServiceEvent" />
                      </button>
                      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        Добавить сервисное событие
                      </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded ? (
          <div className="space-y-2">
            {nodeExpenseSummary ? (
              <div
                className="rounded-xl border px-4 py-3"
                style={{
                  marginLeft: `${(depth + 1) * 16}px`,
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textSecondary,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                      Расходы по узлу
                    </p>
                    <p className="mt-1 text-xs">
                      {formatNodeExpenseTotals(nodeExpenseSummary.totalByCurrency)} за сезон {nodeExpenseYear}
                    </p>
                    <p className="mt-1 text-xs">
                      {nodeExpenseSummary.expenseCount} расход{nodeExpenseSummary.expenseCount === 1 ? "" : "а"}
                    </p>
                    {nodeExpenseSummary.purchasedNotInstalledCount > 0 ? (
                      <p className="mt-1 text-xs">
                        Куплено, не установлено: {nodeExpenseSummary.purchasedNotInstalledCount}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openExpensesForNode(node.id)}
                    className="text-xs font-semibold underline decoration-dotted underline-offset-2"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Все расходы по узлу →
                  </button>
                </div>
                {nodeExpenseSummary.latestExpenses.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: productSemanticColors.textMuted }}>
                      Последние расходы
                    </p>
                    {nodeExpenseSummary.latestExpenses.map((expense) => (
                      <div key={expense.id} className="flex flex-wrap justify-between gap-2 text-xs">
                        <span>
                          {formatNodeExpenseDate(expense.date)} {expense.title}
                          {" · "}
                          {expenseCategoryLabelsRu[expense.category]}
                        </span>
                        <span className="font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                          {formatExpenseAmountRu(expense.amount)} {expense.currency === "RUB" ? "₽" : expense.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {node.children.map((child) => renderChildTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    void loadNodeTree();
    void loadTopServiceNodes();
    void loadWishlist();
  }, [vehicleId, loadNodeTree, loadTopServiceNodes, loadWishlist]);

  useEffect(() => {
    if (!vehicleId || (pageView !== "nodeTree" && !isFullNodeTreeOpen)) {
      return;
    }
    void loadNodeExpenseSummary();
  }, [isFullNodeTreeOpen, loadNodeExpenseSummary, pageView, vehicleId]);

  const openVehicleStateEditor = () => {
    if (!vehicle) {
      return;
    }

    const initial = createInitialVehicleStateFormValues(
      vehicle.odometer,
      vehicle.engineHours
    );
    setVehicleStateOdometer(initial.odometer);
    setVehicleStateEngineHours(initial.engineHours);
    setVehicleStateError("");
    setIsEditingVehicleState(true);
  };

  const openEditProfileModal = () => {
    if (!vehicle) {
      return;
    }

    setProfileForm(
      buildInitialVehicleProfileFormValues({
        nickname: vehicle.nickname || "",
        vin: vehicle.vin || "",
        usageType: (vehicle.rideProfile?.usageType || "MIXED") as EditVehicleProfileFormValues["usageType"],
        ridingStyle: (vehicle.rideProfile?.ridingStyle ||
          "ACTIVE") as EditVehicleProfileFormValues["ridingStyle"],
        loadType: (vehicle.rideProfile?.loadType || "SOLO") as EditVehicleProfileFormValues["loadType"],
        usageIntensity: (vehicle.rideProfile?.usageIntensity ||
          "MEDIUM") as EditVehicleProfileFormValues["usageIntensity"],
      })
    );
    setProfileFormError("");
    setProfileFormSuccess("");
    setIsEditProfileModalOpen(true);
  };

  const saveVehicleProfile = async () => {
    if (!vehicleId) {
      setProfileFormError("Не удалось определить мотоцикл.");
      return;
    }
    const validation = validateVehicleProfileFormValues(profileForm);
    if (validation.errors.length > 0) {
      setProfileFormError(validation.errors[0]);
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileFormError("");
      setProfileFormSuccess("");

      const data = await vehicleDetailApi.updateVehicleProfile(
        vehicleId,
        normalizeVehicleProfileFormValues(profileForm)
      );

      const updated = data.vehicle as unknown as VehicleDetailApiRecord;
      setVehicle(vehicleDetailFromApiRecord(updated));
      setIsEditProfileModalOpen(false);
      setProfileFormSuccess("Мотоцикл обновлен");
    } catch (saveError) {
      console.error(saveError);
      setProfileFormError(
        saveError instanceof Error
          ? saveError.message
          : "Произошла ошибка при сохранении профиля."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const moveVehicleToTrash = async () => {
    if (!vehicleId) {
      setMoveToTrashError("Не удалось определить мотоцикл.");
      return;
    }
    const confirmed = window.confirm(
      "Переместить мотоцикл на Свалку?\n\nОн исчезнет из гаража, но его можно будет восстановить на странице «Свалка»."
    );
    if (!confirmed) {
      return;
    }
    try {
      setIsMovingToTrash(true);
      setMoveToTrashError("");
      await vehicleDetailApi.moveVehicleToTrash(vehicleId);
      window.location.assign("/garage");
    } catch (requestError) {
      console.error(requestError);
      setMoveToTrashError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось переместить мотоцикл на Свалку."
      );
    } finally {
      setIsMovingToTrash(false);
    }
  };

  const cancelVehicleStateEditor = () => {
    setVehicleStateError("");
    setIsEditingVehicleState(false);
  };

  const saveVehicleState = async () => {
    if (!vehicleId || !vehicle) {
      setVehicleStateError("Не удалось определить мотоцикл.");
      return;
    }

    const stateValues = {
      odometer: vehicleStateOdometer,
      engineHours: vehicleStateEngineHours,
    };
    const validation = validateVehicleStateFormValues(stateValues, "web");
    if (validation.errors.length > 0) {
      setVehicleStateError(validation.errors[0]);
      return;
    }

    try {
      setIsSavingVehicleState(true);
      setVehicleStateError("");

      const data = await vehicleDetailApi.updateVehicleState(
        vehicleId,
        normalizeVehicleStatePayload(stateValues)
      );

      setVehicle((currentVehicle) =>
        currentVehicle
          ? {
              ...currentVehicle,
              odometer: data.vehicle?.odometer ?? currentVehicle.odometer,
              engineHours:
                data.vehicle?.engineHours !== undefined
                  ? data.vehicle.engineHours
                  : currentVehicle.engineHours,
            }
          : currentVehicle
      );
      setIsEditingVehicleState(false);
      await Promise.all([loadNodeTree(), loadServiceEvents(), loadDashboardExpenses(), loadWishlist(), loadTopServiceNodes()]);
    } catch (saveError) {
      console.error(saveError);
      setVehicleStateError(
        saveError instanceof Error
          ? saveError.message
          : "Произошла ошибка при сохранении состояния."
      );
    } finally {
      setIsSavingVehicleState(false);
    }
  };

  const resetServiceEventForm = () => {
    setEditingServiceEventId(null);
    setPendingWishlistInstallItemId(null);
    setSelectedNodePath([]);
    const empty = createInitialAddServiceEventFormValues();
    empty.currency = readDefaultCurrencySetting();
    applyAddServiceEventFormValues(empty);
  };

  const openCreateServiceEventModal = () => {
    overlayReturnStackRef.current = [];
    resetServiceEventForm();
    setServiceEventFormError("");
    setIsAddServiceEventModalOpen(true);
  };
  const closeAddServiceEventModal = (options: { restorePrevious?: boolean } = {}) => {
    setIsAddServiceEventModalOpen(false);
    setPendingWishlistInstallItemId(null);
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };

  const handleSubmitServiceEvent = async () => {
    try {
      setServiceEventFormError("");

      if (!vehicleId) {
        setServiceEventFormError("Не удалось определить мотоцикл.");
        return;
      }

      const serviceFormValues: AddServiceEventFormValues = {
        nodeId: selectedFinalNode?.id ?? "",
        serviceType,
        eventDate,
        odometer,
        engineHours,
        costAmount,
        currency,
        comment,
        installedPartsJson,
        partSku,
        partName,
        installedExpenseItemIds: [],
      };

      const validation = validateAddServiceEventFormValues(serviceFormValues, {
        todayDateYmd: todayDate,
        currentVehicleOdometer: vehicle?.odometer ?? null,
        isLeafNode: selectedFinalNode ? isLeafNodeSelected : undefined,
      });

      if (validation.errors.length > 0) {
        setServiceEventFormError(validation.errors[0]);
        return;
      }

      setIsCreatingServiceEvent(true);
      if (editingServiceEventId) {
        await vehicleDetailApi.updateServiceEvent(
          vehicleId,
          editingServiceEventId,
          normalizeEditServiceEventPayload(serviceFormValues)
        );
      } else {
        await vehicleDetailApi.createServiceEvent(
          vehicleId,
          normalizeAddServiceEventPayload(serviceFormValues)
        );
      }

      if (!editingServiceEventId && pendingWishlistInstallItemId) {
        await vehicleDetailApi.updateWishlistItem(vehicleId, pendingWishlistInstallItemId, {
          status: "INSTALLED",
          nodeId: serviceFormValues.nodeId,
        });
        setWishlistNotice("Позиция отмечена как установленная после добавления события.");
      }

      setServiceLogActionNotice({
        tone: "success",
        title: editingServiceEventId
          ? "Сервисное событие обновлено"
          : "Сервисное событие добавлено",
        details: "Статусы и расходы обновлены",
      });
      setPendingWishlistInstallItemId(null);
      resetServiceEventForm();
      await Promise.all([loadServiceEvents(), loadDashboardExpenses(), loadNodeTree(), loadWishlist(), loadTopServiceNodes()]);
      closeAddServiceEventModal({ restorePrevious: false });
    } catch (createError) {
      console.error(createError);
      setServiceEventFormError("Не удалось сохранить сервисное событие.");
      setServiceLogActionNotice({
        tone: "error",
        title: "Не удалось сохранить сервисное событие",
      });
    } finally {
      setIsCreatingServiceEvent(false);
    }
  };

  const title =
    vehicle?.nickname ||
    `${vehicle?.brandName || ""} ${vehicle?.modelName || ""}`.trim() ||
    "Карточка мотоцикла";
  const vehicleHeader = vehicle ? buildVehicleHeaderProps(vehicle) : null;
  const detailViewModel = vehicleHeader?.detail ?? null;
  const vehicleStateViewModel = vehicle
    ? buildVehicleStateViewModel({
        odometer: vehicle.odometer,
        engineHours: vehicle.engineHours,
      })
    : null;
  const rideProfileViewModel = vehicle
    ? buildRideProfileViewModel(vehicle.rideProfile)
    : null;
  const technicalInfoViewModel = vehicle
    ? buildVehicleTechnicalInfoViewModel({ modelVariant: vehicle.modelVariant })
    : { items: [] };

  const showFullNodeTree = pageView === "nodeTree" || isFullNodeTreeOpen;

  function renderMainNodeTreeSection() {
    if (!vehicle) {
      return null;
    }
    return (
            <section
              className="node-tree-readable garage-dark-surface-text rounded-xl border p-3"
              style={{
                backgroundColor: productSemanticColors.card,
                borderColor: productSemanticColors.border,
                boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
                color: productSemanticColors.textPrimary,
              }}
            >
              {pageView !== "nodeTree" ? (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2
                    className="text-2xl font-semibold tracking-tight text-slate-100"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Состояние основных узлов
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsFullNodeTreeOpen((prev) => !prev)}
                    className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                      isFullNodeTreeOpen
                        ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                        : "border-slate-600 text-slate-100 hover:bg-slate-800"
                    }`}
                  >
                    {isFullNodeTreeOpen ? "Скрыть полное дерево" : "Все узлы →"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <h2
                    className="text-xl font-bold tracking-tight"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Дерево узлов
                  </h2>
                </div>
              )}
              <p className="mt-1 text-xs leading-5" style={{ color: productSemanticColors.textSecondary }}>
                {pageView === "nodeTree"
                  ? "Полная структура узлов мотоцикла, статус обслуживания и быстрые действия по каждому узлу."
                  : "Краткая сводка по основным узлам. Детальная структура доступна в полном дереве."}
              </p>

              {isTopServiceNodesLoading ? (
                <p className="mt-4 text-sm text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  Загрузка основных узлов...
                </p>
              ) : null}
              {!isTopServiceNodesLoading && topServiceNodesError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {topServiceNodesError}
                </p>
              ) : null}
              {pageView !== "nodeTree" &&
              !isTopServiceNodesLoading &&
              !topServiceNodesError &&
              topNodeOverviewCards.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topNodeOverviewCards.map((card) => (
                    <article
                      key={card.key}
                      className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3"
                      style={{
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTopOverviewIssueNodes(card.nodes.map((node) => node.id))}
                          className="inline-flex"
                          title="Показать узлы со статусом Скоро или Просрочено"
                          aria-label={`Показать проблемные узлы группы ${card.title}`}
                        >
                          <TopNodeOverviewIcon nodeKey={card.key} status={card.status} />
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900" style={{ color: productSemanticColors.textPrimary }}>
                          {card.title}
                        </h3>
                      </div>
                      <div className="mt-2">
                        <div className="space-y-2">
                          {card.nodes.map((node) => (
                            <button
                              key={node.code}
                              type="button"
                              onClick={() => openTopOverviewNode(node.id)}
                              className="inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                              style={getStatusBadgeStyle(node.status)}
                              title={`${node.name}: ${node.statusLabel}`}
                            >
                              <span className="truncate">
                                {node.name}
                              </span>
                            </button>
                          ))}
                        </div>
                        {card.nodes.length === 0 ? (
                          <p className="mt-2 text-xs text-gray-600" style={{ color: productSemanticColors.textMuted }}>
                            {card.details}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {showFullNodeTree && isNodeTreeLoading ? (
                <p className="mt-4 text-sm text-slate-300">Загрузка дерева узлов...</p>
              ) : null}

              {showFullNodeTree && !isNodeTreeLoading && nodeTreeError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : null}

              {showFullNodeTree && !isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  Дерево узлов пока не найдено.
                </p>
              ) : null}

              {showFullNodeTree && !isNodeTreeLoading && !nodeTreeError && nodeTree.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <label htmlFor="node-tree-search" className="sr-only">
                      Поиск
                    </label>
                    <div
                      className="flex h-7 min-w-[104px] max-w-[140px] flex-[1_1_124px] items-center gap-1.5 rounded-full border px-2"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: productSemanticColors.textMuted }}>
                        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                        <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <input
                        id="node-tree-search"
                        type="search"
                        value={nodeSearchQuery}
                        onChange={(event) => setNodeSearchQuery(event.target.value)}
                        placeholder=""
                        className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none"
                        style={{ color: productSemanticColors.textPrimary }}
                      />
                      <button
                        type="button"
                        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: productSemanticColors.border,
                          color: productSemanticColors.textMuted,
                        }}
                        aria-label="Настройки фильтра"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <line x1="1" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          <line x1="1" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          <circle cx="3.5" cy="3" r="1.2" fill="currentColor"/>
                          <circle cx="8.5" cy="6" r="1.2" fill="currentColor"/>
                          <circle cx="4.5" cy="9" r="1.2" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedNodes({})}
                      disabled={!hasExpandedNodeTreeItems}
                      title="Свернуть раскрытые ветки дерева"
                      className="h-7 shrink-0 rounded-full border px-2 text-[11px] font-extrabold transition disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textSecondary,
                        opacity: hasExpandedNodeTreeItems ? 1 : 0.45,
                      }}
                    >
                      Свернуть дерево
                    </button>
                    <button
                      type="button"
                      aria-pressed={nodeTreeTopOnly}
                      disabled={
                        isTopServiceNodesLoading || overviewTopNodeIdsOrderedForTree.length === 0
                      }
                      onClick={() => setNodeTreeTopOnly((prev) => !prev)}
                      title={
                        overviewTopNodeIdsOrderedForTree.length === 0
                          ? "Нет узлов из блока «Состояния узлов» в дереве"
                          : nodeTreeTopOnly
                            ? "Показать полное дерево"
                            : `До ${NODE_TREE_TOP_NODES_LIMIT} узлов из «Состояния узлов» и родители до корня`
                      }
                      className="h-7 shrink-0 rounded-full border px-2 text-[11px] font-extrabold transition disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: nodeTreeTopOnly
                          ? productSemanticColors.primaryAction
                          : productSemanticColors.cardSubtle,
                        borderColor: nodeTreeTopOnly
                          ? productSemanticColors.primaryAction
                          : productSemanticColors.borderStrong,
                        color: nodeTreeTopOnly
                          ? productSemanticColors.onPrimaryAction
                          : productSemanticColors.textSecondary,
                        opacity:
                          isTopServiceNodesLoading || overviewTopNodeIdsOrderedForTree.length === 0
                            ? 0.45
                            : 1,
                      }}
                    >
                      ТОП-узлы
                    </button>
                  </div>
                  {nodeSearchQuery.trim().length > 0 && nodeSearchQuery.trim().length < 2 ? (
                    <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                      Введите минимум 2 символа.
                    </p>
                  ) : null}
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNodeStatusFilter("ALL")}
                      className="h-7 shrink-0 rounded-full border px-2 text-[11px] font-extrabold transition"
                      style={{
                        backgroundColor: nodeStatusFilter === "ALL" ? productSemanticColors.primaryAction : productSemanticColors.cardSubtle,
                        borderColor: nodeStatusFilter === "ALL" ? productSemanticColors.primaryAction : productSemanticColors.borderStrong,
                        color: nodeStatusFilter === "ALL" ? productSemanticColors.onPrimaryAction : productSemanticColors.textSecondary,
                      }}
                    >
                      Все
                    </button>
                    {NODE_STATUS_FILTER_OPTIONS.map((status) => {
                      const tokens = statusSemanticTokens[status];
                      const isActive = nodeStatusFilter === status;
                      const chipLabel =
                        status === "RECENTLY_REPLACED" ? "Недавно" : statusTextLabelsRu[status];
                      const statusIcon =
                        status === "OK" ? (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="6" fill={tokens.foreground}/>
                            <path d="M4.5 7l2 2 3-3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : status === "SOON" ? (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" fill={tokens.foreground}/>
                            <path d="M7 5.5v2.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
                            <circle cx="7" cy="9.5" r="0.7" fill="#fff"/>
                          </svg>
                        ) : status === "OVERDUE" ? (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="6" fill={tokens.foreground}/>
                            <path d="M7 4v3.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
                            <circle cx="7" cy="9.5" r="0.7" fill="#fff"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="6" stroke={tokens.foreground} strokeWidth="1.4"/>
                            <path d="M4.5 7l2 2 3-3" stroke={tokens.foreground} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        );
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNodeStatusFilter(status)}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-extrabold transition"
                          style={{
                            backgroundColor: isActive ? tokens.background : productSemanticColors.cardSubtle,
                            borderColor: isActive ? productSemanticColors.primaryAction : productSemanticColors.borderStrong,
                            color: isActive ? tokens.foreground : productSemanticColors.textSecondary,
                          }}
                        >
                          {statusIcon}
                          {chipLabel}
                        </button>
                      );
                    })}
                  </div>
                  <div className="hidden flex-wrap items-center gap-2">
                    <p
                      className="sr-only text-xs font-medium uppercase tracking-wide text-slate-400"
                      style={{ color: productSemanticColors.textSecondary }}
                    >
                      Фильтр по статусу
                    </p>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNodeStatusFilter("ALL")}
                        className="rounded-lg border px-3 py-2 text-xs font-medium transition"
                        style={{
                          backgroundColor:
                            nodeStatusFilter === "ALL"
                              ? productSemanticColors.textPrimary
                              : productSemanticColors.cardMuted,
                          borderColor: productSemanticColors.borderStrong,
                          color:
                            nodeStatusFilter === "ALL"
                              ? productSemanticColors.textInverse
                              : productSemanticColors.textSecondary,
                        }}
                      >
                        Все
                      </button>
                      {NODE_STATUS_FILTER_OPTIONS.map((status) => {
                        const tokens = statusSemanticTokens[status];
                        const isActive = nodeStatusFilter === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setNodeStatusFilter(status)}
                            className="rounded-lg border px-3 py-2 text-xs font-medium transition"
                            style={{
                              backgroundColor: isActive
                                ? tokens.background
                                : productSemanticColors.cardMuted,
                              borderColor: isActive ? tokens.border : productSemanticColors.borderStrong,
                              color: isActive ? tokens.foreground : productSemanticColors.textSecondary,
                            }}
                          >
                            {statusTextLabelsRu[status]} · {nodeStatusCounts[status]}
                          </button>
                        );
                      })}
                      <label className="flex items-center gap-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                        Сезон расходов
                        <select
                          value={nodeExpenseYear}
                          onChange={(event) => setNodeExpenseYear(Number(event.target.value))}
                          className="rounded-full border px-3 py-1.5 text-xs font-medium"
                          style={{
                            backgroundColor: productSemanticColors.cardMuted,
                            borderColor: productSemanticColors.borderStrong,
                            color: productSemanticColors.textPrimary,
                            colorScheme: "dark",
                          }}
                        >
                          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {isNodeExpenseSummaryLoading ? (
                      <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                        Загружаю расходы по узлам...
                      </p>
                    ) : null}
                    {nodeExpenseSummaryError ? (
                      <p className="text-xs" style={{ color: productSemanticColors.error }}>
                        {nodeExpenseSummaryError}
                      </p>
                    ) : null}
                  </div>
                  {nodeSearchQuery.trim().length >= 2 ? (
                    nodeSearchResults.length > 0 ? (
                      <div
                        className="space-y-1.5 rounded-xl border p-2"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                          borderColor: productSemanticColors.border,
                        }}
                      >
                        {nodeSearchResults.map((result) => {
                          const resultNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
                          const canOpenResultExplanation =
                            Boolean(result.shortExplanationLabel) &&
                            (resultNode ? canOpenNodeStatusExplanationModal(resultNode) : false);
                          return (
                            <div
                              key={result.nodeId}
                              className="rounded-[10px] border px-2.5 py-2 transition hover:opacity-90"
                              style={{
                                backgroundColor: productSemanticColors.cardSubtle,
                                borderColor: productSemanticColors.border,
                              }}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => openSearchResultInNodeTree(result)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openSearchResultInNodeTree(result);
                                  }
                                }}
                                className="w-full text-left"
                              >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-100" style={{ color: productSemanticColors.textPrimary }}>{result.nodeName}</p>
                                  <p className="truncate text-[11px] text-slate-400" style={{ color: productSemanticColors.textSecondary }}>{result.pathLabel}</p>
                                  <p className="truncate text-[11px] text-slate-500" style={{ color: productSemanticColors.textMuted }}>{result.nodeCode}</p>
                                  {result.shortExplanationLabel ? (
                                    canOpenResultExplanation ? (
                                      <button
                                        type="button"
                                        className="block truncate pt-1 text-left text-[11px] text-slate-400 underline decoration-dotted underline-offset-2"
                                        style={{ color: productSemanticColors.textSecondary }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openStatusExplanationFromSearchResult(result);
                                        }}
                                      >
                                        {result.shortExplanationLabel}
                                      </button>
                                    ) : (
                                      <p className="truncate pt-1 text-[11px] text-slate-400" style={{ color: productSemanticColors.textSecondary }}>
                                        {result.shortExplanationLabel}
                                      </p>
                                    )
                                  ) : null}
                                </div>
                                {result.effectiveStatus ? (
                                  <span
                                    className="inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold leading-none"
                                    style={getStatusBadgeStyle(result.effectiveStatus)}
                                  >
                                    {result.statusLabel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {buildNodeSearchResultActions(result).map((action) => (
                                <div key={`${result.nodeId}.${action.key}`} className="group relative">
                                  <button
                                    type="button"
                                    onClick={() => handleSearchResultAction(action.key, result)}
                                    aria-label={`${action.label}: ${result.nodeName}`}
                                    title={action.label}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-600 text-slate-200 transition hover:bg-slate-800"
                                  >
                                    {action.key === "open" ? (
                                      <OpenContextIcon />
                                    ) : action.key === "service_log" ? (
                                      <ActionIcon iconKey="openServiceLog" />
                                    ) : (
                                      <ActionIcon iconKey="addToShoppingList" />
                                    )}
                                  </button>
                                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                    {action.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                      className="rounded-[10px] border border-dashed px-3 py-2 text-xs"
                        style={{
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        Узлы не найдены
                      </p>
                    )
                  ) : null}
                  {filteredTopLevelNodeViewModels.length === 0 ? (
                    <p
                      className="rounded-[10px] border border-dashed px-3 py-2 text-xs"
                      style={{
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textSecondary,
                      }}
                    >
                      Узлы с выбранным статусом не найдены.
                    </p>
                  ) : null}
                  <div
                    className="overflow-hidden rounded-xl border p-0.5"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.border,
                    }}
                  >
                    {filteredTopLevelNodeViewModels.map((rootNode, rootIndex) =>
                      renderChildTreeNode(
                        rootNode,
                        0,
                        rootIndex === filteredTopLevelNodeViewModels.length - 1
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </section>
    );
  }

  function renderNodeContextSidePanel() {
    if (!selectedNodeContextViewModel) {
      return (
        <aside
          className="garage-dark-surface-text rounded-xl border p-3.5"
          style={{
            backgroundColor: productSemanticColors.card,
            borderColor: productSemanticColors.border,
            boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
            color: productSemanticColors.textPrimary,
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMuted }}>
            Контекст узла
          </p>
          <h2 className="mt-2 text-lg font-semibold">Выберите узел</h2>
          <p className="mt-2 text-sm" style={{ color: productSemanticColors.textSecondary }}>
            Нажмите на строку дерева, чтобы открыть подробности, обслуживание, события и подбор деталей.
          </p>
        </aside>
      );
    }

    const selectedNodeContext = selectedNodeContextViewModel;
    const isSelectedNodeContextTopLevel =
      selectedNodeContextId != null &&
      topLevelNodeViewModels.some((n) => n.id === selectedNodeContextId);
    const subtreeCompositionItems = selectedNodeContextNode
      ? collectSubtreeDescendantItems(selectedNodeContextNode)
      : [];
    const showSubtreeCompositionSection =
      !selectedNodeContext.isLeaf && isSelectedNodeContextTopLevel;
    const selectedNodeFilterIds = selectedNodeContextRawNode
      ? new Set(createServiceLogNodeFilter(selectedNodeContextRawNode).nodeIds)
      : selectedNodeContextId
        ? new Set([selectedNodeContextId])
        : new Set<string>();
    const selectedUninstalledParts = wishlistActiveViewModels.filter(
      (item) => item.nodeId && selectedNodeFilterIds.has(item.nodeId)
    );
    const selectedNodeExpenseSummary = buildNodeContextExpenseSummary(
      selectedNodeContext.nodeId,
      nodeExpenseSummaryByNodeId,
      nodeExpenseYear
    );

    return (
      <NodeContextReferencePanel
        key={selectedNodeContext.nodeId}
        viewModel={selectedNodeContext}
        showSubtreeCompositionSection={showSubtreeCompositionSection}
        subtreeCompositionItems={subtreeCompositionItems}
        onSelectCompositionNode={(nodeId) => openNodeContextModal(nodeId)}
        isAddingCompatiblePart={Boolean(nodeContextAddingRecommendedSkuId)}
        isCompatiblePartLoading={nodeContextRecommendationsLoading}
        compatiblePartError={nodeContextRecommendationsError}
        recommendations={nodeContextRecommendations}
        serviceKits={nodeContextServiceKits}
        isServiceKitsLoading={nodeContextServiceKitsLoading}
        serviceKitsError={nodeContextServiceKitsError}
        addingServiceKitCode={nodeContextAddingKitCode}
        snoozeLabel={selectedNodeSnoozeLabel}
        canSnooze={canSnoozeSelectedNode}
        uninstalledParts={selectedUninstalledParts}
        totalUninstalledParts={selectedUninstalledParts.length}
        updatingWishlistItemId={wishlistStatusUpdatingId}
        onAddService={() => handleNodeContextAction("add_service_event")}
        onPickParts={() => handleNodeContextAction("add_wishlist")}
        onOpenAllEvents={() => {
          if (selectedNodeContextNode) {
            openServiceLogFilteredByNode(selectedNodeContextNode);
          }
        }}
        onOpenEvent={(eventId, eventNodeId) => {
          if (selectedNodeContextNode) {
            openServiceLogFilteredByNode(selectedNodeContextNode, eventId, eventNodeId);
          }
        }}
        onOpenStatusExplanation={() => handleNodeContextAction("open_status_explanation")}
        onOpenCompatiblePart={(rec) => {
          if (selectedNodeContextNode) {
            pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
            openWishlistModalForRecommendedSku(rec, selectedNodeContextNode.id);
          }
        }}
        onAddCompatiblePart={(rec) => void addRecommendedSkuToWishlistFromNodeContext(rec)}
        onOpenServiceKit={(kit) => {
          if (selectedNodeContextNode) {
            pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
            openWishlistModalForServiceKit(kit, selectedNodeContextNode.id);
          }
        }}
        onAddServiceKit={(kit) => void addServiceKitToWishlistFromNodeContext(kit)}
        onSnooze7Days={() => setNodeSnoozeOption(selectedNodeContext.nodeId, "7d")}
        onSnooze30Days={() => setNodeSnoozeOption(selectedNodeContext.nodeId, "30d")}
        onClearSnooze={() => setNodeSnoozeOption(selectedNodeContext.nodeId, "clear")}
        onOpenWishlistPart={(item) => {
          if (item.nodeId) {
            persistNodeTreeReturnState(item.nodeId);
          }
          const returnNodeId = item.nodeId || selectedNodeContext.nodeId;
          router.push(
            `/vehicles/${vehicleId}/parts?nodeId=${encodeURIComponent(returnNodeId)}&wishlistItemId=${encodeURIComponent(item.id)}`
          );
        }}
        onAdvanceWishlistPartStatus={(item) => {
          const nextStatus: PartWishlistItem["status"] =
            item.status === "NEEDED"
              ? "ORDERED"
              : item.status === "ORDERED"
              ? "BOUGHT"
              : "INSTALLED";
          void patchWishlistItemStatus(item.id, nextStatus, item.status);
        }}
        onOpenAllUninstalledParts={() => {
          persistNodeTreeReturnState(selectedNodeContext.nodeId);
          const selectedNodeHref = `/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(selectedNodeContext.nodeId)}`;
          window.history.replaceState(window.history.state, "", selectedNodeHref);
          router.push(`/vehicles/${vehicleId}/parts?nodeId=${encodeURIComponent(selectedNodeContext.nodeId)}`);
        }}
        nodeExpenseSummary={selectedNodeExpenseSummary}
        onOpenNodeExpenses={() => {
          router.push(
            `/vehicles/${vehicleId}/expenses?nodeId=${encodeURIComponent(selectedNodeContext.nodeId)}&year=${nodeExpenseYear}&returnNodeId=${encodeURIComponent(selectedNodeContext.nodeId)}`
          );
        }}
      />
    );

  }

  function renderPartsSelectionPage() {
    if (!vehicle || !vehicleStateViewModel) {
      return null;
    }
    const partsBackFallbackHref = targetNodeIdFromSearchParams
      ? `/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(targetNodeIdFromSearchParams)}`
      : `/vehicles/${vehicleId}`;
    const vehicleDisplayName = detailViewModel?.displayName ?? title;
    const vehicleYearOdometerLine = `${vehicle.year} · ${vehicleStateViewModel.odometerLabel}`;

    return (
      <PartsCartPage
        vehicleDisplayName={vehicleDisplayName}
        vehicleYearOdometerLine={vehicleYearOdometerLine}
        onNavigateBack={() => navigateBackWithFallback(partsBackFallbackHref)}
        nodeTree={nodeTree}
        vehicleId={vehicleId}
        wishlistNotice={wishlistNotice}
        isWishlistLoading={isWishlistLoading}
        wishlistError={wishlistError}
        onRetryWishlist={() => void loadWishlist()}
        wishlistViewModels={wishlistViewModels}
        filteredGroups={filteredPartsWishlistGroups}
        filteredViewModels={filteredPartsWishlistViewModels}
        partsStatusCounts={partsStatusCounts}
        partsStatusFilter={partsStatusFilter}
        onPartsStatusFilterChange={setPartsStatusFilter}
        partsSearchQuery={partsSearchQuery}
        onPartsSearchQueryChange={setPartsSearchQuery}
        collapsedPartsStatusGroups={collapsedPartsStatusGroups}
        onToggleCollapsedGroup={(status) =>
          setCollapsedPartsStatusGroups((prev) => ({
            ...prev,
            [status]: !prev[status],
          }))
        }
        onExpandCollapsedGroup={(status) =>
          setCollapsedPartsStatusGroups((prev) => ({
            ...prev,
            [status]: false,
          }))
        }
        partsVisibleCountByStatus={partsVisibleCountByStatus}
        onShowMoreInGroup={(status, increment) =>
          setPartsVisibleCountByStatus((prev) => ({
            ...prev,
            [status]: (prev[status] ?? PARTS_SELECTION_INITIAL_VISIBLE_COUNT) + increment,
          }))
        }
        normalizedPartsSearchQuery={normalizedPartsSearchQuery}
        selectedWishlistItemId={selectedPartsWishlistItemId}
        statusTransitionHistoryByItemId={wishlistStatusTransitionHistoryByItemId}
        onSelectWishlistItem={setSelectedPartsWishlistItemId}
        wishlistItems={wishlistItems}
        wishlistStatusUpdatingId={wishlistStatusUpdatingId}
        wishlistDeletingId={wishlistDeletingId}
        installedWishlistServiceEventIdByItemId={installedWishlistServiceEventIdByItemId}
        onPatchWishlistItemStatus={patchWishlistItemStatus}
        onOpenWishlistPurchaseExpense={openWishlistPurchaseExpenseForm}
        onOpenWishlistEdit={openWishlistModalForEdit}
        onDeleteWishlistItem={deleteWishlistItemById}
        onOpenWishlistCreate={() => openWishlistModalForCreate()}
        onOpenWishlistAddKit={() =>
          openWishlistModalForCreate(targetNodeIdFromSearchParams ?? undefined, "kits")
        }
        router={router}
        hasNodeFilter={Boolean(partsNodeFilterIds)}
        onClearNodeFilter={clearPartsNodeUrlFilter}
      />
    );
  }

  const selectedStatusExplanation = selectedStatusExplanationNode?.statusExplanation ?? null;
  const selectedStatusCurrent = selectedStatusExplanation?.current ?? null;
  const selectedStatusLastService = selectedStatusExplanation?.lastService ?? null;
  const selectedStatusRule = selectedStatusExplanation?.rule ?? null;
  const selectedStatusUsage = selectedStatusExplanation?.usage ?? null;
  const hasStatusKmDetails = [
    selectedStatusCurrent?.odometer,
    selectedStatusLastService?.odometer,
    selectedStatusRule?.intervalKm,
    selectedStatusRule?.warningKm,
    selectedStatusUsage?.elapsedKm,
    selectedStatusUsage?.remainingKm,
  ].some((value) => value != null);
  const hasStatusHoursDetails = [
    selectedStatusCurrent?.engineHours,
    selectedStatusLastService?.engineHours,
    selectedStatusRule?.intervalHours,
    selectedStatusRule?.warningHours,
    selectedStatusUsage?.elapsedHours,
    selectedStatusUsage?.remainingHours,
  ].some((value) => value != null);
  const hasStatusDaysDetails = [
    selectedStatusRule?.intervalDays,
    selectedStatusRule?.warningDays,
    selectedStatusUsage?.elapsedDays,
    selectedStatusUsage?.remainingDays,
  ].some((value) => value != null);
  const darkModalFormControlStyle = {
    backgroundColor: productSemanticColors.cardMuted,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
    colorScheme: "dark" as const,
  };
  const darkModalSectionStyle = {
    backgroundColor: productSemanticColors.cardMuted,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
  };
  const darkModalButtonStyle = {
    backgroundColor: productSemanticColors.cardSubtle,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
  };
  const darkModalInputLabelStyle = {
    color: productSemanticColors.textSecondary,
  };

  return (
    <>
      {wishlistPurchaseExpenseItemId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <section
            className="w-full max-w-lg rounded-3xl border p-5 shadow-2xl"
            style={{ backgroundColor: productSemanticColors.card, borderColor: productSemanticColors.borderStrong }}
          >
            <h2 className="text-xl font-bold" style={{ color: productSemanticColors.textPrimary }}>
              Отметить как куплено
            </h2>
            <p className="mt-2 text-sm" style={{ color: productSemanticColors.textSecondary }}>
              Создаём расход из позиции списка покупок. После сохранения он появится на странице расходов как куплено, но не установлено.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold" style={{ color: productSemanticColors.textSecondary }}>
                Сумма
                <input
                  value={wishlistPurchaseExpenseForm.amount}
                  onChange={(e) => setWishlistPurchaseExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  style={darkModalFormControlStyle}
                />
              </label>
              <label className="text-sm font-semibold" style={{ color: productSemanticColors.textSecondary }}>
                Валюта
                <input
                  value={wishlistPurchaseExpenseForm.currency}
                  onChange={(e) => setWishlistPurchaseExpenseForm((prev) => ({ ...prev, currency: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  style={darkModalFormControlStyle}
                />
              </label>
              <label className="text-sm font-semibold" style={{ color: productSemanticColors.textSecondary }}>
                Дата покупки
                <input
                  type="date"
                  value={wishlistPurchaseExpenseForm.purchasedAt}
                  onChange={(e) => setWishlistPurchaseExpenseForm((prev) => ({ ...prev, purchasedAt: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  style={darkModalFormControlStyle}
                />
              </label>
              <label className="text-sm font-semibold" style={{ color: productSemanticColors.textSecondary }}>
                Продавец
                <input
                  value={wishlistPurchaseExpenseForm.vendor}
                  onChange={(e) => setWishlistPurchaseExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  style={darkModalFormControlStyle}
                />
              </label>
              <label className="sm:col-span-2 text-sm font-semibold" style={{ color: productSemanticColors.textSecondary }}>
                Комментарий
                <textarea
                  value={wishlistPurchaseExpenseForm.comment}
                  onChange={(e) => setWishlistPurchaseExpenseForm((prev) => ({ ...prev, comment: e.target.value }))}
                  className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
                  style={darkModalFormControlStyle}
                />
              </label>
            </div>
            {wishlistPurchaseExpenseError ? (
              <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                {wishlistPurchaseExpenseError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeWishlistPurchaseExpenseForm}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                style={darkModalButtonStyle}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={submitWishlistPurchaseExpense}
                disabled={isWishlistPurchaseSaving}
                className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
                style={{ backgroundColor: productSemanticColors.primaryAction, color: productSemanticColors.onPrimaryAction }}
              >
                {isWishlistPurchaseSaving ? "Сохраняю..." : "Создать расход"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      <main
        style={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: productSemanticColors.canvas,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: `${sidebarCollapsed ? 64 : 204}px minmax(0, 1fr)`,
            alignItems: "start",
            transition: "grid-template-columns 0.18s ease",
          }}
        >
          <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          <section
            style={{
              display: "grid",
              gap: pageView === "partsSelection" ? 0 : 12,
              padding: pageView === "partsSelection" ? 0 : "10px 18px 24px 16px",
              maxWidth: pageView === "partsSelection" ? "none" : 1420,
              width: "100%",
              minWidth: 0,
              justifySelf: pageView === "partsSelection" ? "stretch" : "center",
              minHeight: pageView === "partsSelection" ? "100vh" : undefined,
              backgroundColor: pageView === "partsSelection" ? "#070B10" : undefined,
            }}
          >
            {isLoading ? (
              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${productSemanticColors.border}`,
                  backgroundColor: productSemanticColors.card,
                  padding: 28,
                  color: productSemanticColors.textMuted,
                  fontSize: 14,
                }}
              >
                Загрузка мотоцикла...
              </div>
            ) : null}

            {!isLoading && error ? (
              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${productSemanticColors.errorBorder}`,
                  backgroundColor: productSemanticColors.errorSurface,
                  padding: 28,
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    color: productSemanticColors.textPrimary,
                    fontSize: 28,
                    lineHeight: "36px",
                    fontWeight: 700,
                  }}
                >
                  Не удалось открыть мотоцикл
                </h1>
                <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                  {error}
                </p>
                <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                  ID: {vehicleId}
                </p>
              </div>
            ) : null}

            {!isLoading && !error && vehicle && pageView === "nodeTree" ? (
              <div style={{ display: "grid", gap: 10, padding: "0 8px" }}>
                <div className="flex h-8 items-center justify-between gap-3 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigateBackWithFallback(`/vehicles/${vehicleId}`)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] transition"
                      style={{ color: productSemanticColors.textSecondary }}
                      aria-label="Назад"
                    >
                      ←
                    </button>
                    <span>Гараж</span>
                    <span>/</span>
                    <span style={{ color: productSemanticColors.textPrimary }}>{vehicle.nickname || vehicle.modelName}</span>
                    <span>/</span>
                    <span>Дерево узлов</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="hidden h-8 min-w-[220px] items-center gap-2 rounded-[10px] border px-3 text-xs lg:flex"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textMuted,
                      }}
                    >
                      ⌕ <span>Поиск узла...</span><span className="ml-auto">⌘K</span>
                    </div>
                    <span>♡</span>
                    <span className="rounded-full px-2 py-1" style={{ backgroundColor: productSemanticColors.cardMuted, color: productSemanticColors.textPrimary }}>
                      AK
                    </span>
                  </div>
                </div>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    alignItems: "stretch",
                    minWidth: 0,
                    minHeight: 0,
                    height: "calc(100vh - 72px)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      minWidth: 0,
                      minHeight: 0,
                      overflowX: "hidden",
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {renderMainNodeTreeSection()}
                  </div>
                  <div
                    style={{
                      height: "100%",
                      minWidth: 0,
                      minHeight: 0,
                      overflowX: "hidden",
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {renderNodeContextSidePanel()}
                  </div>
                </div>
              </div>
            ) : null}

            {!isLoading && !error && vehicle && pageView === "partsSelection"
              ? renderPartsSelectionPage()
              : null}

            {!isLoading && !error && vehicle && pageView === "dashboard" ? (
              <div style={{ display: "grid", gap: 16 }}>
                <VehicleDashboard
                  vehicle={vehicle}
                  detailViewModel={detailViewModel}
                  vehicleStateViewModel={vehicleStateViewModel}
                  topNodeOverviewCards={topNodeOverviewCards}
                  attentionSummary={attentionSummary}
                  attentionItems={attentionSummary.items}
                  expenseItems={dashboardExpenses}
                  serviceEvents={serviceEvents}
                  wishlistItems={wishlistActiveViewModels}
                  isTopServiceNodesLoading={isTopServiceNodesLoading}
                  topServiceNodesError={topServiceNodesError}
                  isServiceEventsLoading={isServiceEventsLoading}
                  serviceEventsError={serviceEventsError}
                  isExpensesLoading={isDashboardExpensesLoading}
                  expensesError={dashboardExpensesError}
                  isWishlistLoading={isWishlistLoading}
                  wishlistError={wishlistError}
                  moveToTrashError={moveToTrashError}
                  onEditProfile={openEditProfileModal}
                  onMoveToTrash={() => void moveVehicleToTrash()}
                  onUpdateMileage={openVehicleStateEditor}
                  onAddService={openCreateServiceEventModal}
                  onAddExpense={() =>
                    router.push(`/vehicles/${vehicleId}/expenses`)
                  }
                  onOpenParts={() => router.push(`/vehicles/${vehicleId}/parts`)}
                  onOpenPartItem={(itemId) =>
                    router.push(`/vehicles/${vehicleId}/parts?wishlistItemId=${encodeURIComponent(itemId)}`)
                  }
                  onOpenAllNodes={() => {
                    router.push(`/vehicles/${vehicleId}/nodes`);
                  }}
                  onOpenNode={(nodeId) => {
                    router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
                  }}
                  onOpenNodeIssues={(nodeIds) => {
                    router.push(
                      `/vehicles/${vehicleId}/nodes?highlightIssueNodeIds=${encodeURIComponent(nodeIds.join(","))}`
                    );
                  }}
                  onOpenServiceLog={openServiceLogModalFull}
                  onOpenServiceLogEvent={(eventId) =>
                    router.push(
                      `/vehicles/${vehicleId}/service-log?serviceEventId=${encodeURIComponent(eventId)}`
                    )
                  }
                  onOpenExpenseDetails={() => router.push(`/vehicles/${vehicleId}/expenses`)}
                  onOpenAttentionItemService={openAddServiceFromAttentionItem}
                  onOpenAttentionItemLog={openServiceLogForAttentionItem}
                  onOpenAttentionItemParts={openWishlistFromAttentionItem}
                />

                {false ? (
                <section
                  style={{
                    borderRadius: 24,
                    border: `1px solid ${productSemanticColors.border}`,
                    backgroundColor: productSemanticColors.card,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsAdvancedDetailsOpen((prev) => !prev)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "18px 22px",
                      color: productSemanticColors.textPrimary,
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        Расширенные данные и рабочие панели
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: productSemanticColors.textMuted,
                          fontSize: 13,
                          lineHeight: "18px",
                        }}
                      >
                        Состояние, дерево узлов, список покупок и техническая сводка в одном
                        раскрываемом блоке.
                      </div>
                    </div>
                    <span
                      style={{
                        color: productSemanticColors.textSecondary,
                        fontSize: 22,
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {isAdvancedDetailsOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isAdvancedDetailsOpen ? (
                    <div
                      style={{
                        padding: 20,
                        borderTop: `1px solid ${productSemanticColors.border}`,
                        backgroundColor: productSemanticColors.cardSubtle,
                      }}
                    >
                      <div className="space-y-7">
            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="text-sm text-gray-500">
                {vehicle?.brandName ?? "—"} | {vehicle?.modelName ?? "—"}
              </div>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <h1 className="min-w-0 flex-1 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                  {detailViewModel?.displayName || title}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={openEditProfileModal}
                      title="Редактировать"
                      aria-label="Редактировать"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-900 transition hover:bg-gray-100"
                    >
                      <EditIcon />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      Редактировать
                    </span>
                  </div>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => void moveVehicleToTrash()}
                      disabled={isMovingToTrash}
                      title="На свалку"
                      aria-label="На свалку"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <TrashIcon />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      На свалку
                    </span>
                  </div>
                </div>
              </div>
              {moveToTrashError ? (
                <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                  {moveToTrashError}
                </p>
              ) : null}

              <p className="mt-3 text-base leading-7 text-gray-600">
                {(
                  detailViewModel?.yearVersionLine ||
                  `${vehicle?.year ?? "—"} · ${vehicle?.variantName ?? "—"}`
                ).replace(" · ", " | ")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateServiceEventModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Добавить ТО
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/vehicles/${vehicleId}/expenses`)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Добавить расход
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/vehicles/${vehicleId}/parts`)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Подобрать деталь
                </button>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <InfoCard label="Никнейм" value={vehicle?.nickname || "Не задан"} />
                <InfoCard label="VIN" value={vehicle?.vin || "Не указан"} />
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold tracking-tight text-gray-950">
                    Текущее состояние
                  </h2>
                  {!isEditingVehicleState ? (
                    <button
                      type="button"
                      onClick={openVehicleStateEditor}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                    >
                      Редактировать
                    </button>
                  ) : null}
                </div>

                {!isEditingVehicleState ? (
                  <div className="mt-4 grid gap-2.5 text-sm text-gray-700 sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-gray-950">
                        {vehicleStateViewModel?.odometerLabel || "Пробег"}:
                      </span>{" "}
                      {vehicleStateViewModel?.odometerValue || `${vehicle?.odometer ?? "—"} км`}
                    </div>
                    <div>
                      <span className="font-medium text-gray-950">
                        {vehicleStateViewModel?.engineHoursLabel || "Моточасы"}:
                      </span>{" "}
                      {vehicleStateViewModel?.engineHoursValue ||
                        (vehicle?.engineHours !== null && vehicle?.engineHours !== undefined
                          ? `${vehicle?.engineHours} ч`
                          : "Не указаны")}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputField label="Пробег, км">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={vehicleStateOdometer}
                          onChange={(event) =>
                            setVehicleStateOdometer(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          placeholder="Например, 15000"
                          disabled={isSavingVehicleState}
                        />
                      </InputField>

                      <InputField label="Моточасы">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={vehicleStateEngineHours}
                          onChange={(event) =>
                            setVehicleStateEngineHours(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          placeholder="Пусто = не указаны"
                          disabled={isSavingVehicleState}
                        />
                      </InputField>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={saveVehicleState}
                        disabled={isSavingVehicleState}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingVehicleState ? "Сохраняем..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelVehicleStateEditor}
                        disabled={isSavingVehicleState}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Отмена
                      </button>
                    </div>

                    {vehicleStateError ? (
                      <p className="text-sm" style={{ color: productSemanticColors.error }}>
                        {vehicleStateError}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-7 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsUsageProfileSectionExpanded((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-left"
                      aria-expanded={isUsageProfileSectionExpanded}
                    >
                      <h2 className="text-base font-semibold tracking-tight text-gray-950">
                        Профиль эксплуатации
                      </h2>
                      <span className="text-sm text-gray-500" aria-hidden>
                        {isUsageProfileSectionExpanded ? "▾" : "▸"}
                      </span>
                    </button>
                  </div>

                  {isUsageProfileSectionExpanded ? (
                    rideProfileViewModel ? (
                      <div className="mt-4 space-y-2.5 text-sm leading-6 text-gray-700">
                        <div>
                          <span className="font-medium text-gray-950">
                            Сценарий:
                          </span>{" "}
                          {rideProfileViewModel?.usageType ?? "—"}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">Стиль:</span>{" "}
                          {rideProfileViewModel?.ridingStyle ?? "—"}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Нагрузка:
                          </span>{" "}
                          {rideProfileViewModel?.loadType ?? "—"}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Интенсивность:
                          </span>{" "}
                          {rideProfileViewModel?.usageIntensity ?? "—"}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-gray-600">
                        Профиль эксплуатации пока не задан.
                      </p>
                    )
                  ) : null}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() => setIsTechnicalSummarySectionExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-left"
                    aria-expanded={isTechnicalSummarySectionExpanded}
                  >
                    <h2 className="text-base font-semibold tracking-tight text-gray-950">
                      Техническая сводка
                    </h2>
                    <span className="text-sm text-gray-500" aria-hidden>
                      {isTechnicalSummarySectionExpanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {isTechnicalSummarySectionExpanded ? (
                    <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                      {technicalInfoViewModel.items.map((item) => (
                        <SpecCard key={item.key} label={item.label} value={item.value} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Что нужно купить
                </h2>
                <button
                  type="button"
                  onClick={() => openWishlistModalForCreate()}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Добавить
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Запчасти и расходники к покупке (без каталога и магазинов). Активный список
                без отдельной вкладки «Установленные»: установленные позиции сохраняются в журнале
                обслуживания после создания сервисного события.
              </p>
              {isWishlistLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка списка…</p>
              ) : null}
              {wishlistError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {wishlistError}
                </p>
              ) : null}
              {wishlistNotice ? (
                <p
                  className={`mt-3 text-sm ${
                    wishlistNotice.startsWith("Ошибка:")
                      ? "text-red-700"
                      : wishlistNotice.includes("не открыто")
                        ? "text-amber-800"
                        : "text-emerald-800"
                  }`}
                  role="status"
                >
                  {wishlistNotice}
                </p>
              ) : null}
              {!isWishlistLoading &&
              !wishlistError &&
              wishlistItems.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">Пока нет позиций.</p>
              ) : null}
              {!isWishlistLoading &&
              !wishlistError &&
              wishlistItems.length > 0 &&
              wishlistActiveViewModels.length === 0 ? (
                <div className="mt-4 space-y-1">
                  <p className="text-sm font-medium text-gray-900">Список покупок пуст</p>
                  <p className="text-sm text-gray-600">Все позиции установлены.</p>
                  <p className="text-xs text-gray-500">
                    Установленные позиции сохраняются в журнале обслуживания после создания
                    сервисного события.
                  </p>
                </div>
              ) : null}
              {!isWishlistLoading && wishlistGroups.length > 0 ? (
                <div className="mt-5 space-y-6">
                  {wishlistGroups.map((group) => (
                    <div key={group.status}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {group.sectionTitleRu}
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {group.items.map((it) => (
                          <li
                            key={it.id}
                            className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-950">{it.title}</p>
                                {it.sku ? (
                                  <div className="mt-1 rounded-lg border border-gray-100 bg-white/80 px-2 py-1.5">
                                    <p className="text-xs font-medium text-gray-800">
                                      {getWishlistItemSkuDisplayLines(it.sku).primaryLine}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {getWishlistItemSkuDisplayLines(it.sku).secondaryLine}
                                    </p>
                                  </div>
                                ) : null}
                                <p className="mt-0.5 text-xs text-gray-600">
                                  Кол-во: {it.quantity}
                                  {it.node ? ` · Узел: ${it.node.name}` : ""}
                                </p>
                                {it.costLabelRu ? (
                                  <p className="mt-0.5 text-xs text-gray-600">
                                    Стоимость: {it.costLabelRu}
                                  </p>
                                ) : null}
                                {it.kitOriginLabelRu ? (
                                  <p className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                    {it.kitOriginLabelRu}
                                  </p>
                                ) : null}
                                {it.commentBodyRu ? (
                                  <p className="mt-1 text-xs text-gray-600">{it.commentBodyRu}</p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-1">
                                <label className="sr-only" htmlFor={`wishlist-status-${it.id}`}>
                                  Статус позиции
                                </label>
                                <select
                                  id={`wishlist-status-${it.id}`}
                                  value={it.status}
                                  onChange={(e) =>
                                    patchWishlistItemStatus(
                                      it.id,
                                      e.target.value as PartWishlistItem["status"],
                                      it.status
                                    )
                                  }
                                  disabled={wishlistStatusUpdatingId === it.id}
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs disabled:cursor-wait disabled:opacity-60"
                                  aria-label="Статус позиции"
                                  title={
                                    it.node
                                      ? "Сменить статус позиции"
                                      : "Для смены статуса нужно выбрать конечный узел"
                                  }
                                >
                                  {PART_WISHLIST_STATUS_ORDER.map((s) => (
                                    <option key={s} value={s}>
                                      {partWishlistStatusLabelsRu[s]}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const raw = wishlistItems.find((w) => w.id === it.id);
                                    if (raw) {
                                      openWishlistModalForEdit(raw);
                                    }
                                  }}
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-800 transition hover:bg-white"
                                >
                                  Изменить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteWishlistItemById(it.id)}
                                  disabled={wishlistDeletingId === it.id}
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                                >
                                  {wishlistDeletingId === it.id ? "Удаляем..." : "Удалить"}
                                </button>
                              </div>
                            </div>
                            {wishlistStatusUpdatingId === it.id ? (
                              <p className="mt-2 text-xs text-gray-500" role="status">
                                Обновляем статус...
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {renderMainNodeTreeSection()}
                      </div>
                    </div>
                  ) : null}
                </section>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {isExpenseDetailsModalOpen ? (
        <div className="fixed inset-0 z-[55] flex items-start justify-center bg-black/45 px-4 py-6 sm:items-center">
          <div className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Расходы на обслуживание
              </h2>
              <button
                type="button"
                onClick={() => setIsExpenseDetailsModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <p className="text-xs text-gray-500">
                Сводка по полям стоимости в сервисных записях. Валюты не суммируются между
                собой.
              </p>

              {isServiceEventsLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка данных журнала…</p>
              ) : serviceEventsError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  Не удалось загрузить расходы: проверьте журнал обслуживания.
                </p>
              ) : expenseSummary.paidEventCount === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">Расходы пока не указаны</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Добавьте сумму и валюту при создании сервисного события — здесь появятся
                    итоги по каждой валюте и за текущий месяц.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div>
                      <span className="text-gray-500">Записей с суммой</span>
                      <p className="font-semibold text-gray-950">{expenseSummary.paidEventCount}</p>
                    </div>
                    {expenseSummary.latestPaidEvent ? (
                      <div className="min-w-0 flex-1">
                        <span className="text-gray-500">Последняя оплаченная</span>
                        <p className="font-medium text-gray-950">
                          {formatIsoCalendarDateRu(expenseSummary.latestPaidEvent.eventDate)} ·{" "}
                          {expenseSummary.latestPaidEvent.serviceType}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatExpenseAmountRu(expenseSummary.latestPaidEvent.totalAmount)}{" "}
                          {expenseSummary.latestPaidEvent.currency} ·{" "}
                          {expenseSummary.latestPaidEvent.nodeLabel}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Всего по валютам
                    </p>
                    <ul className="mt-2 space-y-1">
                      {expenseSummary.totalsByCurrency.map((row) => (
                        <li key={row.currency} className="flex justify-between gap-4 text-gray-900">
                          <span>{row.currency}</span>
                          <span className="font-medium tabular-nums">
                            {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              ({row.paidEventCount} {row.paidEventCount === 1 ? "запись" : "записей"})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {expenseSummary.currentMonthTotalsByCurrency.length > 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-600">
                        Текущий месяц ({expenseSummary.currentMonthLabel})
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {expenseSummary.currentMonthTotalsByCurrency.map((row) => (
                          <li key={row.currency} className="flex justify-between text-sm text-gray-900">
                            <span>{row.currency}</span>
                            <span className="font-medium tabular-nums">
                              {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      В {expenseSummary.currentMonthLabel} платных сервисных записей пока нет.
                    </p>
                  )}

                  {expenseSummary.byMonth.length > 1 ? (
                    <details className="rounded-lg border border-gray-100 bg-white">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700">
                        По месяцам ({expenseSummary.byMonth.length})
                      </summary>
                      <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600">
                        <ul className="space-y-2">
                          {expenseSummary.byMonth.slice(0, 6).map((m) => (
                            <li key={m.monthKey}>
                              <span className="font-medium text-gray-800">{m.monthLabel}</span>
                              <span className="text-gray-600">
                                {" "}
                                —{" "}
                                {m.totalsByCurrency
                                  .map((t) => `${formatExpenseAmountRu(t.totalAmount)} ${t.currency}`)
                                  .join(" · ")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isAddServiceEventModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-2 py-2"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text flex w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
              maxHeight: "calc(100dvh - 16px)",
              minHeight: 0,
            }}
          >
            <div
              className="flex items-center justify-between border-b border-gray-200 px-4 py-2"
              style={{
                backgroundColor: productSemanticColors.card,
                borderBottomColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              <h2
                className="text-lg font-semibold tracking-tight"
                style={{ color: productSemanticColors.textPrimary }}
              >
                {editingServiceEventId
                  ? "Редактировать сервисное событие"
                  : "Добавить сервисное событие"}
              </h2>
              <button
                type="button"
                onClick={() => closeAddServiceEventModal()}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                style={darkModalButtonStyle}
              >
                Закрыть
              </button>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
              style={{
                backgroundColor: productSemanticColors.card,
                color: productSemanticColors.textPrimary,
              }}
            >
              <div className="space-y-2">
                <div
                  className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2"
                  style={darkModalSectionStyle}
                >
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Выбор узла
                  </h3>
                  <div className="mt-1 flex flex-wrap items-end gap-1.5">
                    {nodeSelectLevels.map((nodesAtLevel, levelIndex) => (
                      <div
                        key={`level-${levelIndex}`}
                        className="min-w-[140px] flex-1"
                      >
                        <label
                          className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide"
                          style={{ color: productSemanticColors.textSecondary }}
                        >
                          {`Уровень ${levelIndex + 1}`}
                        </label>
                        <select
                          value={selectedNodePath[levelIndex] ?? ""}
                          onChange={(event) => {
                            const nextNodeId = event.target.value;
                            setSelectedNodePath((prev) => {
                              const next = prev.slice(0, levelIndex);
                              if (nextNodeId) {
                                next[levelIndex] = nextNodeId;
                              }
                              return next;
                            });
                          }}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                          style={darkModalFormControlStyle}
                        >
                          <option value="">{`Уровень ${levelIndex + 1}`}</option>
                          {nodesAtLevel.map((nodeAtLevel) => (
                            <option key={nodeAtLevel.id} value={nodeAtLevel.id}>
                              {nodeAtLevel.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                  style={darkModalSectionStyle}
                >
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Данные события
                  </h3>
                  <div className="mt-1 grid gap-x-2.5 gap-y-1.5 sm:grid-cols-2">
                    <InputField label="Тип сервиса" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={serviceType}
                        onChange={(event) => setServiceType(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Например: Oil change"
                      />
                    </InputField>

                    <InputField label="Дата события" labelStyle={darkModalInputLabelStyle}>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        max={todayDate}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                      />
                    </InputField>

                    <InputField label="Пробег, км" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={odometer}
                        onChange={(event) => setOdometer(event.target.value)}
                        inputMode="numeric"
                        max={vehicle?.odometer ?? undefined}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Например: 15000"
                      />
                    </InputField>

                    <InputField label="Моточасы" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={engineHours}
                        onChange={(event) => setEngineHours(event.target.value)}
                        inputMode="numeric"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Если применимо"
                      />
                    </InputField>

                    <InputField label="Стоимость" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={costAmount}
                        onChange={(event) => setCostAmount(event.target.value)}
                        inputMode="decimal"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Например: 120.5"
                      />
                    </InputField>

                    <InputField label="Валюта" labelStyle={darkModalInputLabelStyle}>
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                      >
                        <option value="">Не выбрана</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </InputField>
                  </div>

                  <div className="mt-2 grid gap-x-2.5 gap-y-1.5 sm:grid-cols-2">
                    <InputField label="Артикул (SKU)" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={partSku}
                        onChange={(event) => setPartSku(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Опционально"
                        maxLength={200}
                        autoComplete="off"
                      />
                    </InputField>
                    <InputField label="Наименование запчасти" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={partName}
                        onChange={(event) => setPartName(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Опционально"
                        maxLength={500}
                      />
                    </InputField>
                  </div>

                  {partSku.trim().length >= 2 ? (
                    <div
                      className="mt-1.5 rounded-xl border px-3 py-2"
                      style={{
                        borderColor: productSemanticColors.borderStrong,
                        backgroundColor: productSemanticColors.cardSubtle,
                      }}
                    >
                      <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                        Поиск в каталоге по артикулу
                      </p>
                      {serviceEventSkuLoading ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                          Ищем совпадения...
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && serviceEventSkuError ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
                          {serviceEventSkuError}
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading &&
                      !serviceEventSkuError &&
                      serviceEventSkuResults.length === 0 ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                          Ничего не найдено.
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && serviceEventSkuResults.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {serviceEventSkuResults.map((sku) => {
                            const partNumber = sku.partNumbers[0]?.number?.trim() ?? "";
                            return (
                              <button
                                key={sku.id}
                                type="button"
                                onClick={() => {
                                  setPartSku(partNumber || partSku.trim());
                                  setPartName(sku.canonicalName?.trim() || partName);
                                }}
                                className="w-full rounded-lg border px-2.5 py-2 text-left text-xs transition hover:opacity-90"
                                style={{
                                  borderColor: productSemanticColors.borderStrong,
                                  backgroundColor: productSemanticColors.cardMuted,
                                  color: productSemanticColors.textPrimary,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{partNumber || "Без артикула"}</div>
                                <div style={{ color: productSemanticColors.textSecondary }}>
                                  {sku.brandName} · {sku.canonicalName}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-2">
                    <InputField label="Комментарий" labelStyle={darkModalInputLabelStyle}>
                      <textarea
                        ref={serviceEventCommentTextareaRef}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        className="min-h-16 w-full resize-none overflow-hidden rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Опционально"
                      />
                    </InputField>
                  </div>
                </div>

                <div
                  className="sticky bottom-0 border-t border-gray-100 py-2"
                  style={{
                    backgroundColor: productSemanticColors.card,
                    borderTopColor: productSemanticColors.borderStrong,
                  }}
                >
                <button
                  type="button"
                  onClick={handleSubmitServiceEvent}
                  disabled={
                    isCreatingServiceEvent ||
                    !isLeafNodeSelected ||
                    !eventDate
                  }
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-gray-950 px-4 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: productSemanticColors.primaryAction,
                    color: productSemanticColors.onPrimaryAction,
                  }}
                >
                  {isCreatingServiceEvent
                    ? "Сохраняем..."
                    : editingServiceEventId
                      ? "Сохранить изменения"
                      : "Добавить событие"}
                </button>

                {!isLeafNodeSelected && selectedFinalNode ? (
                  <p className="mt-3 text-sm" style={{ color: statusSemanticTokens.SOON.foreground }}>
                    Для создания события выберите узел последнего уровня.
                  </p>
                ) : null}

                {serviceEventFormError ? (
                  <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                    {serviceEventFormError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      <PartPickerShell
        key={wishlistModalNonce}
        isOpen={isWishlistModalOpen}
        initialTab={wishlistPickerInitialTab}
        title={wishlistEditingId ? "Позиция списка" : "Новая позиция"}
        onClose={() => closeWishlistModal()}
        vehicleLabel={detailViewModel?.displayName ?? title}
        wishlistForm={wishlistForm}
        setWishlistForm={setWishlistForm}
        wishlistNodeOptions={wishlistNodeOptions}
        wishlistNodeRequiredError={wishlistNodeRequiredError}
        wishlistEditingId={wishlistEditingId}
        wishlistEditingSourceItem={wishlistEditingSourceItem}
        wishlistSkuQuery={wishlistSkuQuery}
        setWishlistSkuQuery={setWishlistSkuQuery}
        wishlistSkuResults={wishlistSkuResults}
        wishlistSkuLoading={wishlistSkuLoading}
        wishlistSkuFetchError={wishlistSkuFetchError}
        wishlistSkuPickedPreview={wishlistSkuPickedPreview}
        setWishlistSkuPickedPreview={setWishlistSkuPickedPreview}
        wishlistRecommendationsLoading={wishlistRecommendationsLoading}
        wishlistRecommendationsError={wishlistRecommendationsError}
        wishlistRecommendationGroups={wishlistRecommendationGroups}
        onAddRecommendedSku={(rec) => void addRecommendedSkuToWishlist(rec)}
        wishlistAddingRecommendedSkuId={wishlistAddingRecommendedSkuId}
        wishlistServiceKitsLoading={wishlistServiceKitsLoading}
        wishlistServiceKitsError={wishlistServiceKitsError}
        visibleWishlistServiceKits={visibleWishlistServiceKits}
        serviceKitPreviewByCode={serviceKitPreviewByCode}
        wishlistSelectedKitCode={wishlistSelectedKitCode}
        setWishlistSelectedKitCode={setWishlistSelectedKitCode}
        onAddServiceKit={(kit) => void addServiceKitToWishlist(kit)}
        wishlistAddingKitCode={wishlistAddingKitCode}
        wishlistFormError={wishlistFormError}
        onSubmit={() => void submitWishlistForm()}
        isWishlistSaving={isWishlistSaving}
      />

      {selectedStatusExplanationNode && selectedStatusExplanation ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{
                backgroundColor: productSemanticColors.card,
                borderBottomColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              <h2
                className="text-xl font-semibold tracking-tight"
                style={{ color: productSemanticColors.textPrimary }}
              >
                Пояснение расчета: {selectedStatusExplanationNode.name}
              </h2>
              <button
                type="button"
                onClick={() => closeStatusExplanationModal()}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-sm font-medium transition"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Закрыть
              </button>
            </div>

            <div
              className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6 text-sm"
              style={{
                backgroundColor: productSemanticColors.card,
                color: productSemanticColors.textSecondary,
              }}
            >
              {selectedStatusExplanation.reasonShort ? (
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                >
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    Кратко
                  </div>
                  <div
                    className="mt-1 font-medium"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    {selectedStatusExplanation.reasonShort}
                  </div>
                </div>
              ) : null}

              {selectedStatusExplanation.reasonDetailed ? (
                <div>
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    Подробно
                  </div>
                  <p className="mt-1" style={{ color: productSemanticColors.textSecondary }}>
                    {selectedStatusExplanation.reasonDetailed}
                  </p>
                </div>
              ) : null}

              {selectedStatusExplanation.triggeredBy ? (
                <div>
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    Сработавшее измерение
                  </div>
                  <p className="mt-1" style={{ color: productSemanticColors.textSecondary }}>
                    {getStatusExplanationTriggeredByLabel(
                      selectedStatusExplanation.triggeredBy
                    )}
                  </p>
                </div>
              ) : null}

              <div>
                <div
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: productSemanticColors.textMuted }}
                >
                  Детали расчета
                </div>
                <div
                  className="mt-2 overflow-x-auto rounded-xl border"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textSecondary,
                  }}
                >
                  <table
                    className="min-w-full text-left text-xs"
                    style={{ color: productSemanticColors.textSecondary }}
                  >
                    <thead
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        color: productSemanticColors.textMuted,
                      }}
                    >
                      <tr>
                        <th className="px-3 py-2 font-medium">Параметр</th>
                        <th className="px-3 py-2 font-medium">Текущее</th>
                        <th className="px-3 py-2 font-medium">Последний сервис</th>
                        <th className="px-3 py-2 font-medium">Интервал</th>
                        <th className="px-3 py-2 font-medium">Warning</th>
                        <th className="px-3 py-2 font-medium">Использовано</th>
                        <th className="px-3 py-2 font-medium">Осталось</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasStatusKmDetails ? (
                        <tr className="border-t border-slate-700">
                          <td className="px-3 py-2 font-medium text-slate-100">Пробег</td>
                          <td className="px-3 py-2">
                            {selectedStatusCurrent?.odometer != null
                              ? `${selectedStatusCurrent.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusLastService?.odometer != null
                              ? `${selectedStatusLastService.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.intervalKm != null
                              ? `${selectedStatusRule.intervalKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.warningKm != null
                              ? `${selectedStatusRule.warningKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.elapsedKm != null
                              ? `${selectedStatusUsage.elapsedKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.remainingKm != null
                              ? `${selectedStatusUsage.remainingKm} км`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {hasStatusHoursDetails ? (
                        <tr className="border-t border-slate-700">
                          <td className="px-3 py-2 font-medium text-slate-100">Моточасы</td>
                          <td className="px-3 py-2">
                            {selectedStatusCurrent?.engineHours != null
                              ? `${selectedStatusCurrent.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusLastService?.engineHours != null
                              ? `${selectedStatusLastService.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.intervalHours != null
                              ? `${selectedStatusRule.intervalHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.warningHours != null
                              ? `${selectedStatusRule.warningHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.elapsedHours != null
                              ? `${selectedStatusUsage.elapsedHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.remainingHours != null
                              ? `${selectedStatusUsage.remainingHours} ч`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {hasStatusDaysDetails ? (
                        <tr className="border-t border-slate-700">
                          <td className="px-3 py-2 font-medium text-slate-100">Время</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.intervalDays != null
                              ? `${selectedStatusRule.intervalDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.warningDays != null
                              ? `${selectedStatusRule.warningDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.elapsedDays != null
                              ? `${selectedStatusUsage.elapsedDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.remainingDays != null
                              ? `${selectedStatusUsage.remainingDays} дн`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      <tr className="border-t border-slate-700">
                        <td className="px-3 py-2 font-medium text-slate-100">Дата расчета</td>
                        <td className="px-3 py-2">
                          {selectedStatusCurrent?.date
                            ? formatIsoCalendarDateRu(selectedStatusCurrent.date)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {selectedStatusLastService?.eventDate
                            ? formatIsoCalendarDateRu(selectedStatusLastService.eventDate)
                            : "—"}
                        </td>
                        <td className="px-3 py-2" colSpan={4}>
                          Trigger mode:{" "}
                          {selectedStatusExplanation.triggerMode || "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEditProfileModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Редактировать мотоцикл
              </h2>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                disabled={isSavingProfile}
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <p className="mb-3 text-sm text-gray-500">
                Пробег и моточасы обновляются через действие «Обновить состояние».
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Название в гараже">
                  <input
                    value={profileForm.nickname}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, nickname: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Например: Мой GS"
                    disabled={isSavingProfile}
                  />
                </InputField>

                <InputField label="VIN">
                  <input
                    value={profileForm.vin}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, vin: event.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Опционально"
                    disabled={isSavingProfile}
                  />
                </InputField>

                <InputField label="Сценарий эксплуатации">
                  <select
                    value={profileForm.usageType}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        usageType: event.target.value as EditVehicleProfileFormValues["usageType"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_USAGE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Стиль езды">
                  <select
                    value={profileForm.ridingStyle}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        ridingStyle: event.target.value as EditVehicleProfileFormValues["ridingStyle"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_RIDING_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Нагрузка">
                  <select
                    value={profileForm.loadType}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        loadType: event.target.value as EditVehicleProfileFormValues["loadType"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_LOAD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Интенсивность">
                  <select
                    value={profileForm.usageIntensity}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        usageIntensity: event.target
                          .value as EditVehicleProfileFormValues["usageIntensity"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_USAGE_INTENSITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={saveVehicleProfile}
                  disabled={isSavingProfile}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-950 px-6 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? "Сохраняем..." : "Сохранить профиль"}
                </button>

                {profileFormError ? (
                  <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                    {profileFormError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {serviceLogActionNotice ? (
        <div
          className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow"
          style={{
            backgroundColor:
              serviceLogActionNotice.tone === "success"
                ? productSemanticColors.successSurface
                : productSemanticColors.errorSurface,
            borderColor:
              serviceLogActionNotice.tone === "success"
                ? productSemanticColors.successBorder
                : productSemanticColors.errorBorder,
            color:
              serviceLogActionNotice.tone === "success"
                ? productSemanticColors.successText
                : productSemanticColors.error,
          }}
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{serviceLogActionNotice.title}</p>
            {serviceLogActionNotice.details ? (
              <p className="mt-0.5 text-xs opacity-85">{serviceLogActionNotice.details}</p>
            ) : null}
          </div>
          {serviceLogActionNotice.tone === "success" ? (
            <button
              type="button"
              onClick={() => {
                setServiceLogActionNotice(null);
                openServiceLogModalFull();
              }}
              className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-85"
              style={{
                borderColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              В журнал
            </button>
          ) : null}
        </div>
      ) : null}
      {profileFormSuccess ? (
        <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow">
          {profileFormSuccess}
        </div>
      ) : null}
    </>
  );
}

function InputField({
  label,
  children,
  labelStyle,
}: {
  label: string;
  children: ReactNode;
  labelStyle?: CSSProperties;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium text-gray-900" style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-950">{value}</div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Редактировать</title>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Удалить</title>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function ActionIcon({
  iconKey,
  className = "h-4 w-4",
}: {
  iconKey: ActionIconKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ACTION_SVG_BODIES[iconKey] }}
    />
  );
}

function OpenContextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v7h-7" />
      <path d="M3 10V3h7" />
      <path d="M3 21l8-8" />
    </svg>
  );
}

function TopNodeOverviewIcon({
  nodeKey,
  status,
}: {
  nodeKey: TopNodeOverviewCard["key"];
  status: NodeStatus | null;
}) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center"
      style={{
        color: tokens.foreground,
      }}
    >
      <TopNodeIcon iconKey={nodeKey} size={22} />
    </span>
  );
}


function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-950">{value}</div>
    </div>
  );
}


function getStatusBadgeStyle(status: NodeStatus | null) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return {
    borderColor: tokens.border,
    backgroundColor: tokens.background,
    color: tokens.foreground,
  };
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
