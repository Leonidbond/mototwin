"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { clearWebSessionCache } from "@/lib/web-api-dedup";
import { productSemanticColors } from "@mototwin/design-tokens";

const api = createWebApiClient();

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

  useEffect(() => {
    clearWebSessionCache();
    // #region agent log
    fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
      body: JSON.stringify({
        sessionId: "6800ea",
        runId: "run-google-click-1",
        hypothesisId: "H3",
        location: "src/app/login/login-form.tsx:50",
        message: "LoginForm mounted",
        data: {
          path: typeof window !== "undefined" ? window.location.pathname : "server",
          hasNextAuthClient: typeof signIn === "function",
          nextPath,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  useEffect(() => {
    setError(resolveOauthErrorMessage(oauthErrorCode));
  }, [oauthErrorCode]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
        body: JSON.stringify({
          sessionId: "6800ea",
          runId: "run-google-click-1",
          hypothesisId: "H3",
          location: "src/app/login/login-form.tsx:71",
          message: "window error on login page",
          data: {
            message: event.message,
            file: event.filename,
            line: event.lineno,
            col: event.colno,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
        body: JSON.stringify({
          sessionId: "6800ea",
          runId: "run-google-click-1",
          hypothesisId: "H3",
          location: "src/app/login/login-form.tsx:91",
          message: "unhandled rejection on login page",
          data: {
            reason: String(event.reason),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

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
            disabled={loading}
            className="rounded-lg py-2.5 font-medium disabled:opacity-50"
            style={{ backgroundColor: productSemanticColors.primaryAction, color: "#fff" }}
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={async () => {
              const callbackPath = nextPath.startsWith("/") ? nextPath : "/garage";
              // #region agent log
              fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
                body: JSON.stringify({
                  sessionId: "6800ea",
                  runId: "run-google-click-1",
                  hypothesisId: "H1",
                  location: "src/app/login/login-form.tsx:189",
                  message: "Google button clicked",
                  data: {
                    callbackPath,
                    href: typeof window !== "undefined" ? window.location.href : "server",
                  },
                  timestamp: Date.now(),
                }),
              }).catch(() => {});
              // #endregion
              try {
                // #region agent log
                fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
                  body: JSON.stringify({
                    sessionId: "6800ea",
                    runId: "run-google-click-1",
                    hypothesisId: "H2",
                    location: "src/app/login/login-form.tsx:207",
                    message: "Calling signIn google",
                    data: {
                      callbackPath,
                    },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
                const result = await signIn("google", { callbackUrl: callbackPath });
                // #region agent log
                fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
                  body: JSON.stringify({
                    sessionId: "6800ea",
                    runId: "run-google-click-1",
                    hypothesisId: "H2",
                    location: "src/app/login/login-form.tsx:223",
                    message: "signIn promise resolved",
                    data: {
                      result: result ?? null,
                    },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
              } catch (error) {
                // #region agent log
                fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6800ea" },
                  body: JSON.stringify({
                    sessionId: "6800ea",
                    runId: "run-google-click-1",
                    hypothesisId: "H2",
                    location: "src/app/login/login-form.tsx:241",
                    message: "signIn threw error",
                    data: {
                      error: error instanceof Error ? error.message : String(error),
                    },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
              }
            }}
            className="rounded-lg border py-2 text-sm"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            Войти через Google
          </button>
          <button
            type="button"
            onClick={() => void signIn("apple", { callbackUrl: nextPath })}
            className="rounded-lg border py-2 text-sm"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            Войти через Apple
          </button>
          <button
            type="button"
            onClick={() => void signIn("yandex", { callbackUrl: nextPath })}
            className="rounded-lg border py-2 text-sm"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            Войти через Yandex
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
