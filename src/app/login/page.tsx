import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

function sanitizeNextPath(rawNext: string | undefined): string {
  if (!rawNext?.startsWith("/")) {
    return "/garage";
  }
  const disallowedPrefixes = ["/login", "/register", "/forgot-password", "/reset-password"];
  if (disallowedPrefixes.some((prefix) => rawNext.startsWith(prefix))) {
    return "/garage";
  }
  return rawNext;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const oauthErrorCode = params.error ?? null;

  return <LoginForm nextPath={nextPath} oauthErrorCode={oauthErrorCode} />;
}
