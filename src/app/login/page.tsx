"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { createWebApiClient } from "@/lib/create-web-api-client";
import { clearWebSessionCache } from "@/lib/web-api-dedup";
import { productSemanticColors } from "@mototwin/design-tokens";

const api = createWebApiClient();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/garage";
  const oauthErrorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearWebSessionCache();
  }, []);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run3",hypothesisId:"H7",location:"src/app/login/page.tsx:30",message:"LoginForm mounted",data:{path:typeof window!=="undefined"?window.location.pathname:"server",search:typeof window!=="undefined"?window.location.search:"",hasOauthError:Boolean(oauthErrorCode)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [oauthErrorCode]);

  useEffect(() => {
    if (!oauthErrorCode) return;
    const decoded = decodeURIComponent(oauthErrorCode);
    if (decoded === "OAuthCreateAccount") {
      setError("Не удалось создать аккаунт через Google. Попробуйте ещё раз или войдите по email.");
      return;
    }
    if (decoded === "AccessDenied") {
      setError("Google отклонил вход. Проверьте, что ваш Gmail добавлен в Test users приложения.");
      return;
    }
    if (decoded === "OAuthAccountNotLinked") {
      setError(
        "Этот Google-аккаунт не привязан. Войдите по email и паролю или используйте тот же Gmail, что при регистрации."
      );
      return;
    }
    if (decoded === "Callback") {
      setError("Google вернул ошибку при входе. Попробуйте ещё раз через минуту.");
      return;
    }
    if (decoded === "Configuration") {
      setError("OAuth на сервере настроен некорректно. Напишите в поддержку.");
      return;
    }
    setError(decoded);
  }, [oauthErrorCode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Email/password uses mototwin_session (see POST /api/auth/login).
      // NextAuth credentials + database sessions are not supported together.
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
            onClick={() => {
              const callbackPath = nextPath.startsWith("/") ? nextPath : "/garage";
              // #region agent log
              fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run4",hypothesisId:"H19",location:"src/app/login/page.tsx:145",message:"Google login button clicked",data:{nextPath,callbackPath},timestamp:Date.now()})}).catch(()=>{});
              // #endregion
              void signIn("google", { callbackUrl: callbackPath });
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
