import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolveAuthenticatedUserId } from "@/lib/auth/request-auth";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    redirect("/login?next=/profile");
  }
  return children;
}
