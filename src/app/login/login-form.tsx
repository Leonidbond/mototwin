"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { clearWebSessionCache } from "@/lib/web-api-dedup";
import { productSemanticColors } from "@mototwin/design-tokens";

const api = createWebApiClient({ redirectOn401: false });

function resolveOauthErrorMessage(oauthErrorCode: string | null): string {
  if (!oauthErrorCode) return "";
  const decoded = decodeURIComponent(oauthErrorCode);
  if (decoded === "OAuthCreateAccount") {
    return "Не удалось создать аккаунт через Google. Попробуйте ещё раз или войдите по email.";
  }
  if (decoded === "AccessDenied") {
    return "Google отклонил вход. Проверьте, что ваш Gmail добавлен в Test users приложения.";
  }
  if (decoded === "OAuthAccountNotLinked") {
    return "Этот Google-аккаунт не привязан. Войдите по email и паролю или используйте тот же Gmail, что при регистрации.";
  }
  if (decoded === "Callback") {
    return "Google вернул ошибку при входе. Попробуйте ещё раз через минуту.";
  }
  if (decoded === "Configuration") {
    return "OAuth на сервере настроен некорректно. Напишите в поддержку.";
  }
  return decoded;
}

type LoginFormProps = {
  nextPath: string;
  oauthErrorCode: string | null;
};

export function LoginForm({ nextPath, oauthErrorCode }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => resolveOauthErrorMessage(oauthErrorCode));
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | "yandex" | null>(null);
  const callbackPath = nextPath.startsWith("/") ? nextPath : "/garage";
  const isBusy = loading || oauthLoadingProvider !== null;

  useEffect(() => {
    clearWebSessionCache();
  }, []);

  useEffect(() => {
    setError(resolveOauthErrorMessage(oauthErrorCode));
  }, [oauthErrorCode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login({ email, password });
      clearWebSessionCache();
      router.replace(nextPath.startsWith("/") ? nextPath : "/garage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
    } finally {
      setLoading(false);
    }
  }

  function beginOauthSignIn(provider: "google" | "apple" | "yandex") {
    setError("");
    setOauthLoadingProvider(provider);
    void signIn(provider, { callbackUrl: callbackPath }).finally(() => {
      setOauthLoadingProvider(null);
    });
  }

  return (
    <main
      className="min-h-full flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#080d12", color: "#e8edf2" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <h1 className="text-2xl font-semibold mb-2">Вход в MotoTwin</h1>
        <p className="text-sm mb-6" style={{ color: productSemanticColors.textMuted }}>
          Закрытая бета — нужен email из списка приглашённых.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border px-3 py-2 bg-transparent"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border px-3 py-2 bg-transparent"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            />
          </label>
          {error ? (
            <p className="text-sm" style={{ color: productSemanticColors.error }}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-lg py-2.5 font-medium transition-all duration-150 active:scale-[0.99] active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: productSemanticColors.primaryAction, color: "#fff" }}
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => beginOauthSignIn("google")}
            disabled={isBusy}
            className="rounded-lg border py-2 text-sm transition-all duration-150 active:scale-[0.99] active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: oauthLoadingProvider === "google" ? productSemanticColors.primaryAction : "rgba(255,255,255,0.15)",
              backgroundColor: oauthLoadingProvider === "google" ? productSemanticColors.primaryAction : "transparent",
              color: oauthLoadingProvider === "google" ? "#fff" : undefined,
            }}
          >
            {oauthLoadingProvider === "google" ? "Переход к Google…" : "Войти через Google"}
          </button>
          <button
            type="button"
            onClick={() => beginOauthSignIn("apple")}
            disabled={isBusy}
            className="rounded-lg border py-2 text-sm transition-all duration-150 active:scale-[0.99] active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: oauthLoadingProvider === "apple" ? productSemanticColors.primaryAction : "rgba(255,255,255,0.15)",
              backgroundColor: oauthLoadingProvider === "apple" ? productSemanticColors.primaryAction : "transparent",
              color: oauthLoadingProvider === "apple" ? "#fff" : undefined,
            }}
          >
            {oauthLoadingProvider === "apple" ? "Переход к Apple…" : "Войти через Apple"}
          </button>
          <button
            type="button"
            onClick={() => beginOauthSignIn("yandex")}
            disabled={isBusy}
            className="rounded-lg border py-2 text-sm transition-all duration-150 active:scale-[0.99] active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: oauthLoadingProvider === "yandex" ? productSemanticColors.primaryAction : "rgba(255,255,255,0.15)",
              backgroundColor: oauthLoadingProvider === "yandex" ? productSemanticColors.primaryAction : "transparent",
              color: oauthLoadingProvider === "yandex" ? "#fff" : undefined,
            }}
          >
            {oauthLoadingProvider === "yandex" ? "Переход к Yandex…" : "Войти через Yandex"}
          </button>
        </div>
        <p className="text-sm mt-4" style={{ color: productSemanticColors.textMuted }}>
          <Link href="/forgot-password" className="underline">
            Забыли пароль?
          </Link>
        </p>
        <p className="text-sm mt-6" style={{ color: productSemanticColors.textMuted }}>
          Нет аккаунта?{" "}
          <Link href="/register" className="underline" style={{ color: productSemanticColors.primaryAction }}>
            Регистрация
          </Link>
        </p>
      </div>
    </main>
  );
}
