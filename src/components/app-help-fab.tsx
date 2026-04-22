"use client";

import { useMemo, useState } from "react";

type HelpIconRow = {
  icon: string;
  label: string;
};

const HELP_ICONS: HelpIconRow[] = [
  { icon: "✏️", label: "Редактировать" },
  { icon: "🗑️", label: "Удалить / Свалка" },
  { icon: "↩️", label: "Восстановить из Свалки" },
  { icon: "🕘", label: "Журнал обслуживания" },
  { icon: "🛒", label: "Добавить в список покупок" },
  { icon: "🔧", label: "Добавить сервисное событие" },
  { icon: "📦", label: "Добавить комплект" },
  { icon: "↗️", label: "Открыть контекст узла" },
];

const WORKFLOW_STEPS = [
  "1) Откройте мотоцикл из «Мой гараж».",
  "2) Проверьте «Требует внимания» и дерево узлов.",
  "3) Добавьте сервисное событие или позицию в список покупок.",
  "4) При установке позиции переведите ее в «Установлено» и сохраните событие.",
  "5) Периодически обновляйте «Текущее состояние» и ведите журнал.",
];

export function AppHelpFab() {
  const [isOpen, setIsOpen] = useState(false);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <>
      <button
        type="button"
        aria-label="Открыть подсказки по иконкам и порядку работы"
        title="Подсказки"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 bg-white text-lg font-bold text-gray-800 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        ?
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Подсказки по интерфейсу MotoTwin"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-950">Подсказки по интерфейсу</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
                aria-label="Закрыть подсказки"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Основные иконки и рекомендуемый порядок работы в MotoTwin.
            </p>

            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {HELP_ICONS.map((item) => (
                <div key={item.label} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <span className="mr-2" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="text-gray-800">{item.label}</span>
                </div>
              ))}
            </div>

            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Порядок работы</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {WORKFLOW_STEPS.map((step) => (
                <p key={step}>{step}</p>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-400">MotoTwin {currentYear}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
