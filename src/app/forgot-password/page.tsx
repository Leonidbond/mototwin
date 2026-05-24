"use client";

import { useState } from "react";
import Link from "next/link";
import { productSemanticColors } from "@mototwin/design-tokens";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Не удалось отправить ссылку.");
      }
      setMessage(
        body.message ?? "Если аккаунт с таким email существует, мы отправили ссылку для сброса."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить ссылку.");
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
        <h1 className="text-2xl font-semibold mb-2">Восстановление пароля</h1>
        <p className="text-sm mb-6" style={{ color: productSemanticColors.textMuted }}>
          Укажите email аккаунта, и мы отправим ссылку для сброса.
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
            {loading ? "Отправка…" : "Отправить ссылку"}
          </button>
        </form>
        <p className="text-sm mt-6" style={{ color: productSemanticColors.textMuted }}>
          <Link href="/login" className="underline">
            Назад ко входу
          </Link>
        </p>
      </div>
    </main>
  );
}
