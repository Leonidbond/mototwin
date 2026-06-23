"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getPageHelp,
  resolvePageKeyFromWebPath,
  type FeedbackTypeKey,
} from "@mototwin/domain";
import { OPEN_APP_HELP_EVENT } from "./app-help-trigger";

const FALLBACK_HELP = {
  title: "Помощь по MotoTwin",
  summary:
    "MotoTwin — цифровой двойник мотоцикла: ведите ТО, расходы и список покупок по каждому мотоциклу.",
  steps: [
    "Откройте мотоцикл из «Мой гараж».",
    "Проверьте «Требует внимания» и дерево узлов.",
    "Добавляйте сервисные события и позиции в список покупок.",
  ],
  tips: undefined as string[] | undefined,
};

const FEEDBACK_TYPES: { value: FeedbackTypeKey; label: string }[] = [
  { value: "PROBLEM", label: "Проблема" },
  { value: "IDEA", label: "Идея" },
  { value: "QUESTION", label: "Вопрос" },
];

type Mode = "help" | "feedback";

function extractVehicleId(pathname: string): string | null {
  const match = pathname.match(/\/vehicles\/([^/]+)/);
  return match?.[1] ?? null;
}

export function AppHelpFab() {
  const pathname = usePathname() || "/";
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("help");

  const help = useMemo(() => {
    const key = resolvePageKeyFromWebPath(pathname);
    const resolved = key ? getPageHelp(key, "web") : null;
    return resolved
      ? { title: resolved.title, ...resolved.content }
      : FALLBACK_HELP;
  }, [pathname]);

  const pageKey = useMemo(() => resolvePageKeyFromWebPath(pathname), [pathname]);

  useEffect(() => {
    const onOpen = () => {
      setMode("help");
      setIsOpen(true);
    };
    window.addEventListener(OPEN_APP_HELP_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_APP_HELP_EVENT, onOpen);
  }, []);

  const close = () => {
    setIsOpen(false);
    setMode("help");
  };

  return (
    <>
      <button
        type="button"
        aria-label="Открыть помощь и обратную связь"
        title="Помощь"
        onClick={() => {
          setMode("help");
          setIsOpen(true);
        }}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 bg-white text-lg font-bold text-gray-800 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        ?
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Помощь и обратная связь MotoTwin"
          onClick={close}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-950">{help.title}</h2>
              <button
                type="button"
                onClick={close}
                className="rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
              <TabButton active={mode === "help"} onClick={() => setMode("help")}>
                Помощь
              </TabButton>
              <TabButton active={mode === "feedback"} onClick={() => setMode("feedback")}>
                Обратная связь
              </TabButton>
            </div>

            {mode === "help" ? (
              <HelpContent help={help} />
            ) : (
              <FeedbackForm
                pageKey={pageKey}
                routePath={pathname}
                vehicleId={extractVehicleId(pathname)}
                onDone={close}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function HelpContent({
  help,
}: {
  help: { summary: string; steps: string[]; tips?: string[] };
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">{help.summary}</p>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Что можно сделать
      </h3>
      <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        {help.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {help.tips && help.tips.length > 0 ? (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          {help.tips.map((tip) => (
            <p key={tip} className="mb-1 last:mb-0">
              💡 {tip}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FeedbackForm({
  pageKey,
  routePath,
  vehicleId,
  onDone,
}: {
  pageKey: string | null;
  routePath: string;
  vehicleId: string | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<FeedbackTypeKey>("PROBLEM");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setError("Опишите подробнее — минимум 5 символов.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          message: trimmed,
          pageKey: pageKey ?? "home",
          platform: "web",
          routePath,
          appVersion: null,
          locale: typeof navigator !== "undefined" ? navigator.language : null,
          vehicleId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        if (response.status === 401) {
          setError("Чтобы отправить обратную связь, войдите в аккаунт.");
        } else {
          setError(payload?.error ?? "Не удалось отправить. Попробуйте позже.");
        }
        return;
      }
      setDone(true);
      setMessage("");
    } catch {
      setError("Сетевая ошибка. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
        Спасибо! Обращение отправлено — мы его обязательно прочитаем.
        <div className="mt-3">
          <button
            type="button"
            onClick={onDone}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Расскажите о проблеме или идее — данные о текущей странице подставятся автоматически.
      </p>
      <div className="flex gap-2">
        {FEEDBACK_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setType(option.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              type === option.value
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={5}
        maxLength={5000}
        placeholder="Опишите, что случилось или что хотелось бы улучшить…"
        className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-900 outline-none focus:border-gray-500"
      />
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
      >
        {submitting ? "Отправляем…" : "Отправить"}
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-medium transition ${
        active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
