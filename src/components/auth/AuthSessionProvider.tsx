"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { WebAuthReadyProvider } from "./WebAuthReadyProvider";

/** Required for reliable `signIn()` CSRF + OAuth redirects from the login page. */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <WebAuthReadyProvider>{children}</WebAuthReadyProvider>
    </SessionProvider>
  );
}
