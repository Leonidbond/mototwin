/**
 * Wrap the global `fetch` with a hard timeout via AbortController. Without
 * this, an upstream that stalls would tie up a request thread indefinitely —
 * see MT-SEC-015 in docs/security/findings.md.
 */
export type FetchWithTimeoutInit = RequestInit & {
  /** Hard timeout in milliseconds. Defaults to 8000 ms. */
  timeoutMs?: number;
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
): Promise<Response> {
  const { timeoutMs = 8_000, signal, ...rest } = init;

  if (timeoutMs <= 0) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const upstreamAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", upstreamAbort, { once: true });
    }
  }
  const timer = setTimeout(() => {
    controller.abort(new Error(`fetch timed out after ${timeoutMs} ms`));
  }, timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", upstreamAbort);
  }
}
