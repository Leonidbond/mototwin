export {
  buildTopNodeOverviewCards,
  buildTopNodeProfileGroups,
  resolveEditableFavoriteNodeCodes,
} from "./top-node-overview";
export type { TopNodeProfileGroup, TopNodeProfileGroupNode } from "./top-node-overview";
export {
  buildNodeContextPathLabel,
  buildNodeContextViewModel,
  getNodeContextActions,
  getRecentServiceEventsForNode,
} from "./node-context";
export {
  getNodeStatusPriority,
  getNodeStatusLabel,
  compareNodeStatuses,
  getTopNodeStatusBadgeLabel,
  getStatusExplanationTriggeredByLabel,
} from "./status";
export {
  flattenNodeTreeToSelectOptions,
  flattenNodeTreeForSelection,
  findNodeTreeItemById,
  findNodePathById,
  nodeAncestorPathLabelRu,
  getNodePathById,
  getNodeSelectLevels,
  getAvailableChildrenForSelectedPath,
  getSelectedNodeFromPath,
  getLeafStatusReasonShort,
  getNodeShortExplanationLabel,
  getNodeTreeItemReasonShortLine,
  isLeafNode,
  getLeafNodeOptions,
  getTopLevelNodes,
  getProblematicNodes,
  getTopLevelNodeTreeItems,
  getNodeSubtreeById,
} from "./node-tree";
export { formatNodeBadgeSingleLine, getNodeTightUiDisplayName } from "./node-tight-ui-name";
export {
  buildNodeTreeItemViewModel,
  buildNodeTreeViewModel,
  canOpenNodeStatusExplanationModal,
  getNodePathItemViewModels,
  getNodePathItemViewModelsByNodeId,
} from "./node-tree-view-models";
export {
  buildTopLevelNodeSummaryViewModel,
  buildNodeSubtreeModalViewModel,
} from "./node-tree-subtree-view-models";
export {
  buildNodeSearchResultActions,
  buildNodePathLabel,
  getAncestorIdsForNode,
  isNodeSearchBuyActionAvailable,
  getTopLevelAncestorForNode,
  searchNodeTree,
} from "./node-tree-search";
export {
  NODE_PICKER_OTHER_GROUP_KEY,
  groupNodePickerOptionsByTopLevel,
  nodePickerGroupHeadingRu,
  nodePickerTopGroupKeyFromPathLabel,
  type NodePickerGroupableOption,
} from "./node-picker-grouping";
export {
  buildNodeMaintenancePlanSummary,
  buildNodeMaintenancePlanViewModel,
  getNodeMaintenanceDueText,
  getNodeMaintenancePlanShortText,
} from "./node-maintenance-plan";
export {
  DEFAULT_SERVICE_LOG_SORT_STATE,
  filterAndSortServiceEvents,
  filterServiceLogEntries,
  applyServiceLogFilters,
  sortServiceLogEntries,
  groupServiceEventsByMonth,
  getStateUpdateSummary,
  getMonthlyCostLabel,
  isServiceLogTimelineQueryActive,
  isPaidServiceEvent,
  filterPaidServiceEvents,
  buildPaidEventsServiceLogFilter,
} from "./service-log";
export {
  getDescendantLeafNodeIds,
  getNodeAndDescendantIds,
  createServiceLogNodeFilter,
  applyServiceLogNodeFilter,
} from "./service-log-node-filter";
export {
  filterPaidServiceExpenseEvents,
  buildExpenseAnalyticsFromItems,
  buildExpenseCategoryDonutSegmentsForExpenses,
  buildVehicleDashboardExpensesViewModel,
  buildVehicleDashboardExpensesViewModelFromAnalytics,
  formatExpenseTotalsByCurrency,
  expenseCategoryLabelsRu,
  expenseInstallStatusLabelsRu,
  groupExpensesByCurrency,
  groupExpensesByMonth,
  groupExpensesByCalendarYear,
  groupExpensesByNode,
  buildExpenseSummaryFromServiceEvents,
  formatExpenseAmountRu,
  partSkuListPriceToBundlePartCostInput,
  stripLocaleMoneyGroupingSeparators,
  parseExpenseAmountInputToNumberOrNull,
  getCurrentExpenseYear,
  getExpenseCategoryLabelRu,
  getExpenseInstallStatusLabelRu,
  getExpenseYearDateRange,
  getCurrentExpenseMonthKey,
  parseExpenseMonthKey,
  formatExpenseMonthLabelRu,
  getExpenseMonthDateRange,
  addMonthsToExpenseMonthKey,
  filterEventsByExpenseMonth,
  getExpenseMonthKeyFromIso,
  getExpenseMonthMeta,
} from "./expense-summary";
export type { VehicleDashboardExpensesViewModel } from "./expense-summary";
export {
  SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS,
  buildStateUpdateDisplayViewModel,
  buildServiceLogEntryViewModel,
  buildServiceLogMonthlySummary,
  formatEngineHoursValue,
  formatIsoCalendarDateRu,
  formatOdometerValue,
  formatStateValueChange,
  getServiceLogEventKindBadgeLabel,
  groupServiceLogByMonth,
  buildServiceLogTimelineViewModel,
  resolvePrimaryCatalogNodeForServiceLogIcon,
  SERVICE_LOG_JOURNAL_LEADING_ICON_PX,
  SERVICE_LOG_DETAIL_LEADING_ICON_PX,
} from "./service-log-view-models";
export {
  buildYandexMapsUrlForInstallLocation,
  canOpenServiceInstallLocationOnMap,
  getServiceInstallLocationAddress,
  type ServiceInstallLocationFields,
} from "./install-location";
export {
  buildVehicleSummaryViewModel,
  buildVehicleDetailViewModel,
  buildVehicleStateViewModel,
  buildRideProfileViewModel,
  buildVehicleTechnicalInfoViewModel,
  vehicleDetailFromApiRecord,
} from "./vehicle-view-models";
export {
  calculateTrashExpiresAt,
  getTrashDaysRemaining,
  formatTrashRetentionLabel,
  isVehicleTrashed,
  buildTrashedVehicleViewModel,
} from "./vehicle-trash";
export {
  RIDE_USAGE_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
} from "./ride-profile-form-options";
export type {
  VehicleOdometerStateForServiceEvent,
  CreateInitialRepeatServiceEventValuesOptions,
  MergeServiceBundleTemplateResult,
  MergeWishlistItemIntoAddFormValuesOptions,
  RemoveWishlistItemFromAddFormValuesOptions,
  AddServiceEventCostBreakdownLines,
} from "./forms";
export {
  getTodayDateYmdLocal,
  DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
  buildAddServiceEventCostBreakdownLines,
  ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH,
  ADD_SERVICE_EVENT_SERVICE_NOTE_MAX_LENGTH,
  SERVICE_ACTION_TYPE_OPTIONS,
  SERVICE_EVENT_MODE_LABELS_RU,
  getServiceActionTypeLabelRu,
  getServiceEventModeLabelRu,
  mapServiceTypeStringToActionType,
  createEmptyBundleItemFormValues,
  mergeServiceBundleTemplateIntoAddFormValues,
  getServiceEventTemplateForNode,
  createInitialAddServiceEventFromNode,
  buildAddServiceEventCommentFromWishlistItem,
  buildWishlistInstalledPartsJsonString,
  buildWishlistInstalledPartsJsonFromItems,
  mergeActiveWishlistItemsIntoAddFormValues,
  mergeWishlistItemIntoAddFormValues,
  removeWishlistItemFromAddFormValues,
  removeBundleRowByNodeId,
  revertExpenseInstallFormPatch,
  applyExpenseInstallToAddFormRow,
  createInitialAddServiceEventFromWishlistItem,
  createInitialEditServiceEventValues,
  createInitialRepeatServiceEventValues,
  createInitialAddServiceEventFormValues,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  validateAddServiceEventFormValues,
  validateAddServiceEventFormValuesMobile,
  createInitialVehicleStateFormValues,
  normalizeVehicleStatePayload,
  validateVehicleStateFormValues,
  createInitialEditVehicleProfileFormValues,
  buildInitialVehicleProfileFormValues,
  normalizeEditVehicleProfilePayload,
  normalizeVehicleProfileFormValues,
  validateEditVehicleProfileFormValues,
  validateVehicleProfileFormValues,
  createInitialAddMotorcycleFormValues,
  normalizeAddMotorcyclePayload,
  validateAddMotorcycleFormValues,
} from "./forms";
export {
  SERVICE_EVENT_TEMPLATE_SELECT_SYSTEM_PREFIX,
  SERVICE_EVENT_TEMPLATE_SELECT_USER_PREFIX,
  buildUserServiceEventTemplateTitle,
  stripAddServiceEventFormValuesForUserTemplate,
  addServiceEventFormValuesFromUserTemplateJson,
} from "./user-service-event-form-template";
export {
  USER_SERVICE_KIT_CODE_PREFIX,
  isUserServiceKitCode,
  buildUserServiceKitCode,
  parseUserServiceKitTemplateId,
  advancedFormToSyntheticServiceKitDefinition,
  filterUserTemplateKitsByContextNode,
  inferKitItemPartBinding,
  wishlistRowsToAdvancedFormForTemplate,
  advancedServiceKitSnapshotFromPickerLines,
} from "./user-template-service-kit";
export type { NodeRefLite, WishlistKitTemplateSourceMeta, WishlistRowSnapshotInput } from "./user-template-service-kit";
export {
  buildGarageCardProps,
  filterMeaningfulGarageSpecHighlights,
  buildVehicleHeaderProps,
  buildVehicleStateSectionProps,
  buildNodeTreeSectionProps,
  buildServiceLogTimelineProps,
} from "./component-contract-props";
export { calculateGarageScore } from "./garage-score";
export { buildGarageDashboardSummary } from "./garage-dashboard";
export {
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER_LOCAL_SETTINGS,
  getUserSettingsStorageKey,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
  getDefaultCurrencyFromSettings,
  getDefaultSnoozeDaysFromSettings,
  getVehicleTrashRetentionDaysFromSettings,
  mergeUserSettings,
  mergeUserLocalSettings,
  normalizeUserSettings,
  normalizeUserLocalSettings,
  validateUserSettings,
} from "./user-settings";
export {
  getDevUserOptions,
  isDevUserSwitcherEnabled,
  isDevLoginEnabled,
  normalizeDevUserEmail,
} from "./dev-user";
export {
  buildAttentionActionViewModel,
  buildAttentionSummaryFromNodeTree,
  filterAttentionItemsBySnooze,
  getAttentionSnoozeFilterLabel,
  getAttentionActionSeverity,
  getAttentionItemsFromNodeTree,
  getAttentionNodesFromNodeTree,
  getWorstAttentionStatus,
  groupAttentionItemsByStatus,
  sortAttentionItemsByPriority,
} from "./attention";
export {
  calculateSnoozeUntilDate,
  isNodeSnoozed,
  formatSnoozeUntilLabel,
} from "./node-snooze";
export {
  buildGarageAttentionIndicatorViewModel,
  getAttentionSeverityFromStatuses,
} from "./garage-attention";
export {
  PART_WISHLIST_STATUS_ORDER,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
  WISHLIST_KIT_ORIGIN_PREFIX_RU,
  WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU,
  WISHLIST_INSTALL_SERVICE_TYPE_RU,
  buildPartWishlistItemViewModel,
  wishlistLineTotalAmount,
  wishlistQuantityForLine,
  createInitialPartWishlistFormValues,
  filterActiveWishlistItems,
  getPartWishlistStatusLabelRu,
  groupPartWishlistItemsByStatus,
  isActiveWishlistItem,
  isPartWishlistItemStatus,
  isLikelyWishlistInstallServiceEvent,
  getWishlistItemIdsFromInstalledPartsJson,
  getWishlistItemIdFromInstalledPartsJson,
  parseWishlistInstalledPartsRecordsOrdered,
  resolveWishlistItemIdForServiceBundleItem,
  type WishlistInstalledPartsRecord,
  type ServiceBundleItemWishlistMatchInput,
  isWishlistItemFromKitByComment,
  isWishlistTransitionToInstalled,
  extractWishlistKitOriginLabel,
  parseWishlistKitOriginDetails,
  normalizeCreatePartWishlistPayload,
  normalizePartWishlistCostMutationArgs,
  normalizeUpdatePartWishlistPayload,
  partWishlistFormValuesFromItem,
  partWishlistStatusLabelsRu,
  stripWishlistKitOriginFromComment,
  validatePartWishlistFormValues,
  applyPartSkuViewModelToPartWishlistFormValues,
  clearPartWishlistFormSkuSelection,
} from "./part-wishlist";
export {
  buildPartsCartSummary,
  type CartSummaryMetric,
  type PartsCartSummary,
} from "./parts-cart-summary";
export {
  normalizePartMasterBrand,
  normalizePartMasterSku,
  buildPartMasterIdentity,
  resolvePartMasterSkuLabel,
} from "./part-master-normalize";
export {
  normalizePartNumber,
  getSkuDisplayPrice,
  buildPartSkuLabel,
  buildWishlistItemSkuInfo,
  buildPartSkuViewModel,
  applySkuDefaultsToWishlistDraft,
  formatWishlistItemSkuSecondaryLineRu,
  formatPartSkuSearchResultMetaLineRu,
  getWishlistItemSkuDisplayLines,
  getPartSkuViewModelDisplayLines,
} from "./part-catalog";
export {
  getPickerFitmentShortLabelRu,
  getPickerSkuCatalogFitHintRu,
  getPickerSkuCatalogConfidencePercent,
  getPickerRecommendationStatsLineRu,
  getPickerSkuSearchStatsLineRu,
  formatFitmentConfidenceStatusRu,
} from "./picker-fitment-labels";
export {
  analyzeStructuredCatalogSignals,
  type StructuredCatalogSignals,
} from "./part-compatibility-catalog";
export {
  fitmentReportResultHeadlineRu,
  compatibilityConfidenceTierLabelRu,
  COMPATIBILITY_CONFIDENCE_TOOLTIP_LINES_RU,
  deriveCompatibilityConfidenceTier,
  deriveDominantFitmentResult,
  buildCompatibilityBreakdown,
  deriveSourcePriority,
} from "./part-compatibility-report-logic";
export {
  ownerCountLabelRu,
  installationStatusLabelRu,
  sourcePriorityVariantLabelRu,
  trustBadgeShortRu,
  evidenceTypeShortRu,
  verdictSupportParagraphsRu,
  isBrakesSafetyContext,
  fitmentReportResultLabelRu,
} from "./part-compatibility-report-labels";
export {
  buildRideProfileCompatibilityInsight,
  parseVehicleRideProfileSnapshot,
} from "./part-compatibility-ride-profile";
export {
  buildWishlistDetailCompatibilitySummary,
  type WishlistDetailCompatibilitySummary,
} from "./wishlist-detail-compatibility";
export {
  PART_RECOMMENDATION_GROUP_ORDER,
  buildPartRecommendationGroupsForDisplay,
  buildPartRecommendationExplanation,
  buildPartRecommendationViewModel,
  classifyPartRecommendation,
  getPartRecommendationGroupTitle,
  getPartRecommendationLabel,
  getPartRecommendationWhyText,
  getPartRecommendationWarningLabel,
  getPartRecommendationWarningLabelForType,
  getPartRecommendationWarningText,
  groupPartRecommendationsByType,
  sortPartRecommendationGroups,
  sortPartRecommendations,
  sortPartRecommendationsWithinGroup,
} from "./part-recommendation";
export {
  computeFitmentConfidenceState,
  type PublishedReportStats,
  type VoteStats,
} from "./fitment-confidence-recalc";
export {
  mergeCommunityFitmentIntoRecommendation,
  compareRecommendationsWithCommunity,
  recommendationTypeRank,
  isSafetyCriticalNodeContext,
  type CommunityFitmentMergeInput,
} from "./part-recommendation-merge";
export {
  SERVICE_KIT_DEFINITIONS,
  buildServiceKitPreview,
  buildServiceKitViewModel,
  chooseBestSkuForKitItem,
  expandServiceKitToWishlistDrafts,
  getServiceKitPreviewItemStatusLabel,
  getServiceKitsForNode,
  isDuplicateActiveWishlistItem,
  normalizeWishlistTitle,
} from "./service-kits";

export {
  resolveGarageVehicleSilhouette,
  getVehicleSilhouetteClassLabel,
} from "./vehicle-silhouette";

export {
  MERCHANDISE_LABELS_RU,
  classifyRecommendationsForPicker,
} from "./picker-merchandising";
export {
  getServiceKitTagRu,
  getServiceKitTagLabelRu,
} from "./service-kit-tags";
export {
  formatRideStyleChipRu,
  formatRideStyleChipLabelRu,
} from "./ride-style-chip";
export {
  buildWhyMatchesReasons,
  type WhyMatchesInput,
} from "./picker-why-matches";
export {
  createEmptyDraftCart,
  addSkuToDraft,
  addKitToDraft,
  updateSkuDraftItemQuantity,
  removeFromDraft,
  clearDraft,
  isDraftEmpty,
  isKitInDraft,
  getDraftTotals,
  buildPickerSubmitPreview,
  arePickerQuantityResolutionsComplete,
  computePickerSubmitWishlistPieceDelta,
  computePickerSubmitPriceEstimate,
  type AddSkuToDraftInput,
  type AddKitToDraftInput,
  type BuildPickerSubmitPreviewInput,
} from "./picker-draft-cart";
export {
  PICKER_MODAL_TOP_NODES_LIMIT,
  getOrderedTopNodeIdsPresentInNodeTree,
  filterLeafOptionsUnderTopNodeAncestors,
} from "./picker-top-nodes";
export { normalizePowerToHp } from "./motorcycle-power";
