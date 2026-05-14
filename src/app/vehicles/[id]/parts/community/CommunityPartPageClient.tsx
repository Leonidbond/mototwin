"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  filterLeafOptionsUnderTopNodeAncestors,
  formatRideStyleChipRu,
  getLeafNodeOptions,
  getOrderedTopNodeIdsPresentInNodeTree,
  nodeAncestorPathLabelRu,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  vehicleDetailFromApiRecord,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  GarageVehicleItem,
  NodeTreeItem,
  PartRecommendationViewModel,
  TopServiceNodeItem,
  VehicleDetail,
  VehicleDetailApiRecord,
  VehicleRideProfile,
} from "@mototwin/types";
import { SidebarVehiclePlaque } from "@/app/garage/_components/SidebarVehiclePlaque";
import { NodePickerModal } from "@/app/vehicles/[id]/_components/node-picker/NodePickerModal";
import type { NodePickerOption } from "@/app/vehicles/[id]/parts/picker/_components/NodePickerPopover";
import { pickerColors } from "@/app/vehicles/[id]/parts/picker/_components/picker-styles";
import { getNodeTreeIconWebSrc } from "@/node-tree-icons";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

/** Визуальные токены под референс `images/examples/add-part.png`. */
const REF = {
  overlay: "rgba(0,0,0,0.78)",
  modalBg: "#121418",
  panelBorder: "#252A34",
  cardBg: "#1A1F28",
  dashed: "#3D4656",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  subtle: "#6B7280",
  stepBlue: "#2563EB",
  stepBlueSoft: "rgba(37,99,235,0.15)",
  greenHint: "#34D399",
  warnBorder: "#D4A017",
  warnBg: "rgba(212,160,23,0.12)",
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  onPrimary: "#FFFFFF",
  error: "#F87171",
  radiusLg: 14,
  radiusMd: 10,
} as const;

/** Общая рамка интерактивных плашек контекста (мото / узел). */
const CONTEXT_ROW_TILE_BASE: CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: "6px 8px",
  boxSizing: "border-box",
  width: "100%",
};

const NODE_CONTEXT_PLATE_BUTTON: CSSProperties = {
  ...CONTEXT_ROW_TILE_BASE,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "center",
  alignSelf: "stretch",
  height: "100%",
  minHeight: 0,
  cursor: "pointer",
  textAlign: "center",
  fontFamily: "inherit",
  color: REF.text,
  WebkitTapHighlightColor: "transparent",
  appearance: "none",
  WebkitAppearance: "none",
};

const CONTEXT_GRID_CELL: CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignSelf: "stretch",
};

type PartLifeStatus = "plan" | "purchased" | "installed" | "rejected";

type FitmentChoiceInstalled =
  | "DIRECT_FIT"
  | "FIT_WITH_MODIFICATION"
  | "PARTIAL_FIT"
  | "OEM_REPLACEMENT";

const MOD_MAX = 500;
const COMMENT_MAX = 1000;
const LAST_VIEWED_VEHICLE_ID_STORAGE_KEY = "mototwin.lastViewedVehicleId";

function formatKmRuPlaque(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function isSafetyCriticalNodeCode(code: string | undefined): boolean {
  if (!code) return false;
  const u = code.toUpperCase();
  if (u.includes("BRAKE") || u.includes("SUSPENSION") || u.includes("SHOCK") || u.includes("FORK")) {
    return true;
  }
  if (u.startsWith("ENGINE.") || u.includes(".ENGINE.")) {
    return true;
  }
  return false;
}

function isValidHttpUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function iconWrap(size: number, children: ReactNode): ReactNode {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

/** Иконка в мягком квадрате — как на `images/examples/add-part.png`. */
function contextIconWell(children: ReactNode, opts?: { box?: number; radius?: number }): ReactNode {
  const box = opts?.box ?? 32;
  const radius = opts?.radius ?? 8;
  return (
    <div
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        backgroundColor: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

const IcoGear = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      stroke={REF.muted}
      strokeWidth="1.5"
    />
    <path
      d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 012.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 012.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9c.26.604.852.997 1.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.55 1z"
      stroke={REF.muted}
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

const IcoUsers = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
      stroke={REF.muted}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcoCart = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 6h15l-1.5 10H8L6 3H3"
      stroke={active ? REF.onPrimary : REF.muted}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="20" r="1.3" fill={active ? REF.onPrimary : REF.muted} />
    <circle cx="17" cy="20" r="1.3" fill={active ? REF.onPrimary : REF.muted} />
  </svg>
);

const IcoBox = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
      stroke={active ? REF.onPrimary : REF.muted}
      strokeWidth="1.5"
    />
    <path d="M3.27 6.96L12 12.01l8.73-5.05" stroke={active ? REF.onPrimary : REF.muted} strokeWidth="1.4" />
  </svg>
);

const IcoWrench = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      stroke={active ? REF.onPrimary : REF.muted}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IcoX = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke={active ? REF.onPrimary : "#EF4444"} strokeWidth="1.5" />
    <path d="M9 9l6 6M15 9l-6 6" stroke={active ? REF.onPrimary : "#EF4444"} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const IcoSearch = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.35 }}>
    <circle cx="11" cy="11" r="7" stroke={REF.muted} strokeWidth="1.5" />
    <path d="M16.5 16.5L21 21" stroke={REF.muted} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IcoCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoGearSm = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="3" stroke="#F97316" strokeWidth="1.6" />
    <path
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke="#F97316"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);
const IcoHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="#EAB308" strokeWidth="1.5" />
    <path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 1.8-2.5 3.5" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="17" r="0.9" fill="#EAB308" />
  </svg>
);
const IcoOem = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="9" cy="12" r="3" stroke="#38BDF8" strokeWidth="1.5" />
    <circle cx="15" cy="12" r="3" stroke="#38BDF8" strokeWidth="1.5" />
  </svg>
);
const IcoBan = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.5" />
    <path d="M9 9l6 6M15 9l-6 6" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IcoCamera = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
      stroke={REF.subtle}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.5" stroke={REF.subtle} strokeWidth="1.4" />
  </svg>
);

const IcoReceipt = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M7 3h10v18l-2-1.5L12 21l-3 1.5L7 21V3z" stroke={REF.subtle} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M9 8h6M9 12h6M9 16h4" stroke={REF.subtle} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IcoShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={REF.warnBorder} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          backgroundColor: REF.stepBlueSoft,
          color: REF.stepBlue,
          fontWeight: 800,
          fontSize: 15,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 17, fontWeight: 700, color: REF.text, letterSpacing: -0.2 }}>{title}</span>
    </div>
  );
}

function cardShell(extra?: CSSProperties): CSSProperties {
  return {
    backgroundColor: REF.cardBg,
    border: `1px solid ${REF.panelBorder}`,
    borderRadius: REF.radiusLg,
    padding: 16,
    boxSizing: "border-box",
    ...extra,
  };
}

/** Компактные плашки контекста под шапкой — плотнее `cardShell` шагов формы. */
function contextPlateShell(extra?: CSSProperties): CSSProperties {
  return {
    backgroundColor: REF.cardBg,
    border: `1px solid ${REF.panelBorder}`,
    borderRadius: 10,
    padding: "8px 10px",
    boxSizing: "border-box",
    ...extra,
  };
}

function contextPlateButtonStyle(extra?: CSSProperties): CSSProperties {
  return {
    ...contextPlateShell({
      display: "flex",
      gap: 10,
      alignItems: "center",
      width: "100%",
      margin: 0,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      color: REF.text,
      WebkitTapHighlightColor: "transparent",
    }),
    ...extra,
  };
}

export function CommunityPartPageClient(props: {
  vehicleId: string;
  initialNodeId: string;
  /** Предзаполнение с страницы отчёта совместимости (`?partMasterId=…`). */
  initialPartFromQuery?: {
    id: string;
    brandName: string;
    sku: string;
    title: string;
    suggestedCategory: string;
  } | null;
}) {
  const router = useRouter();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const u = () => setIsNarrow(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [vehicleError, setVehicleError] = useState("");
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(props.initialNodeId.trim());
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleItem[]>([]);

  const ip = props.initialPartFromQuery ?? null;
  const [brandName, setBrandName] = useState(() => ip?.brandName ?? "");
  const [sku, setSku] = useState(() => ip?.sku ?? "");
  const [title, setTitle] = useState(() => ip?.title ?? "");
  const [category, setCategory] = useState(() => ip?.suggestedCategory ?? "");
  const [existingMasterId, setExistingMasterId] = useState<string | null>(() => ip?.id ?? null);

  const [dupLoading, setDupLoading] = useState(false);
  const [dupCandidates, setDupCandidates] = useState<
    Array<{ id: string; brandName: string; sku: string; title: string }>
  >([]);

  const [recs, setRecs] = useState<PartRecommendationViewModel[]>([]);

  const [lifeStatus, setLifeStatus] = useState<PartLifeStatus>("plan");
  const [fitmentChoice, setFitmentChoice] = useState<FitmentChoiceInstalled>("DIRECT_FIT");
  const [modificationDetails, setModificationDetails] = useState("");

  const [reportRideProfile, setReportRideProfile] = useState<VehicleRideProfile>({
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
  });

  const [photoPackagingUrl, setPhotoPackagingUrl] = useState("");
  const [photoInstalledUrl, setPhotoInstalledUrl] = useState("");
  const [photoReceiptUrl, setPhotoReceiptUrl] = useState("");
  const [comment, setComment] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!vehicle) return;
    if (vehicle.rideProfile) {
      setReportRideProfile({
        usageType: vehicle.rideProfile.usageType,
        ridingStyle: vehicle.rideProfile.ridingStyle,
        loadType: vehicle.rideProfile.loadType,
        usageIntensity: vehicle.rideProfile.usageIntensity,
      });
    } else {
      setReportRideProfile({
        usageType: "MIXED",
        ridingStyle: "ACTIVE",
        loadType: "SOLO",
        usageIntensity: "MEDIUM",
      });
    }
  }, [vehicle]);

  useEffect(() => {
    let c = false;
    (async () => {
      setVehicleError("");
      try {
        const res = await fetch(`/api/vehicles/${encodeURIComponent(props.vehicleId)}`);
        const json = (await res.json()) as { vehicle?: VehicleDetailApiRecord; error?: string };
        if (!res.ok) {
          if (!c) setVehicleError(json.error || "Не удалось загрузить мотоцикл");
          return;
        }
        if (json.vehicle && !c) {
          setVehicle(vehicleDetailFromApiRecord(json.vehicle));
        }
      } catch {
        if (!c) setVehicleError("Сеть недоступна");
      }
    })();
    return () => {
      c = true;
    };
  }, [props.vehicleId]);

  useEffect(() => {
    let cancelled = false;
    void api.getGarageVehicles().then((res) => {
      if (!cancelled) {
        setGarageVehicles(res.vehicles ?? []);
      }
    }).catch(() => {
      if (!cancelled) {
        setGarageVehicles([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setNodeTreeError("");
      try {
        const data = await api.getNodeTree(props.vehicleId);
        if (!c) setNodeTree(data.nodeTree ?? []);
      } catch (e) {
        if (!c) {
          setNodeTree([]);
          setNodeTreeError(e instanceof Error ? e.message : "Не удалось загрузить узлы");
        }
      }
    })();
    return () => {
      c = true;
    };
  }, [props.vehicleId]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const data = await api.getTopServiceNodes();
        if (!c) setTopServiceNodes(data.nodes ?? []);
      } catch {
        if (!c) setTopServiceNodes([]);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    const leaves = getLeafNodeOptions(nodeTree);
    const leafIds = new Set(leaves.map((l) => l.id));
    if (selectedNodeId && !leafIds.has(selectedNodeId)) {
      setSelectedNodeId("");
    }
  }, [nodeTree, selectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId || !props.vehicleId) {
      setRecs([]);
      return;
    }
    let c = false;
    (async () => {
      try {
        const data = await api.getRecommendedSkusForNode(props.vehicleId, selectedNodeId);
        if (!c) setRecs(data.recommendations ?? []);
      } catch {
        if (!c) setRecs([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [props.vehicleId, selectedNodeId]);

  useEffect(() => {
    if (dupTimer.current) clearTimeout(dupTimer.current);
    const b = brandName.trim();
    const s = sku.trim();
    if (b.length < 1 || s.length < 1) {
      setDupCandidates([]);
      return;
    }
    dupTimer.current = setTimeout(() => {
      void (async () => {
        setDupLoading(true);
        try {
          const qs = new URLSearchParams({ brandName: b, sku: s });
          const res = await fetch(`/api/part-masters/duplicates?${qs.toString()}`);
          const json = (await res.json()) as {
            candidates?: Array<{ id: string; brandName: string; sku: string; title: string }>;
          };
          if (res.ok && json.candidates) {
            setDupCandidates(json.candidates);
          } else {
            setDupCandidates([]);
          }
        } catch {
          setDupCandidates([]);
        } finally {
          setDupLoading(false);
        }
      })();
    }, 420);
    return () => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
  }, [brandName, sku]);

  const leafPickerOptions: NodePickerOption[] = useMemo(() => {
    const leaves = getLeafNodeOptions(nodeTree);
    return leaves.map((opt) => ({
      id: opt.id,
      code: opt.code,
      name: opt.name,
      pathLabel: nodeAncestorPathLabelRu(nodeTree, opt.id),
    }));
  }, [nodeTree]);

  const orderedTopNodeIdsForPicker = useMemo(
    () => getOrderedTopNodeIdsPresentInNodeTree(nodeTree, topServiceNodes),
    [nodeTree, topServiceNodes]
  );

  const leafPickerOptionsTopOnly = useMemo(
    () => filterLeafOptionsUnderTopNodeAncestors(nodeTree, leafPickerOptions, orderedTopNodeIdsForPicker),
    [nodeTree, leafPickerOptions, orderedTopNodeIdsForPicker]
  );

  const selectedLeafCode = useMemo(() => {
    const hit = leafPickerOptions.find((o) => o.id === selectedNodeId);
    return hit?.code;
  }, [leafPickerOptions, selectedNodeId]);

  const selectedNodeName = useMemo(() => {
    const hit = leafPickerOptions.find((o) => o.id === selectedNodeId);
    return hit?.name?.trim() ?? "";
  }, [leafPickerOptions, selectedNodeId]);

  const selectedNodeFullPathRu = useMemo(() => {
    if (!selectedNodeId || nodeTree.length === 0) return "";
    const hit = leafPickerOptions.find((o) => o.id === selectedNodeId);
    const leafName = hit?.name?.trim() ?? "";
    const ancestors = nodeAncestorPathLabelRu(nodeTree, selectedNodeId);
    const ancestorsUi = ancestors.replace(/ › /g, " → ");
    if (!ancestorsUi) return leafName;
    if (!leafName) return ancestorsUi;
    return `${ancestorsUi} → ${leafName}`;
  }, [nodeTree, selectedNodeId, leafPickerOptions]);

  const selectedNodeIconSrc = useMemo(() => {
    if (!selectedLeafCode || !selectedNodeName) return "";
    return getNodeTreeIconWebSrc(selectedLeafCode, selectedNodeName);
  }, [selectedLeafCode, selectedNodeName]);

  const categoryOptions = useMemo(() => {
    const fromRecs = [...new Set(recs.map((r) => r.partType?.trim()).filter(Boolean))] as string[];
    const nodeName = selectedNodeName;
    const merged = nodeName && !fromRecs.includes(nodeName) ? [nodeName, ...fromRecs] : [...fromRecs];
    if (merged.length === 0 && nodeName) return [nodeName];
    if (merged.length === 0) return ["ЗАПЧАСТЬ"];
    return merged;
  }, [recs, selectedNodeName]);

  useEffect(() => {
    if (!category && categoryOptions.length > 0) {
      setCategory(categoryOptions[0] ?? "");
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    if (categoryOptions.length > 0 && category && !categoryOptions.includes(category)) {
      setCategory(categoryOptions[0] ?? "");
    }
  }, [category, categoryOptions, selectedNodeId]);

  const sidebarPlaqueTitle = useMemo(
    () =>
      vehicle
        ? vehicle.nickname?.trim() || `${vehicle.brandName} ${vehicle.modelName}`.trim()
        : "",
    [vehicle]
  );

  const sidebarPlaqueSubtitle = useMemo(
    () =>
      vehicle
        ? `${vehicle.year} · ${formatKmRuPlaque(vehicle.odometer)} км${
            formatRideStyleChipRu(vehicle.rideProfile) ? ` · ${formatRideStyleChipRu(vehicle.rideProfile)}` : ""
          }`
        : "",
    [vehicle]
  );

  const onSelectVehicleFromPlaque = useCallback(
    (newId: string) => {
      if (!newId.trim() || newId === props.vehicleId) {
        return;
      }
      try {
        localStorage.setItem(LAST_VIEWED_VEHICLE_ID_STORAGE_KEY, newId);
      } catch {
        // ignore
      }
      const node = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("nodeId")?.trim() : "";
      const qs = node ? `?nodeId=${encodeURIComponent(node)}` : "";
      router.push(`/vehicles/${encodeURIComponent(newId)}/parts/community${qs}`);
    },
    [props.vehicleId, router]
  );

  const showFitmentBlock = lifeStatus === "installed" || lifeStatus === "rejected";

  const footerHint = useMemo(() => {
    if (!selectedNodeId.trim() || !brandName.trim() || !sku.trim() || !title.trim() || !category.trim()) {
      return "Заполните обязательные поля";
    }
    return null;
  }, [selectedNodeId, brandName, sku, title, category]);

  const primaryCtaLabel = useMemo(() => {
    if (lifeStatus === "plan" || lifeStatus === "purchased") return "Добавить в корзину";
    if (lifeStatus === "installed") return "Добавить и опубликовать опыт";
    return "Сохранить как не подошла";
  }, [lifeStatus]);

  const canSubmit =
    Boolean(selectedNodeId.trim()) &&
    Boolean(brandName.trim()) &&
    Boolean(sku.trim()) &&
    Boolean(title.trim()) &&
    Boolean(category.trim()) &&
    (!showFitmentBlock ||
      lifeStatus === "rejected" ||
      (fitmentChoice !== "FIT_WITH_MODIFICATION" || modificationDetails.trim().length > 0));

  const pickDuplicate = useCallback(
    (row: { id: string; brandName: string; sku: string; title: string }) => {
      setExistingMasterId(row.id);
      setBrandName(row.brandName);
      setSku(row.sku);
      setTitle(row.title);
    },
    []
  );

  const clearDuplicate = useCallback(() => {
    setExistingMasterId(null);
  }, []);

  const submit = useCallback(async () => {
    setError("");
    if (!canSubmit) return;
    setBusy(true);
    try {
      let partMasterId = existingMasterId;
      let skuId: string | null = null;

      if (existingMasterId) {
        const res = await fetch("/api/part-masters/ensure-sku", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partMasterId: existingMasterId,
            nodeId: selectedNodeId.trim(),
            vehicleId: props.vehicleId,
            partType: category.trim(),
          }),
        });
        const json = (await res.json()) as { error?: string; skuId?: string };
        if (!res.ok) {
          setError(json.error || "Не удалось привязать деталь");
          return;
        }
        skuId = json.skuId ?? null;
        partMasterId = existingMasterId;
      } else {
        const res = await fetch("/api/part-masters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandName: brandName.trim(),
            sku: sku.trim(),
            title: title.trim(),
            category: category.trim(),
            description: null,
            vehicleId: props.vehicleId,
            nodeId: selectedNodeId.trim(),
            attachSkuToNode: true,
          }),
        });
        const json = (await res.json()) as {
          error?: string;
          partMaster?: { id: string };
          skuId?: string | null;
          partMasterId?: string;
        };
        if (res.status === 409 && json.partMasterId) {
          setExistingMasterId(json.partMasterId);
          setError("Такая деталь уже есть — выберите её в блоке «Похожие детали в базе».");
          return;
        }
        if (!res.ok) {
          setError(json.error || "Не удалось сохранить деталь");
          return;
        }
        partMasterId = json.partMaster?.id ?? null;
        skuId = json.skuId ?? null;
      }

      if (!partMasterId || !skuId) {
        setError("Не удалось получить каталожную строку (SKU).");
        return;
      }

      const wishlistStatus =
        lifeStatus === "plan"
          ? "NEEDED"
          : lifeStatus === "purchased"
            ? "BOUGHT"
            : lifeStatus === "installed"
              ? "INSTALLED"
              : "REJECTED";

      if (lifeStatus !== "rejected") {
        const wlRes = await fetch(`/api/vehicles/${encodeURIComponent(props.vehicleId)}/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skuId,
            nodeId: selectedNodeId.trim(),
            title: title.trim(),
            quantity: 1,
            status: wishlistStatus,
            source: "USER_ADDED",
            comment: comment.trim() || null,
          }),
        });
        const wlJson = (await wlRes.json()) as { error?: string };
        if (!wlRes.ok) {
          setError(wlJson.error || "Не удалось добавить в корзину");
          return;
        }
      } else {
        const wlRes = await fetch(`/api/vehicles/${encodeURIComponent(props.vehicleId)}/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skuId,
            nodeId: selectedNodeId.trim(),
            title: title.trim(),
            quantity: 1,
            status: "REJECTED",
            source: "USER_ADDED",
            comment: comment.trim() || null,
          }),
        });
        const wlJson = (await wlRes.json()) as { error?: string };
        if (!wlRes.ok) {
          setError(wlJson.error || "Не удалось сохранить позицию");
          return;
        }
      }

      if (showFitmentBlock && partMasterId) {
        const fitmentResult =
          lifeStatus === "rejected" ? "DOES_NOT_FIT" : fitmentChoice === "OEM_REPLACEMENT" ? "OEM_REPLACEMENT" : fitmentChoice;
        const installationStatus =
          lifeStatus === "rejected" ? "TESTED_NOT_INSTALLED" : "INSTALLED";
        const frRes = await fetch(
          `/api/vehicles/${encodeURIComponent(props.vehicleId)}/fitment-reports`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partMasterId,
              nodeId: selectedNodeId.trim(),
              fitmentResult,
              installationStatus,
              modificationRequired:
                lifeStatus === "installed" && fitmentChoice === "FIT_WITH_MODIFICATION"
                  ? true
                  : false,
              modificationDetails:
                lifeStatus === "installed" && fitmentChoice === "FIT_WITH_MODIFICATION"
                  ? modificationDetails.trim() || null
                  : null,
              comment: comment.trim() || null,
              rideProfile: reportRideProfile,
            }),
          }
        );
        const frJson = (await frRes.json()) as { error?: string; report?: { id: string } };
        if (!frRes.ok) {
          setError(frJson.error || "Не удалось сохранить отчёт о совместимости");
          return;
        }
        const reportId = frJson.report?.id;
        if (reportId) {
          const evidenceRows: Array<{ type: "PACKAGING_PHOTO" | "INSTALLED_PHOTO" | "RECEIPT"; url: string }> = [];
          if (isValidHttpUrl(photoPackagingUrl)) {
            evidenceRows.push({ type: "PACKAGING_PHOTO", url: photoPackagingUrl.trim() });
          }
          if (isValidHttpUrl(photoInstalledUrl)) {
            evidenceRows.push({ type: "INSTALLED_PHOTO", url: photoInstalledUrl.trim() });
          }
          if (isValidHttpUrl(photoReceiptUrl)) {
            evidenceRows.push({ type: "RECEIPT", url: photoReceiptUrl.trim() });
          }
          for (const row of evidenceRows) {
            await fetch("/api/fitment/evidence", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reportId, type: row.type, fileUrl: row.url }),
            });
          }
        }
      }

      setDone(true);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [
    canSubmit,
    existingMasterId,
    props.vehicleId,
    selectedNodeId,
    brandName,
    sku,
    title,
    category,
    lifeStatus,
    showFitmentBlock,
    fitmentChoice,
    modificationDetails,
    comment,
    reportRideProfile,
    photoPackagingUrl,
    photoInstalledUrl,
    photoReceiptUrl,
  ]);

  const closeModal = () => router.push(`/vehicles/${encodeURIComponent(props.vehicleId)}/parts/picker`);

  const lifeCards: Array<{ key: PartLifeStatus; label: string; icon: (a: boolean) => ReactNode }> = [
    { key: "plan", label: "Планирую купить", icon: (a) => iconWrap(24, <IcoCart active={a} />) },
    { key: "purchased", label: "Купил, но не установил", icon: (a) => iconWrap(24, <IcoBox active={a} />) },
    { key: "installed", label: "Установил", icon: (a) => iconWrap(24, <IcoWrench active={a} />) },
    { key: "rejected", label: "Не подошла", icon: (a) => iconWrap(24, <IcoX active={a} />) },
  ];

  const fitmentPills: Array<{ key: FitmentChoiceInstalled; label: string; icon: ReactNode }> = [
    { key: "DIRECT_FIT", label: "Подошла без доработок", icon: iconWrap(22, <IcoCheck />) },
    { key: "FIT_WITH_MODIFICATION", label: "Подошла с доработкой", icon: iconWrap(22, <IcoGearSm />) },
    { key: "PARTIAL_FIT", label: "Подошла частично / не уверен", icon: iconWrap(22, <IcoHelp />) },
    { key: "OEM_REPLACEMENT", label: "OEM-замена (эквивалент)", icon: iconWrap(22, <IcoOem />) },
  ];

  const modalPanel: CSSProperties = {
    width: "min(880px, calc(100vw - 24px))",
    maxHeight: "min(92vh, 900px)",
    backgroundColor: REF.modalBg,
    borderRadius: 12,
    border: `1px solid ${REF.panelBorder}`,
    boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const scrollBody: CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: isNarrow ? "10px 12px 14px" : "10px 16px 16px",
    boxSizing: "border-box",
  };

  const slotBase: CSSProperties = {
    border: `2px dashed ${REF.dashed}`,
    borderRadius: REF.radiusMd,
    minHeight: 112,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
  };

  const renderSuccess = () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        backgroundColor: REF.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={modalPanel}>
        <div style={{ padding: 24 }}>
          <p style={{ margin: 0, color: pickerColors.successText, fontSize: 16, fontWeight: 700 }}>
            Готово. Деталь сохранена по вашему сценарию.
          </p>
          <p style={{ margin: "12px 0 0", color: REF.muted, fontSize: 14, lineHeight: 1.5 }}>
            Новые детали и отчёты по ответственным узлам могут проходить проверку перед публикацией.
          </p>
          <button
            type="button"
            style={{
              marginTop: 20,
              padding: "12px 20px",
              borderRadius: REF.radiusMd,
              border: "none",
              backgroundColor: REF.primary,
              color: REF.onPrimary,
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={closeModal}
          >
            Вернуться к подбору
          </button>
        </div>
      </div>
    </div>
  );

  if (done) {
    return renderSuccess();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        backgroundColor: REF.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div style={modalPanel}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: isNarrow ? "14px 14px 12px" : "16px 18px 12px",
            borderBottom: `1px solid ${REF.panelBorder}`,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0, paddingRight: 4 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isNarrow ? 18 : 19,
                fontWeight: 700,
                color: REF.text,
                letterSpacing: -0.35,
                lineHeight: 1.2,
              }}
            >
              Добавить свою деталь
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                color: REF.muted,
                lineHeight: 1.45,
                maxWidth: 520,
                letterSpacing: 0.01,
              }}
            >
              Добавьте деталь в корзину замен. Если вы уже установили ее, MotoTwin поможет поделиться совместимостью с
              владельцами такой же модели.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Закрыть"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${REF.panelBorder}`,
              backgroundColor: "rgba(255,255,255,0.04)",
              color: REF.muted,
              cursor: "pointer",
              fontSize: 17,
              lineHeight: 1,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}
          >
            ×
          </button>
        </div>

        <div style={scrollBody}>
          {/* Контекст: 3 карточки */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: isNarrow ? 8 : 6,
              marginBottom: 16,
              alignItems: "stretch",
            }}
          >
            <div style={CONTEXT_GRID_CELL}>
              {vehicle ? (
                <SidebarVehiclePlaque
                  variant="modalPicker"
                  fillGridCellHeight
                  compactTile
                  vehicle={vehicle}
                  collapsed={false}
                  title={sidebarPlaqueTitle}
                  subtitle={sidebarPlaqueSubtitle}
                  href={`/vehicles/${encodeURIComponent(props.vehicleId)}`}
                  vehicles={garageVehicles}
                  currentVehicleId={props.vehicleId}
                  onSelectVehicle={onSelectVehicleFromPlaque}
                />
              ) : (
                <button
                  type="button"
                  style={contextPlateButtonStyle()}
                  aria-label="Перейти в гараж"
                  onClick={() => router.push("/garage")}
                >
                  <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 600, color: REF.text, fontSize: 14 }}>
                      {vehicleError ? "Не удалось загрузить мотоцикл" : "Загрузка…"}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: REF.muted }}>
                      {vehicleError ? "Открыть гараж" : "Подождите"}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: REF.primary }}>В гараж</span>
                </button>
              )}
            </div>
            <div style={CONTEXT_GRID_CELL}>
            <button
              type="button"
              style={NODE_CONTEXT_PLATE_BUTTON}
              aria-label={selectedNodeFullPathRu ? "Сменить узел" : "Выбрать узел"}
              onClick={() => setNodePickerOpen(true)}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width: "100%",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {contextIconWell(
                  selectedNodeIconSrc ? (
                    <Image
                      src={selectedNodeIconSrc}
                      alt=""
                      width={24}
                      height={24}
                      sizes="34px"
                      style={{ objectFit: "contain", display: "block" }}
                    />
                  ) : (
                    <IcoGear size={19} />
                  ),
                  { box: 34, radius: 7 }
                )}
                <div
                  style={{
                    flex: "0 1 auto",
                    minWidth: 0,
                    maxWidth: "calc(100% - 40px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    gap: 2,
                  }}
                >
                  {selectedNodeFullPathRu ? (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: REF.text,
                        lineHeight: 1.35,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        width: "100%",
                      }}
                    >
                      {selectedNodeFullPathRu}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, color: REF.text, fontSize: 14, lineHeight: 1.25, width: "100%" }}>
                        Узел не выбран
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: productSemanticColors.textMuted,
                          lineHeight: 1.35,
                          width: "100%",
                        }}
                      >
                        Выберите узел
                      </div>
                    </>
                  )}
                </div>
              </div>
            </button>
            </div>
            <div style={CONTEXT_GRID_CELL}>
            <div
              style={{
                ...contextPlateShell({
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  alignSelf: "stretch",
                  height: "100%",
                  minHeight: 0,
                  padding: "6px 8px",
                  borderRadius: 10,
                }),
              }}
            >
              {contextIconWell(<IcoUsers size={16} />)}
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: REF.text,
                    fontSize: 13,
                    lineHeight: 1.25,
                    letterSpacing: -0.02,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  Community опыт
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: REF.muted,
                    lineHeight: 1.35,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  Ваш опыт поможет другим владельцам избежать ошибки при подборе.
                </div>
              </div>
            </div>
            </div>
          </div>

          {vehicleError ? (
            <div
              style={{
                ...cardShell({ borderColor: productSemanticColors.errorBorder, color: REF.error, marginBottom: 16 }),
              }}
            >
              {vehicleError}
            </div>
          ) : null}

          {nodeTreeError ? (
            <p style={{ color: REF.error, fontSize: 13, marginBottom: 16 }}>{nodeTreeError}</p>
          ) : null}

          <NodePickerModal
            open={nodePickerOpen}
            title="Выберите узел"
            options={leafPickerOptions}
            topOptions={leafPickerOptionsTopOnly}
            confirmLabel="Выбрать"
            onClose={() => setNodePickerOpen(false)}
            onSelect={(id) => {
              setSelectedNodeId(id);
              setNodePickerOpen(false);
            }}
          />

          {/* 1. Деталь */}
          <StepHeading n={1} title="Деталь" />
          <div
            style={{
              ...cardShell({
                marginBottom: 16,
                opacity: selectedNodeId ? 1 : 0.45,
                pointerEvents: selectedNodeId ? "auto" : "none",
              }),
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                gap: 14,
              }}
            >
              <label style={{ display: "block" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: REF.text }}>
                  Бренд детали <span style={{ color: REF.error }}>*</span>
                </span>
                <input
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: REF.radiusMd,
                    border: `1px solid ${REF.panelBorder}`,
                    backgroundColor: "#0f1218",
                    color: REF.text,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value);
                    if (existingMasterId) clearDuplicate();
                  }}
                  placeholder="Например: EBC, Brembo"
                />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: REF.text }}>
                  Артикул / SKU <span style={{ color: REF.error }}>*</span>
                </span>
                <input
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: REF.radiusMd,
                    border: `1px solid ${REF.panelBorder}`,
                    backgroundColor: "#0f1218",
                    color: REF.text,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value);
                    if (existingMasterId) clearDuplicate();
                  }}
                  placeholder="Например: FA209HH"
                />
              </label>
            </div>
            <label style={{ display: "block", marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: REF.text }}>
                Название <span style={{ color: REF.error }}>*</span>
              </span>
              <input
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: REF.radiusMd,
                  border: `1px solid ${REF.panelBorder}`,
                  backgroundColor: "#0f1218",
                  color: REF.text,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (existingMasterId) clearDuplicate();
                }}
                placeholder="Например: Передние тормозные колодки EBC FA209HH"
              />
            </label>
            <label style={{ display: "block", marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: REF.text }}>Категория (заполняется автоматически)</span>
              <div style={{ fontSize: 12, color: REF.subtle, marginTop: 4 }}>
                Предлагается по узлу; при необходимости выберите другой тип из списка.
              </div>
              <select
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: REF.radiusMd,
                  border: `1px solid ${REF.panelBorder}`,
                  backgroundColor: "#0f1218",
                  color: REF.text,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedNodeId && brandName.trim() && sku.trim() ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: REF.text, marginBottom: 10 }}>Похожие детали в базе</div>
              <div
                style={{
                  ...cardShell({ marginBottom: 28, padding: 0, overflow: "hidden" }),
                }}
              >
                <div style={{ padding: 20, textAlign: "center" as const }}>
                  {dupLoading ? (
                    <p style={{ margin: 0, color: REF.muted }}>Поиск…</p>
                  ) : dupCandidates.length === 0 ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                        <IcoSearch />
                      </div>
                      <p style={{ margin: 0, color: REF.muted, fontSize: 14, lineHeight: 1.5 }}>
                        Похожих деталей не найдено. Будет создана новая карточка детали.
                      </p>
                    </>
                  ) : (
                    <div style={{ textAlign: "left" as const }}>
                      <p style={{ margin: "0 0 12px", fontWeight: 700, color: REF.text }}>Возможно, эта деталь уже есть в базе</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {dupCandidates.map((row) => (
                          <div
                            key={row.id}
                            style={{
                              padding: 12,
                              borderRadius: 10,
                              border: `1px solid ${REF.panelBorder}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, color: REF.text }}>
                                {row.brandName} {row.sku}
                              </div>
                              <div style={{ fontSize: 13, color: REF.muted }}>{row.title}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => pickDuplicate(row)}
                              style={{
                                padding: "8px 14px",
                                borderRadius: 8,
                                border: "none",
                                backgroundColor: existingMasterId === row.id ? REF.primary : REF.cardBg,
                                color: existingMasterId === row.id ? REF.onPrimary : REF.text,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Использовать эту деталь
                            </button>
                          </div>
                        ))}
                      </div>
                      {existingMasterId ? (
                        <button
                          type="button"
                          onClick={clearDuplicate}
                          style={{
                            marginTop: 12,
                            background: "none",
                            border: "none",
                            color: REF.primary,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          Создать новую карточку вместо выбранной
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {/* 2. Статус */}
          <StepHeading n={2} title="Что вы сделали с деталью?" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNarrow ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 28,
            }}
          >
            {lifeCards.map(({ key, label, icon }) => {
              const active = lifeStatus === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLifeStatus(key)}
                  style={{
                    ...cardShell({
                      cursor: "pointer",
                      textAlign: "center" as const,
                      padding: "14px 10px",
                      borderColor: active ? REF.primary : REF.panelBorder,
                      boxShadow: active ? `0 0 0 1px ${REF.primary}` : undefined,
                      backgroundColor: active ? "rgba(37,99,235,0.12)" : REF.cardBg,
                    }),
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon(active)}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? REF.text : REF.muted, lineHeight: 1.35 }}>{label}</div>
                </button>
              );
            })}
          </div>

          {/* 3. Совместимость — всегда видна, как на референсе; блокируется до статуса */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: REF.stepBlueSoft,
                color: REF.stepBlue,
                fontWeight: 800,
                fontSize: 15,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              3
            </span>
            <span style={{ fontSize: 17, fontWeight: 700, color: REF.text, letterSpacing: -0.2, flex: "1 1 auto" }}>
              Совместимость с вашей моделью
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: REF.greenHint, whiteSpace: "nowrap" as const }}>
              Показывается при установке или несовместимости
            </span>
          </div>
          <div
            style={{
              ...cardShell({
                marginBottom: 28,
                opacity: showFitmentBlock ? 1 : 0.38,
                pointerEvents: showFitmentBlock ? "auto" : "none",
              }),
            }}
          >
            {lifeStatus === "installed" ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {fitmentPills.map((p) => {
                  const on = fitmentChoice === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setFitmentChoice(p.key)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 999,
                        border: `1px solid ${on ? REF.primary : REF.panelBorder}`,
                        backgroundColor: on ? "rgba(37,99,235,0.15)" : "transparent",
                        color: REF.text,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {p.icon}
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: `1px solid ${REF.panelBorder}`,
                    opacity: 0.55,
                    color: REF.muted,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "default",
                  }}
                >
                  {iconWrap(22, <IcoBan />)}
                  Не подошла
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: REF.muted }}>
                  Выберите «Установил» или «Не подошла», чтобы заполнить отчёт.
                </span>
              </div>
            )}

            {lifeStatus === "rejected" ? (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                {iconWrap(22, <IcoBan />)}
                <span style={{ fontWeight: 700, color: REF.text }}>Не подошла — зафиксируем как несовместимую с узлом</span>
              </div>
            ) : null}

            {lifeStatus === "installed" && fitmentChoice === "FIT_WITH_MODIFICATION" ? (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: REF.text }}>
                  Что пришлось доработать? (необязательно)
                </label>
                <textarea
                  value={modificationDetails}
                  maxLength={MOD_MAX}
                  onChange={(e) => setModificationDetails(e.target.value)}
                  placeholder="Например: потребовалась замена проставки или подгонка крепления."
                  style={{
                    marginTop: 8,
                    width: "100%",
                    minHeight: 88,
                    padding: 12,
                    borderRadius: REF.radiusMd,
                    border: `1px solid ${REF.panelBorder}`,
                    backgroundColor: "#0f1218",
                    color: REF.text,
                    fontSize: 14,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ textAlign: "right" as const, fontSize: 12, color: REF.subtle, marginTop: 6 }}>
                  {modificationDetails.length}/{MOD_MAX}
                </div>
              </div>
            ) : null}

            {showFitmentBlock ? (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: REF.text, marginBottom: 8 }}>
                  Профиль езды для сообщества
                </div>
                <p style={{ fontSize: 12, color: REF.muted, marginBottom: 10, lineHeight: 1.45 }}>
                  Сохраняется в отчёт и участвует в сводке «лучше всего подходит для…». По умолчанию совпадает с
                  карточкой мотоцикла — уточните, если в момент установки ваш стиль был другим.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {(
                    [
                      ["Тип использования", RIDE_USAGE_TYPE_OPTIONS, "usageType"] as const,
                      ["Стиль езды", RIDE_RIDING_STYLE_OPTIONS, "ridingStyle"] as const,
                      ["Нагрузка", RIDE_LOAD_TYPE_OPTIONS, "loadType"] as const,
                      ["Интенсивность", RIDE_USAGE_INTENSITY_OPTIONS, "usageIntensity"] as const,
                    ] as const
                  ).map(([label, opts, key]) => (
                    <label
                      key={key}
                      style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: REF.muted }}
                    >
                      {label}
                      <select
                        value={reportRideProfile[key]}
                        onChange={(e) =>
                          setReportRideProfile((prev) => ({
                            ...prev,
                            [key]: e.target.value as never,
                          }))
                        }
                        style={{
                          padding: "8px 10px",
                          borderRadius: REF.radiusMd,
                          border: `1px solid ${REF.panelBorder}`,
                          backgroundColor: "#0f1218",
                          color: REF.text,
                          fontSize: 13,
                        }}
                      >
                        {opts.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* 4. Фото */}
          <StepHeading n={4} title="Фото и подтверждение" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                isNarrow || !isSafetyCriticalNodeCode(selectedLeafCode) ? "1fr" : "1.35fr minmax(200px, 0.65fr)",
              gap: 14,
              marginBottom: 28,
              alignItems: "stretch",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
              {(
                [
                  ["Фото детали или упаковки", <IcoCamera key="c" />, photoPackagingUrl, setPhotoPackagingUrl] as const,
                  ["Фото установленной детали", <IcoCamera key="i" />, photoInstalledUrl, setPhotoInstalledUrl] as const,
                  ["Чек или заказ", <IcoReceipt key="r" />, photoReceiptUrl, setPhotoReceiptUrl] as const,
                ] as const
              ).map(([label, ic, val, setVal]) => (
                <div key={label} style={slotBase}>
                  {ic}
                  <span style={{ fontSize: 12, fontWeight: 600, color: REF.muted, textAlign: "center" }}>{label}</span>
                  <input
                    type="url"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder="https://…"
                    disabled={!showFitmentBlock}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 8px",
                      fontSize: 11,
                      borderRadius: 6,
                      border: `1px solid ${REF.panelBorder}`,
                      backgroundColor: "#0f1218",
                      color: REF.text,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>
            {isSafetyCriticalNodeCode(selectedLeafCode) ? (
              <div
                style={{
                  ...cardShell({
                    borderColor: REF.warnBorder,
                    backgroundColor: REF.warnBg,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }),
                }}
              >
                {iconWrap(28, <IcoShield />)}
                <p style={{ margin: 0, fontSize: 13, color: REF.text, lineHeight: 1.5 }}>
                  Для тормозов, подвески и двигателя фото установки особенно важно. Такие отчёты могут проверяться вручную.
                </p>
              </div>
            ) : null}
          </div>

          {/* 5. Комментарий */}
          <StepHeading n={5} title="Комментарий" />
          <div
            style={{
              ...cardShell({ marginBottom: 8 }),
            }}
          >
            <textarea
              value={comment}
              maxLength={COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите коротко: как встала деталь, были ли нюансы, сколько уже проехали после установки."
              style={{
                width: "100%",
                minHeight: 120,
                padding: 12,
                borderRadius: REF.radiusMd,
                border: `1px solid ${REF.panelBorder}`,
                backgroundColor: "#0f1218",
                color: REF.text,
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ textAlign: "right" as const, fontSize: 12, color: REF.subtle, marginTop: 8 }}>
              {comment.length}/{COMMENT_MAX}
            </div>
          </div>

          {error ? (
            <p style={{ color: REF.error, fontSize: 13, marginBottom: 12 }}>{error}</p>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${REF.panelBorder}`,
            padding: isNarrow ? "14px 16px 18px" : "16px 28px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            flexShrink: 0,
            background: `linear-gradient(180deg, transparent, ${REF.modalBg} 30%)`,
          }}
        >
          <button
            type="button"
            onClick={closeModal}
            style={{
              padding: "12px 8px",
              border: "none",
              background: "none",
              color: REF.muted,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Отмена
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={() => void submit()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 22px",
                borderRadius: REF.radiusMd,
                border: "none",
                backgroundColor: canSubmit && !busy ? REF.primary : "#374151",
                color: canSubmit && !busy ? REF.onPrimary : REF.subtle,
                fontWeight: 800,
                fontSize: 15,
                cursor: canSubmit && !busy ? "pointer" : "not-allowed",
              }}
            >
              {!busy ? iconWrap(22, <IcoCart active={canSubmit} />) : null}
              {busy ? "Сохранение…" : primaryCtaLabel}
            </button>
            <span style={{ fontSize: 12, color: REF.muted }}>{footerHint ?? "\u00a0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
