import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/garage";
  const oauthErrorCode = params.error ?? null;

  return <LoginForm nextPath={nextPath} oauthErrorCode={oauthErrorCode} />;
}
