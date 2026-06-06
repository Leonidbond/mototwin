"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, type ReactNode } from "react";
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
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || hasSyncedRef.current) {
      return;
    }
    hasSyncedRef.current = true;
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
      }
    })();
  }, [status]);

  return <>{children}</>;
}
