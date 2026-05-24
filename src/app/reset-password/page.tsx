"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("Ссылка для сброса недействительна.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Не удалось обновить пароль.");
      }
      setMessage("Пароль обновлён. Теперь вы можете войти с новым паролем.");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить пароль.");
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
        <h1 className="text-2xl font-semibold mb-2">Новый пароль</h1>
        <p className="text-sm mb-6" style={{ color: productSemanticColors.textMuted }}>
          Задайте новый пароль для вашего аккаунта.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Новый пароль
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border px-3 py-2 bg-transparent"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Повторите пароль
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-lg border px-3 py-2 bg-transparent"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            />
          </label>
          {error ? (
            <p className="text-sm" style={{ color: productSemanticColors.error }}>
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm" style={{ color: productSemanticColors.success }}>
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-2.5 font-medium disabled:opacity-50"
            style={{ backgroundColor: productSemanticColors.primaryAction, color: "#fff" }}
          >
            {loading ? "Сохранение…" : "Сохранить пароль"}
          </button>
        </form>
        <p className="text-sm mt-6" style={{ color: productSemanticColors.textMuted }}>
          <Link href="/login" className="underline">
            Перейти ко входу
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
