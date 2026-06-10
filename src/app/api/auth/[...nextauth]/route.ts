import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth/authjs";
import { maybeRedirectMobileYandexOAuth } from "@/lib/auth/yandex-callback-bridge";

type RouteContext = {
  params: Promise<{ nextauth?: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const segments = params.nextauth ?? [];
  const mobileRedirect = maybeRedirectMobileYandexOAuth(request, segments);
  if (mobileRedirect) {
    return mobileRedirect;
  }
  return handlers.GET(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handlers.POST(request, context);
}
