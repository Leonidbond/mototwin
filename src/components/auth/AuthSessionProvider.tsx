"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Required for reliable `signIn()` CSRF + OAuth redirects from the login page. */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
