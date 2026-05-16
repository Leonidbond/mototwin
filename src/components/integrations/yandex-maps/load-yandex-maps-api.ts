const SCRIPT_ID = "mototwin-yandex-maps-api";

let loadPromise: Promise<void> | null = null;

function rejectIfNoWindow(): void {
  if (typeof window === "undefined") {
    throw new Error("Yandex Maps API is only available in the browser.");
  }
}

/**
 * Подгружает JS API 2.1 один раз на вкладку. Возвращает promise, резолвящийся после `ymaps.ready`.
 */
export function loadYandexMapsApi(apiKey: string): Promise<void> {
  rejectIfNoWindow();

  if (typeof ymaps !== "undefined") {
    return new Promise((resolve) => {
      ymaps.ready(() => resolve());
    });
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        ymaps.ready(() => resolve());
      });
      existing.addEventListener("error", () => reject(new Error("Не удалось загрузить Яндекс.Карты.")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.onload = () => {
      ymaps.ready(() => resolve());
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Не удалось загрузить Яндекс.Карты."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
