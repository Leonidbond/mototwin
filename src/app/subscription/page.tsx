"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionPlan } from "@mototwin/types";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { productSemanticColors } from "@mototwin/design-tokens";
import { BackButton } from "@/components/navigation/BackButton";

const api = createWebApiClient();

type PlanCard = {
  plan: SubscriptionPlan;
  title: string;
  motoLimit: string;
  nodes: string;
  serviceLog: string;
  serviceEventMode: string;
};

const PLAN_CARDS: PlanCard[] = [
  {
    plan: "FREE",
    title: "Free",
    motoLimit: "1 мотоцикл",
    nodes: "Только ТОП-узлы (read-only)",
    serviceLog: "Последние 10 событий",
    serviceEventMode: "Только быстрый режим",
  },
  {
    plan: "RIDER",
    title: "Rider",
    motoLimit: "До 3 мотоциклов",
    nodes: "ТОП-узлы (выбор разрешен)",
    serviceLog: "Без лимита",
    serviceEventMode: "Быстрый и подробный",
  },
  {
    plan: "PRO",
    title: "Pro",
    motoLimit: "Без ограничений",
    nodes: "Полное дерево узлов",
    serviceLog: "Без лимита",
    serviceEventMode: "Быстрый и подробный",
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("FREE");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void api
      .getSubscriptionCurrent()
      .then((subscription) => {
        if (cancelled) return;
        setCurrentPlan(subscription.plan);
        setTrialEndsAt(subscription.trialEndsAt);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить тариф.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trialLabel = useMemo(() => {
    if (!trialEndsAt) return "—";
    return new Date(trialEndsAt).toLocaleDateString("ru-RU");
  }, [trialEndsAt]);

  const closePage = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  const selectPlan = async (plan: SubscriptionPlan) => {
    try {
      const updated = await api.updateSubscriptionPlan({ plan });
      setCurrentPlan(updated.plan);
      setTrialEndsAt(updated.trialEndsAt);
      setError("");
      setNotice(`Тариф ${updated.plan} активирован.`);
      window.setTimeout(() => setNotice(""), 1800);
    } catch {
      setError("Не удалось обновить тариф.");
    }
  };

  return (
    <main
      className="min-h-screen px-6 py-12"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={closePage} label="Закрыть" />
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.card }}>
          <h1 className="text-2xl font-semibold text-gray-950">Тарифы MotoTwin</h1>
          <p className="mt-2 text-sm text-gray-600">
            Текущий тариф: <strong>{currentPlan}</strong>. Пробный доступ до: <strong>{trialLabel}</strong>.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            В Free показываются последние 10 сервисных событий, старые записи не удаляются и снова доступны после апгрейда.
          </p>
          {notice ? <p className="mt-2 text-xs text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_CARDS.map((card) => {
            const selected = card.plan === currentPlan;
            return (
              <section
                key={card.plan}
                className="rounded-2xl border p-5"
                style={{
                  borderColor: selected ? "#fb923c" : productSemanticColors.border,
                  backgroundColor: productSemanticColors.card,
                }}
              >
                <h2 className="text-lg font-semibold text-gray-950">{card.title}</h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>{card.motoLimit}</li>
                  <li>{card.nodes}</li>
                  <li>{card.serviceLog}</li>
                  <li>{card.serviceEventMode}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => void selectPlan(card.plan)}
                  className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  {selected ? "Активен" : `Выбрать ${card.title}`}
                </button>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
