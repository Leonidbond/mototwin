"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import { clearWebSessionCache } from "@/lib/web-api-dedup";

type WebAuthReadyProviderProps = {
  children: ReactNode;
};

/**
 * After Google OAuth, NextAuth sets its own cookie but API routes expect
 * `mototwin_session` (same as email/password login). Sync once before pages fetch data.
 */
export function WebAuthReadyProvider({ children }: WebAuthReadyProviderProps) {
  const { status } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/sync-web-session", {
          credentials: "include",
          cache: "no-store",
        });
        if (response.ok) {
          clearWebSessionCache();
        }
      } catch {
        // Protected pages will surface auth errors via AuthGate / API.
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (!ready) {
    return (
      <div
        className="min-h-full flex items-center justify-center flex-1"
        style={{ backgroundColor: "#080d12", color: "#8b9aab" }}
      >
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}
