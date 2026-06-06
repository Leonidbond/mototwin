"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getWebSession } from "@/lib/web-api-dedup";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * Redirects to /login when session is missing (production and dev without dev switcher).
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getWebSession();
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "";
        if (message.toLowerCase().includes("требуется вход")) {
          router.replace("/login");
          return;
        }
        router.replace(
          `/login?next=${encodeURIComponent(
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/garage"
          )}&error=${encodeURIComponent(message || "Не удалось проверить сессию.")}`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div
        className="min-h-full flex items-center justify-center"
        style={{ backgroundColor: "#080d12", color: "#8b9aab" }}
      >
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}
