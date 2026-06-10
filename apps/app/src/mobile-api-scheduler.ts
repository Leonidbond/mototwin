type MobileApiPriority = "high" | "normal" | "low";

type QueuedTask<T> = {
  priority: MobileApiPriority;
  pathHint: string | null;
  fn: (abortSignal?: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  abortController: AbortController | null;
};

const MAX_CONCURRENT = 2;

let running = 0;
const queue: Array<QueuedTask<unknown>> = [];
const runningTaskAbortControllers: AbortController[] = [];
const runningLowPriorityAbortControllers: AbortController[] = [];

function priorityRank(priority: MobileApiPriority): number {
  if (priority === "high") return 0;
  if (priority === "normal") return 1;
  return 2;
}

function pumpQueue(): void {
  queue.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift() as QueuedTask<unknown>;
    running += 1;

    const abortController = new AbortController();
    runningTaskAbortControllers.push(abortController);
    if (task.priority === "low") {
      runningLowPriorityAbortControllers.push(abortController);
    }

    void task
      .fn(abortController?.signal)
      .then(task.resolve, task.reject)
      .finally(() => {
        const runningIdx = runningTaskAbortControllers.indexOf(abortController);
        if (runningIdx >= 0) {
          runningTaskAbortControllers.splice(runningIdx, 1);
        }
        if (abortController) {
          const idx = runningLowPriorityAbortControllers.indexOf(abortController);
          if (idx >= 0) {
            runningLowPriorityAbortControllers.splice(idx, 1);
          }
        }
        running -= 1;
        pumpQueue();
      });
  }
}

/** Serialize mobile HTTP calls so large payloads (node-tree) do not starve critical reads. */
export function scheduleMobileApiRequest<T>(
  fn: (abortSignal?: AbortSignal) => Promise<T>,
  priority: MobileApiPriority = "normal",
  pathHint: string | null = null
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      priority,
      pathHint,
      fn,
      resolve: resolve as (value: unknown) => void,
      reject,
      abortController: null,
    });
    pumpQueue();
  });
}

export function priorityForMobileApiPath(path: string): MobileApiPriority {
  if (path.startsWith("/api/auth/")) {
    return "high";
  }
  if (path === "/api/garage") {
    return "high";
  }
  if (/^\/api\/vehicles\/[^/?]+$/.test(path)) {
    return "high";
  }
  if (/\/vehicles\/[^/]+\/trash$/.test(path)) {
    return "high";
  }
  if (path.includes("/usage-update") || path.includes("/state")) {
    return "high";
  }
  if (path.includes("/wishlist")) {
    return "high";
  }
  if (path.startsWith("/api/expenses")) {
    return "high";
  }
  if (path.includes("/service-events")) {
    return "high";
  }
  // node-tree is required for service-event forms and wishlist install handoff — not "low".
  if (path.includes("/api/nodes/service")) {
    return "low";
  }
  return "normal";
}

/** Drop queued and in-flight low-priority work when navigating to a priority screen. */
export function cancelLowPriorityMobileApiRequests(): void {
  for (const controller of runningLowPriorityAbortControllers) {
    controller.abort();
  }
  runningLowPriorityAbortControllers.length = 0;

  if (queue.length === 0) {
    return;
  }
  const kept: Array<QueuedTask<unknown>> = [];
  for (const task of queue) {
    if (task.priority === "low") {
      task.reject(new Error("Запрос отменён: открыт приоритетный экран."));
    } else {
      kept.push(task);
    }
  }
  queue.length = 0;
  queue.push(...kept);
  pumpQueue();
}

export function cancelAllMobileApiRequests(
  reason = "Запрос отменён: приложение свёрнуто."
): void {
  for (const controller of runningTaskAbortControllers) {
    controller.abort();
  }
  runningTaskAbortControllers.length = 0;
  runningLowPriorityAbortControllers.length = 0;
  if (queue.length === 0) {
    return;
  }
  const pending = [...queue];
  queue.length = 0;
  for (const task of pending) {
    task.reject(new Error(reason));
  }
}
