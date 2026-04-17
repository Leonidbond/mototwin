"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  filterAndSortServiceEvents,
  findNodePathById,
  getAvailableChildrenForSelectedPath,
  getLeafStatusReasonShort,
  getMonthlyCostLabel,
  getNodeSelectLevels,
  getSelectedNodeFromPath,
  getStatusExplanationTriggeredByLabel,
  getStateUpdateSummary,
  getTopNodeStatusBadgeLabel,
  groupServiceEventsByMonth,
} from "@mototwin/domain";
import type {
  NodeTreeItem,
  SelectedNodePath,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
} from "@mototwin/types";

type VehicleDetail = {
  id: string;
  nickname: string | null;
  vin: string | null;
  odometer: number;
  engineHours: number | null;
  brand: {
    name: string;
  };
  model: {
    name: string;
  };
  modelVariant: {
    year: number;
    versionName: string;
    engineType: string | null;
    coolingType: string | null;
    wheelSizes: string | null;
    brakeSystem: string | null;
    chainPitch: string | null;
    stockSprockets: string | null;
  };
  rideProfile: {
    usageType: string;
    ridingStyle: string;
    loadType: string;
    usageIntensity: string;
  } | null;
};

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type VehicleProfileForm = {
  nickname: string;
  vin: string;
  usageType: "CITY" | "HIGHWAY" | "MIXED" | "OFFROAD";
  ridingStyle: "CALM" | "ACTIVE" | "AGGRESSIVE";
  loadType: "SOLO" | "PASSENGER" | "LUGGAGE" | "PASSENGER_LUGGAGE";
  usageIntensity: "LOW" | "MEDIUM" | "HIGH";
};

export default function VehiclePage({ params }: VehiclePageProps) {
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [isServiceEventsLoading, setIsServiceEventsLoading] = useState(false);
  const [serviceEventsError, setServiceEventsError] = useState("");
  const [serviceEventsFilters, setServiceEventsFilters] = useState<ServiceEventsFilters>({
    dateFrom: "",
    dateTo: "",
    eventKind: "",
    serviceType: "",
    node: "",
  });
  const [serviceEventsSort, setServiceEventsSort] = useState<{
    field: ServiceEventsSortField;
    direction: ServiceEventsSortDirection;
  }>({
    field: "eventDate",
    direction: "desc",
  });
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isServiceLogModalOpen, setIsServiceLogModalOpen] = useState(false);
  const [isAddServiceEventModalOpen, setIsAddServiceEventModalOpen] = useState(false);
  const [isCreatingServiceEvent, setIsCreatingServiceEvent] = useState(false);
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [serviceEventFormSuccess, setServiceEventFormSuccess] = useState("");
  const [selectedNodePath, setSelectedNodePath] = useState<SelectedNodePath>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedStatusExplanationNode, setSelectedStatusExplanationNode] =
    useState<NodeTreeItem | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileForm, setProfileForm] = useState<VehicleProfileForm>({
    nickname: "",
    vin: "",
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
  });
  const [isEditingVehicleState, setIsEditingVehicleState] = useState(false);
  const [vehicleStateOdometer, setVehicleStateOdometer] = useState("");
  const [vehicleStateEngineHours, setVehicleStateEngineHours] = useState("");
  const [vehicleStateError, setVehicleStateError] = useState("");
  const [isSavingVehicleState, setIsSavingVehicleState] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [comment, setComment] = useState("");
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

  const filteredAndSortedServiceEvents = useMemo(() => {
    return filterAndSortServiceEvents(
      serviceEvents,
      serviceEventsFilters,
      serviceEventsSort
    );
  }, [serviceEvents, serviceEventsFilters, serviceEventsSort]);

  const serviceEventsByMonth = useMemo(() => {
    return groupServiceEventsByMonth(filteredAndSortedServiceEvents);
  }, [filteredAndSortedServiceEvents]);

  const updateServiceEventsFilter = (
    field: keyof ServiceEventsFilters,
    value: string
  ) => {
    setServiceEventsFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleServiceEventsSort = (field: ServiceEventsSortField) => {
    setServiceEventsSort((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        field,
        direction: field === "eventDate" ? "desc" : "asc",
      };
    });
  };

  const getServiceEventsSortIndicator = (field: ServiceEventsSortField) => {
    if (serviceEventsSort.field !== field) {
      return "↕";
    }
    return serviceEventsSort.direction === "asc" ? "↑" : "↓";
  };

  const resetServiceEventsFilters = () => {
    setServiceEventsFilters({
      dateFrom: "",
      dateTo: "",
      eventKind: "",
      serviceType: "",
      node: "",
    });
    setServiceEventsSort({
      field: "eventDate",
      direction: "desc",
    });
  };

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const resolvedParams = await params;
        setVehicleId(resolvedParams.id);
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/vehicles/${resolvedParams.id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Не удалось загрузить мотоцикл.");
          return;
        }

        setVehicle(data.vehicle ?? null);
      } catch (requestError) {
        console.error(requestError);
        setError("Произошла ошибка при загрузке мотоцикла.");
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [params]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    const loadServiceEvents = async () => {
      try {
        setIsServiceEventsLoading(true);
        setServiceEventsError("");
        const response = await fetch(`/api/vehicles/${vehicleId}/service-events`);
        const data = await response.json();

        if (!response.ok) {
          setServiceEventsError(
            data.error || "Не удалось загрузить журнал обслуживания."
          );
          return;
        }

        setServiceEvents(data.serviceEvents ?? []);
      } catch (serviceError) {
        console.error(serviceError);
        setServiceEventsError("Произошла ошибка при загрузке журнала.");
      } finally {
        setIsServiceEventsLoading(false);
      }
    };

    loadServiceEvents();
  }, [vehicleId]);

  const loadNodeTree = async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsNodeTreeLoading(true);
      setNodeTreeError("");
      const response = await fetch(`/api/vehicles/${vehicleId}/node-tree`);
      const data = await response.json();

      if (!response.ok) {
        setNodeTreeError(data.error || "Не удалось загрузить дерево узлов.");
        return;
      }

      setNodeTree(data.nodeTree ?? []);
    } catch (nodeTreeLoadError) {
      console.error(nodeTreeLoadError);
      setNodeTreeError("Произошла ошибка при загрузке дерева узлов.");
    } finally {
      setIsNodeTreeLoading(false);
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const openAddServiceEventFromLeafNode = (leafNodeId: string) => {
    const nodePath = findNodePathById(nodeTree, leafNodeId);

    if (!nodePath) {
      setServiceEventFormError("Не удалось определить путь узла.");
      return;
    }

    setServiceEventFormError("");
    setServiceEventFormSuccess("");
    setSelectedNodePath(nodePath);
    setIsAddServiceEventModalOpen(true);
  };

  const getLeafStatusExplanation = (node: NodeTreeItem): string | null => {
    return getLeafStatusReasonShort(node);
  };

  const renderChildTreeNode = (node: NodeTreeItem, depth: number): ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = Boolean(expandedNodes[node.id]);

    return (
      <div key={node.id} className="space-y-2.5">
        <div
          className="rounded-xl border border-gray-200 bg-white px-4 py-3.5"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleNodeExpansion(node.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                    aria-label={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                ) : (
                  <span className="inline-flex h-6 w-6 items-center justify-center text-gray-400">
                    •
                  </span>
                )}
                <span className="truncate text-sm font-medium text-gray-950">
                  {node.name}
                </span>
              </div>
              {getLeafStatusExplanation(node) ? (
                <button
                  type="button"
                  onClick={() => setSelectedStatusExplanationNode(node)}
                  className="mt-1.5 pl-8 text-left text-xs text-gray-500 underline decoration-dotted underline-offset-2 transition hover:text-gray-700"
                >
                  {getLeafStatusExplanation(node)}
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {node.effectiveStatus ? (
                <span
                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium ${getStatusBadgeClassName(node.effectiveStatus)}`}
                >
                  {getTopNodeStatusBadgeLabel(node.effectiveStatus)}
                </span>
              ) : null}
              {!hasChildren ? (
                <button
                  type="button"
                  onClick={() => openAddServiceEventFromLeafNode(node.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  aria-label="Добавить сервисное событие"
                  title="Добавить сервисное событие"
                >
                  +
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded ? (
          <div className="space-y-2">
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

    loadNodeTree();
  }, [vehicleId]);

  const loadServiceEvents = async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsServiceEventsLoading(true);
      setServiceEventsError("");
      const response = await fetch(`/api/vehicles/${vehicleId}/service-events`);
      const data = await response.json();

      if (!response.ok) {
        setServiceEventsError(
          data.error || "Не удалось загрузить журнал обслуживания."
        );
        return;
      }

      setServiceEvents(data.serviceEvents ?? []);
    } catch (serviceError) {
      console.error(serviceError);
      setServiceEventsError("Произошла ошибка при загрузке журнала.");
    } finally {
      setIsServiceEventsLoading(false);
    }
  };

  const openVehicleStateEditor = () => {
    if (!vehicle) {
      return;
    }

    setVehicleStateOdometer(String(vehicle.odometer));
    setVehicleStateEngineHours(
      vehicle.engineHours !== null ? String(vehicle.engineHours) : ""
    );
    setVehicleStateError("");
    setIsEditingVehicleState(true);
  };

  const openEditProfileModal = () => {
    if (!vehicle) {
      return;
    }

    setProfileForm({
      nickname: vehicle.nickname || "",
      vin: vehicle.vin || "",
      usageType: (vehicle.rideProfile?.usageType || "MIXED") as VehicleProfileForm["usageType"],
      ridingStyle: (vehicle.rideProfile?.ridingStyle ||
        "ACTIVE") as VehicleProfileForm["ridingStyle"],
      loadType: (vehicle.rideProfile?.loadType || "SOLO") as VehicleProfileForm["loadType"],
      usageIntensity: (vehicle.rideProfile?.usageIntensity ||
        "MEDIUM") as VehicleProfileForm["usageIntensity"],
    });
    setProfileFormError("");
    setIsEditProfileModalOpen(true);
  };

  const saveVehicleProfile = async () => {
    if (!vehicleId) {
      setProfileFormError("Не удалось определить мотоцикл.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileFormError("");

      const response = await fetch(`/api/vehicles/${vehicleId}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: profileForm.nickname.trim() || null,
          vin: profileForm.vin.trim() || null,
          rideProfile: {
            usageType: profileForm.usageType,
            ridingStyle: profileForm.ridingStyle,
            loadType: profileForm.loadType,
            usageIntensity: profileForm.usageIntensity,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileFormError(data.error || "Не удалось обновить профиль мотоцикла.");
        return;
      }

      setVehicle(data.vehicle ?? null);
      setIsEditProfileModalOpen(false);
    } catch (saveError) {
      console.error(saveError);
      setProfileFormError("Произошла ошибка при сохранении профиля.");
    } finally {
      setIsSavingProfile(false);
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

    if (!vehicleStateOdometer.trim()) {
      setVehicleStateError("Укажите пробег.");
      return;
    }

    const parsedOdometer = Number(vehicleStateOdometer);
    if (!Number.isInteger(parsedOdometer) || parsedOdometer < 0) {
      setVehicleStateError("Пробег должен быть целым числом не меньше 0.");
      return;
    }

    const trimmedEngineHours = vehicleStateEngineHours.trim();
    let parsedEngineHours: number | null = null;

    if (trimmedEngineHours) {
      const parsed = Number(trimmedEngineHours);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setVehicleStateError("Моточасы должны быть целым числом не меньше 0.");
        return;
      }
      parsedEngineHours = parsed;
    }

    try {
      setIsSavingVehicleState(true);
      setVehicleStateError("");

      const response = await fetch(`/api/vehicles/${vehicleId}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          odometer: parsedOdometer,
          engineHours: parsedEngineHours,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVehicleStateError(
          data.error || "Не удалось обновить текущее состояние мотоцикла."
        );
        return;
      }

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
      await Promise.all([loadNodeTree(), loadServiceEvents()]);
    } catch (saveError) {
      console.error(saveError);
      setVehicleStateError("Произошла ошибка при сохранении состояния.");
    } finally {
      setIsSavingVehicleState(false);
    }
  };

  const resetServiceEventForm = () => {
    setSelectedNodePath([]);
    setServiceType("");
    setEventDate("");
    setOdometer("");
    setEngineHours("");
    setCostAmount("");
    setCurrency("");
    setComment("");
  };

  const handleCreateServiceEvent = async () => {
    try {
      setServiceEventFormError("");
      setServiceEventFormSuccess("");

      if (!vehicleId) {
        setServiceEventFormError("Не удалось определить мотоцикл.");
        return;
      }

      if (!selectedFinalNode) {
        setServiceEventFormError("Выберите узел.");
        return;
      }

      if (!isLeafNodeSelected) {
        setServiceEventFormError("Выберите узел последнего уровня.");
        return;
      }

      if (!serviceType.trim() || !eventDate.trim()) {
        setServiceEventFormError("Заполните тип сервиса и дату.");
        return;
      }

      if (!odometer.trim()) {
        setServiceEventFormError("Укажите пробег.");
        return;
      }

      if (eventDate > todayDate) {
        setServiceEventFormError("Дата события не может быть в будущем.");
        return;
      }

      if (vehicle && Number(odometer) > vehicle.odometer) {
        setServiceEventFormError(
          `Пробег события не может быть больше текущего (${vehicle.odometer} км).`
        );
        return;
      }

      setIsCreatingServiceEvent(true);

      const response = await fetch(`/api/vehicles/${vehicleId}/service-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: selectedFinalNode.id,
          serviceType: serviceType.trim(),
          eventDate,
          odometer: Number(odometer),
          engineHours: engineHours.trim() ? Number(engineHours) : null,
          costAmount: costAmount.trim() ? Number(costAmount) : null,
          currency: currency.trim() || null,
          comment: comment.trim() || null,
          installedPartsJson: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServiceEventFormError(
          data.error || "Не удалось создать сервисное событие."
        );
        return;
      }

      setServiceEventFormSuccess("Сервисное событие добавлено.");
      resetServiceEventForm();
      await Promise.all([loadServiceEvents(), loadNodeTree()]);
      setIsAddServiceEventModalOpen(false);
    } catch (createError) {
      console.error(createError);
      setServiceEventFormError("Произошла ошибка при создании события.");
    } finally {
      setIsCreatingServiceEvent(false);
    }
  };

  const title = vehicle?.nickname || `${vehicle?.brand.name || ""} ${vehicle?.model.name || ""}`.trim() || "Карточка мотоцикла";

  return (
    <main className="min-h-screen bg-white px-6 py-14 text-gray-950 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-3 text-sm text-gray-600">
          <Link href="/garage" className="transition hover:text-gray-950">
            Гараж
          </Link>{" "}
          <span className="text-gray-400">/</span>{" "}
          <span className="text-gray-900">Мотоцикл</span>
        </nav>

        <div className="mb-7">
          <Link
            href="/garage"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Назад в гараж
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <p className="text-sm text-gray-600">Загрузка мотоцикла...</p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Не удалось открыть мотоцикл
            </h1>
            <p className="mt-3 text-sm text-red-700">{error}</p>
            <p className="mt-2 text-xs text-red-600">ID: {vehicleId}</p>
          </div>
        ) : null}

        {!isLoading && !error && vehicle ? (
          <div className="space-y-7">
            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="text-sm text-gray-500">
                {vehicle.brand.name} | {vehicle.model.name}
              </div>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                {title}
              </h1>

              <p className="mt-3 text-base leading-7 text-gray-600">
                {vehicle.modelVariant.year} | {vehicle.modelVariant.versionName}
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <InfoCard label="Никнейм" value={vehicle.nickname || "Не задан"} />
                <InfoCard label="VIN" value={vehicle.vin || "Не указан"} />
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
                      <span className="font-medium text-gray-950">Пробег:</span>{" "}
                      {vehicle.odometer} км
                    </div>
                    <div>
                      <span className="font-medium text-gray-950">Моточасы:</span>{" "}
                      {vehicle.engineHours !== null ? vehicle.engineHours : "Не указаны"}
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
                      <p className="text-sm text-red-600">{vehicleStateError}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-7 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-semibold tracking-tight text-gray-950">
                      Профиль эксплуатации
                    </h2>
                    <button
                      type="button"
                      onClick={openEditProfileModal}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                    >
                      Редактировать профиль
                    </button>
                  </div>

                  {vehicle.rideProfile ? (
                    <div className="mt-4 space-y-2.5 text-sm leading-6 text-gray-700">
                      <div>
                        <span className="font-medium text-gray-950">
                          Сценарий:
                        </span>{" "}
                        {formatUsageType(vehicle.rideProfile.usageType)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-950">Стиль:</span>{" "}
                        {formatRidingStyle(vehicle.rideProfile.ridingStyle)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-950">
                          Нагрузка:
                        </span>{" "}
                        {formatLoadType(vehicle.rideProfile.loadType)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-950">
                          Интенсивность:
                        </span>{" "}
                        {formatUsageIntensity(vehicle.rideProfile.usageIntensity)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-600">
                      Профиль эксплуатации пока не задан.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="text-base font-semibold tracking-tight text-gray-950">
                    Техническая сводка
                  </h2>

                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    <SpecCard
                      label="Двигатель"
                      value={vehicle.modelVariant.engineType || "Не указан"}
                    />
                    <SpecCard
                      label="Охлаждение"
                      value={vehicle.modelVariant.coolingType || "Не указано"}
                    />
                    <SpecCard
                      label="Колеса"
                      value={vehicle.modelVariant.wheelSizes || "Не указаны"}
                    />
                    <SpecCard
                      label="Тормоза"
                      value={vehicle.modelVariant.brakeSystem || "Не указаны"}
                    />
                    <SpecCard
                      label="Шаг цепи"
                      value={vehicle.modelVariant.chainPitch || "Не указан"}
                    />
                    <SpecCard
                      label="Стоковые звезды"
                      value={vehicle.modelVariant.stockSprockets || "Не указаны"}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Дерево узлов
                </h2>
                <button
                  type="button"
                  onClick={() => setIsServiceLogModalOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Открыть журнал обслуживания
                </button>
              </div>

              {isNodeTreeLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка дерева узлов...</p>
              ) : null}

              {!isNodeTreeLoading && nodeTreeError ? (
                <p className="mt-4 text-sm text-red-600">{nodeTreeError}</p>
              ) : null}

              {!isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Дерево узлов пока не найдено.
                </p>
              ) : null}

              {!isNodeTreeLoading && !nodeTreeError && nodeTree.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {nodeTree.map((rootNode) => {
                    const hasChildren = rootNode.children.length > 0;
                    const isExpanded = Boolean(expandedNodes[rootNode.id]);

                    return (
                      <div
                        key={rootNode.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleNodeExpansion(rootNode.id)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                                  aria-label={
                                    isExpanded ? "Свернуть ветку" : "Развернуть ветку"
                                  }
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center text-gray-400">
                                  •
                                </span>
                              )}
                              <h3 className="truncate text-[15px] font-semibold text-gray-950">
                                {rootNode.name}
                              </h3>
                            </div>
                            {getLeafStatusExplanation(rootNode) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedStatusExplanationNode(rootNode)
                                }
                                className="mt-1.5 pl-8 text-left text-xs text-gray-500 underline decoration-dotted underline-offset-2 transition hover:text-gray-700"
                              >
                                {getLeafStatusExplanation(rootNode)}
                              </button>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {rootNode.effectiveStatus ? (
                              <span
                                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium ${getStatusBadgeClassName(rootNode.effectiveStatus)}`}
                              >
                                {getTopNodeStatusBadgeLabel(rootNode.effectiveStatus)}
                              </span>
                            ) : null}
                            {!hasChildren ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openAddServiceEventFromLeafNode(rootNode.id)
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                aria-label="Добавить сервисное событие"
                                title="Добавить сервисное событие"
                              >
                                +
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {hasChildren && isExpanded ? (
                          <div className="mt-4 space-y-2.5">
                            {rootNode.children.map((child) =>
                              renderChildTreeNode(child, 0)
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

          </div>
        ) : null}
      </div>

      {isServiceLogModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 py-6 sm:items-center">
          <div className="w-full max-w-6xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                  Журнал обслуживания
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  История сервисных операций и обновлений состояния
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetServiceEventForm();
                    setServiceEventFormError("");
                    setServiceEventFormSuccess("");
                    setIsAddServiceEventModalOpen(true);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-950 px-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Добавить сервисное событие
                </button>
                <button
                  type="button"
                  onClick={() => setIsServiceLogModalOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              {serviceEventFormSuccess ? (
                <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {serviceEventFormSuccess}
                </p>
              ) : null}

              {isServiceEventsLoading ? (
                <p className="text-sm text-gray-600">Загрузка журнала обслуживания...</p>
              ) : null}

              {!isServiceEventsLoading && serviceEventsError ? (
                <p className="text-sm text-red-600">{serviceEventsError}</p>
              ) : null}

              {!isServiceEventsLoading &&
              !serviceEventsError &&
              serviceEvents.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Сервисных событий пока нет.
                </div>
              ) : null}

              {!isServiceEventsLoading &&
              !serviceEventsError &&
              serviceEvents.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                    <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-12">
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Дата с
                      <input
                        type="date"
                        value={serviceEventsFilters.dateFrom}
                        onChange={(event) =>
                          updateServiceEventsFilter("dateFrom", event.target.value)
                        }
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Дата по
                      <input
                        type="date"
                        value={serviceEventsFilters.dateTo}
                        onChange={(event) =>
                          updateServiceEventsFilter("dateTo", event.target.value)
                        }
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-3">
                      Узел
                      <input
                        value={serviceEventsFilters.node}
                        onChange={(event) =>
                          updateServiceEventsFilter("node", event.target.value)
                        }
                        placeholder="Первые буквы узла"
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Тип записи
                      <select
                        value={serviceEventsFilters.eventKind}
                        onChange={(event) =>
                          updateServiceEventsFilter("eventKind", event.target.value)
                        }
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      >
                        <option value="">Все</option>
                        <option value="SERVICE">SERVICE - Обслуживание</option>
                        <option value="STATE_UPDATE">STATE_UPDATE - Обновление состояния</option>
                      </select>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Тип сервиса
                      <input
                        value={serviceEventsFilters.serviceType}
                        onChange={(event) =>
                          updateServiceEventsFilter("serviceType", event.target.value)
                        }
                        placeholder="Текст типа сервиса"
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <div className="flex items-end lg:col-span-1">
                      <button
                        type="button"
                        onClick={resetServiceEventsFilters}
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                      >
                        Сбросить
                      </button>
                    </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("eventDate")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Дата {getServiceEventsSortIndicator("eventDate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("eventKind")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Тип {getServiceEventsSortIndicator("eventKind")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("serviceType")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Сервис {getServiceEventsSortIndicator("serviceType")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("node")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Узел {getServiceEventsSortIndicator("node")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("odometer")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Пробег {getServiceEventsSortIndicator("odometer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("engineHours")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Моточасы {getServiceEventsSortIndicator("engineHours")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("cost")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Стоимость {getServiceEventsSortIndicator("cost")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("comment")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Комментарий {getServiceEventsSortIndicator("comment")}
                      </button>
                    </div>

                    {filteredAndSortedServiceEvents.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                        Нет событий по текущим фильтрам.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {serviceEventsByMonth.map((group) => (
                          <section key={`${group.label}-${group.monthStart}`} className="space-y-3">
                            <div className="sticky top-0 z-[1] -mx-1 px-1 py-1">
                              <div className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                                {group.label}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                                Обслуживание: {group.summary.serviceCount}
                              </span>
                              <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                                Обновления состояния: {group.summary.stateUpdateCount}
                              </span>
                              {getMonthlyCostLabel(group.summary.costByCurrency) ? (
                                <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                                  Расходы: {getMonthlyCostLabel(group.summary.costByCurrency)}
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-4">
                              {group.events.map((serviceEvent) => {
                                const isStateUpdate = serviceEvent.eventKind === "STATE_UPDATE";

                                return (
                                  <article key={serviceEvent.id} className="relative pl-10">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                                    <div
                                      className={`absolute left-[9px] top-6 h-3 w-3 rounded-full border-2 ${
                                        isStateUpdate
                                          ? "border-gray-300 bg-white"
                                          : "border-blue-500 bg-blue-100"
                                      }`}
                                    />

                                    <div
                                      className={`rounded-2xl border px-4 py-3 sm:px-5 ${
                                        isStateUpdate
                                          ? "border-gray-200 bg-gray-50/70"
                                          : "border-gray-200 bg-white shadow-sm"
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                              isStateUpdate
                                                ? "border-gray-300 bg-gray-100 text-gray-600"
                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                            }`}
                                          >
                                            {isStateUpdate ? "STATE_UPDATE" : "SERVICE"}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {formatDate(serviceEvent.eventDate)}
                                          </span>
                                        </div>
                                        <span
                                          className={`text-xs ${
                                            isStateUpdate ? "text-gray-500" : "text-gray-600"
                                          }`}
                                        >
                                          {serviceEvent.node?.name || serviceEvent.nodeId}
                                        </span>
                                      </div>

                                      <div className="mt-2">
                                        {isStateUpdate ? (
                                          <>
                                            <h3 className="text-sm font-medium text-gray-700">
                                              Обновление состояния
                                            </h3>
                                            <p className="mt-1 text-xs text-gray-500">
                                              {getStateUpdateSummary(serviceEvent)}
                                            </p>
                                          </>
                                        ) : (
                                          <h3 className="text-base font-semibold text-gray-950">
                                            {serviceEvent.serviceType}
                                          </h3>
                                        )}
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
                                          Пробег: {serviceEvent.odometer} км
                                        </span>
                                        {serviceEvent.engineHours !== null ? (
                                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
                                            Моточасы: {serviceEvent.engineHours}
                                          </span>
                                        ) : null}
                                        {!isStateUpdate &&
                                        serviceEvent.costAmount !== null &&
                                        serviceEvent.currency ? (
                                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
                                            Стоимость: {serviceEvent.costAmount} {serviceEvent.currency}
                                          </span>
                                        ) : null}
                                      </div>

                                      {serviceEvent.comment ? (
                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                          <p
                                            className={`text-sm ${isStateUpdate ? "text-gray-500" : "text-gray-700"}`}
                                          >
                                            {expandedComments[serviceEvent.id]
                                              ? serviceEvent.comment
                                              : `${serviceEvent.comment.slice(0, 120)}${serviceEvent.comment.length > 120 ? "..." : ""}`}
                                          </p>
                                          {serviceEvent.comment.length > 120 ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedComments((prev) => ({
                                                  ...prev,
                                                  [serviceEvent.id]: !prev[serviceEvent.id],
                                                }))
                                              }
                                              className="mt-1 text-xs font-medium text-gray-600 underline decoration-dotted underline-offset-2 transition hover:text-gray-900"
                                            >
                                              {expandedComments[serviceEvent.id]
                                                ? "Скрыть"
                                                : "Показать"}
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                ) : null}
              </div>
            </div>
          </div>
      ) : null}

      {isAddServiceEventModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Добавить сервисное событие
              </h2>
              <button
                type="button"
                onClick={() => setIsAddServiceEventModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <h3 className="text-sm font-semibold text-gray-950">Выбор узла</h3>
                  <div className="mt-3 grid gap-4">
                    {nodeSelectLevels.map((nodesAtLevel, levelIndex) => (
                      <InputField
                        key={`level-${levelIndex}`}
                        label={`Уровень ${levelIndex + 1}`}
                      >
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
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        >
                          <option value="">{`Выберите узел уровня ${levelIndex + 1}`}</option>
                          {nodesAtLevel.map((nodeAtLevel) => (
                            <option key={nodeAtLevel.id} value={nodeAtLevel.id}>
                              {nodeAtLevel.name}
                            </option>
                          ))}
                        </select>
                      </InputField>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-950">Данные события</h3>
                  <div className="mt-3 grid gap-4.5 sm:grid-cols-2">
                    <InputField label="Тип сервиса">
                      <input
                        value={serviceType}
                        onChange={(event) => setServiceType(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Например: Oil change"
                      />
                    </InputField>

                    <InputField label="Дата события">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        max={todayDate}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                      />
                    </InputField>

                    <InputField label="Пробег, км">
                      <input
                        value={odometer}
                        onChange={(event) => setOdometer(event.target.value)}
                        inputMode="numeric"
                        max={vehicle?.odometer ?? undefined}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Например: 15000"
                      />
                    </InputField>

                    <InputField label="Моточасы">
                      <input
                        value={engineHours}
                        onChange={(event) => setEngineHours(event.target.value)}
                        inputMode="numeric"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Если применимо"
                      />
                    </InputField>

                    <InputField label="Стоимость">
                      <input
                        value={costAmount}
                        onChange={(event) => setCostAmount(event.target.value)}
                        inputMode="decimal"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Например: 120.5"
                      />
                    </InputField>

                    <InputField label="Валюта">
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                      >
                        <option value="">Не выбрана</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </InputField>
                  </div>

                  <div className="mt-4">
                    <InputField label="Комментарий">
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Опционально"
                      />
                    </InputField>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleCreateServiceEvent}
                  disabled={
                    isCreatingServiceEvent ||
                    !isLeafNodeSelected ||
                    !eventDate
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-950 px-6 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingServiceEvent ? "Сохраняем..." : "Добавить событие"}
                </button>

                {!isLeafNodeSelected && selectedFinalNode ? (
                  <p className="mt-3 text-sm text-amber-700">
                    Для создания события выберите узел последнего уровня.
                  </p>
                ) : null}

                {serviceEventFormError ? (
                  <p className="mt-3 text-sm text-red-600">{serviceEventFormError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {selectedStatusExplanationNode?.statusExplanation ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Пояснение расчета: {selectedStatusExplanationNode.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedStatusExplanationNode(null)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-700">
              {selectedStatusExplanationNode.statusExplanation.reasonShort ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Кратко
                  </div>
                  <div className="mt-1 font-medium text-gray-900">
                    {selectedStatusExplanationNode.statusExplanation.reasonShort}
                  </div>
                </div>
              ) : null}

              {selectedStatusExplanationNode.statusExplanation.reasonDetailed ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Подробно
                  </div>
                  <p className="mt-1 text-gray-800">
                    {selectedStatusExplanationNode.statusExplanation.reasonDetailed}
                  </p>
                </div>
              ) : null}

              {selectedStatusExplanationNode.statusExplanation.triggeredBy ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Сработавшее измерение
                  </div>
                  <p className="mt-1 text-gray-800">
                    {getStatusExplanationTriggeredByLabel(
                      selectedStatusExplanationNode.statusExplanation.triggeredBy
                    )}
                  </p>
                </div>
              ) : null}

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Детали расчета
                </div>
                <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-gray-600">
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
                      {selectedStatusExplanationNode.statusExplanation.current.odometer !==
                        null ||
                      selectedStatusExplanationNode.statusExplanation.lastService
                        ?.odometer !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.intervalKm !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.warningKm !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.elapsedKm !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.remainingKm !== null ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-900">Пробег</td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.current.odometer !==
                            null
                              ? `${selectedStatusExplanationNode.statusExplanation.current.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.lastService
                              ?.odometer !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.lastService.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.intervalKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule.intervalKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.warningKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule.warningKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.elapsedKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage.elapsedKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.remainingKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage.remainingKm} км`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {selectedStatusExplanationNode.statusExplanation.current.engineHours !==
                        null ||
                      selectedStatusExplanationNode.statusExplanation.lastService
                        ?.engineHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.intervalHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.warningHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.elapsedHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.remainingHours !== null ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-900">Моточасы</td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.current
                              .engineHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.current.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.lastService
                              ?.engineHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.lastService.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.intervalHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule.intervalHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.warningHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule.warningHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.elapsedHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage.elapsedHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.remainingHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage.remainingHours} ч`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {selectedStatusExplanationNode.statusExplanation.rule
                        ?.intervalDays !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.warningDays !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.elapsedDays !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.remainingDays !== null ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-900">Время</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.intervalDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule.intervalDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.warningDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule.warningDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.elapsedDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage.elapsedDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.remainingDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage.remainingDays} дн`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      <tr className="border-t border-gray-200">
                        <td className="px-3 py-2 font-medium text-gray-900">Дата расчета</td>
                        <td className="px-3 py-2">
                          {formatDate(selectedStatusExplanationNode.statusExplanation.current.date)}
                        </td>
                        <td className="px-3 py-2">
                          {selectedStatusExplanationNode.statusExplanation.lastService
                            ?.eventDate
                            ? formatDate(
                                selectedStatusExplanationNode.statusExplanation.lastService.eventDate
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-2" colSpan={4}>
                          Trigger mode:{" "}
                          {selectedStatusExplanationNode.statusExplanation.triggerMode ||
                            "—"}
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
          <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Редактировать профиль
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
                        usageType: event.target.value as VehicleProfileForm["usageType"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    <option value="CITY">Город</option>
                    <option value="HIGHWAY">Трасса</option>
                    <option value="MIXED">Смешанный</option>
                    <option value="OFFROAD">Off-road</option>
                  </select>
                </InputField>

                <InputField label="Стиль езды">
                  <select
                    value={profileForm.ridingStyle}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        ridingStyle: event.target.value as VehicleProfileForm["ridingStyle"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    <option value="CALM">Спокойный</option>
                    <option value="ACTIVE">Активный</option>
                    <option value="AGGRESSIVE">Агрессивный</option>
                  </select>
                </InputField>

                <InputField label="Нагрузка">
                  <select
                    value={profileForm.loadType}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        loadType: event.target.value as VehicleProfileForm["loadType"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    <option value="SOLO">Один</option>
                    <option value="PASSENGER">С пассажиром</option>
                    <option value="LUGGAGE">С багажом</option>
                    <option value="PASSENGER_LUGGAGE">Пассажир и багаж</option>
                  </select>
                </InputField>

                <InputField label="Интенсивность">
                  <select
                    value={profileForm.usageIntensity}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        usageIntensity: event.target.value as VehicleProfileForm["usageIntensity"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    <option value="LOW">Низкая</option>
                    <option value="MEDIUM">Средняя</option>
                    <option value="HIGH">Высокая</option>
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
                  <p className="mt-3 text-sm text-red-600">{profileFormError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function InputField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900">
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

function formatUsageType(value: string) {
  switch (value) {
    case "CITY":
      return "Город";
    case "HIGHWAY":
      return "Трасса";
    case "MIXED":
      return "Смешанный";
    case "OFFROAD":
      return "Off-road";
    default:
      return value;
  }
}

function formatRidingStyle(value: string) {
  switch (value) {
    case "CALM":
      return "Спокойный";
    case "ACTIVE":
      return "Активный";
    case "AGGRESSIVE":
      return "Агрессивный";
    default:
      return value;
  }
}

function formatLoadType(value: string) {
  switch (value) {
    case "SOLO":
      return "Один";
    case "PASSENGER":
      return "С пассажиром";
    case "LUGGAGE":
      return "С багажом";
    case "PASSENGER_LUGGAGE":
      return "Пассажир и багаж";
    default:
      return value;
  }
}

function formatUsageIntensity(value: string) {
  switch (value) {
    case "LOW":
      return "Низкая";
    case "MEDIUM":
      return "Средняя";
    case "HIGH":
      return "Высокая";
    default:
      return value;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU");
}

function getStatusBadgeClassName(
  status: "OK" | "SOON" | "OVERDUE" | "RECENTLY_REPLACED"
) {
  switch (status) {
    case "OVERDUE":
      return "border-red-600 bg-red-100 text-red-800";
    case "SOON":
      return "border-amber-500 bg-amber-100 text-amber-800";
    case "RECENTLY_REPLACED":
      return "border-emerald-600 bg-emerald-100 text-emerald-800";
    case "OK":
      return "border-green-600 bg-green-100 text-green-800";
    default:
      return "border-gray-300 bg-gray-100 text-gray-700";
  }
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

