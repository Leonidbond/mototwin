import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolveAuthenticatedUserId } from "@/lib/auth/request-auth";

export default async function GarageLayout({ children }: { children: ReactNode }) {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    redirect("/login?next=/garage");
  }

  return children;
}
