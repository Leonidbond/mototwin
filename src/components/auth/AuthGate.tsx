"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createWebApiClient } from "@/lib/create-web-api-client";

const api = createWebApiClient();

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
        await api.getAuthMe();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
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
