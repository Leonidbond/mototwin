"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getWebSessionState } from "@/lib/web-api-dedup";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * Non-blocking auth probe: pages stay interactive while auth state is verified.
 * Redirects only on confirmed unauthenticated state.
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [authProbeError, setAuthProbeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionState = await getWebSessionState();
        if (cancelled) {
          return;
        }
        if (!sessionState.authenticated) {
          const next = encodeURIComponent(
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/garage"
          );
          router.replace(`/login?next=${next}`);
          return;
        }
        setAuthProbeError("");
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "";
        setAuthProbeError(message || "Не удалось проверить сессию.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      {authProbeError ? (
      <div
        className="mx-4 mt-4 rounded-lg border px-3 py-2 text-sm"
        style={{
          borderColor: "rgba(245, 158, 11, 0.4)",
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          color: "#fbbf24",
        }}
      >
        {authProbeError}
      </div>
      ) : null}
      {children}
    </>
  );
}
