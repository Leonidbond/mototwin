"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { AdminUserListItemWire, AdminUserListResponse } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminRoleAssignmentControl } from "../../_components/AdminRoleAssignmentControl";
import { ruAdmin } from "../../_locales/ru";

interface GrantAdminAccessPanelProps {
  currentUserId: string;
}

export function GrantAdminAccessPanel({ currentUserId }: GrantAdminAccessPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserListItemWire[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshResults = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/users?q=${encodeURIComponent(trimmed)}&page=1&status=active`
        );
        if (!res.ok) return;
        const json = (await res.json()) as AdminUserListResponse;
        setResults(json.items);
      } catch (err) {
        console.error(err);
      }
    });
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSelectedId(null);
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/admin/users?q=${encodeURIComponent(trimmed)}&page=1&status=active`
          );
          if (!res.ok) {
            setError("Не удалось найти пользователей");
            setResults([]);
            return;
          }
          const json = (await res.json()) as AdminUserListResponse;
          setError(null);
          setResults(json.items);
          setSelectedId((prev) =>
            prev && json.items.some((item) => item.id === prev) ? prev : null
          );
        } catch (err) {
          console.error(err);
          setError("Сетевая ошибка");
          setResults([]);
        }
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const selected = results.find((item) => item.id === selectedId) ?? null;

  return (
    <section style={cardStyle}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Назначить права пользователю</h2>
      <p style={{ margin: "6px 0 0", color: productSemanticColors.textMuted, fontSize: 13 }}>
        Найдите аккаунт по email или имени и выберите роль админки. Изменения попадают в audit log.
      </p>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Email или имя (минимум 2 символа)"
          style={inputStyle}
        />
        {pending ? (
          <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>Ищем…</div>
        ) : null}
        {error ? <div style={errorStyle}>{error}</div> : null}

        {results.length > 0 ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {results.map((user) => {
              const active = user.id === selectedId;
              const label = user.displayName ?? user.email ?? "—";
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    style={{
                      ...resultButtonStyle,
                      borderColor: active
                        ? productSemanticColors.primaryAction
                        : productSemanticColors.border,
                      backgroundColor: active
                        ? "rgba(99,102,241,0.10)"
                        : productSemanticColors.cardMuted,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                      {user.email ?? "—"}
                      {user.adminRole
                        ? ` · ${ruAdmin.topbar.role[user.adminRole] ?? user.adminRole}`
                        : " · без роли"}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.trim().length >= 2 && !pending ? (
          <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
            Пользователи не найдены.
          </div>
        ) : null}

        {selected ? (
          <div style={assignmentBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {selected.displayName ?? selected.email ?? "—"}
                </div>
                <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                  {selected.email}
                </div>
              </div>
              <Link
                href={`/admin/users/${selected.id}`}
                prefetch={false}
                style={{ fontSize: 12, color: productSemanticColors.textMuted }}
              >
                Карточка пользователя →
              </Link>
            </div>
            <AdminRoleAssignmentControl
              userId={selected.id}
              currentUserId={currentUserId}
              adminRole={selected.adminRole}
              isModerator={selected.isModerator}
              onSaved={refreshResults}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
};

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: "0 12px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
};

const resultButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: radiusScale.sm,
  border: `1px solid ${productSemanticColors.border}`,
  cursor: "pointer",
};

const assignmentBoxStyle: React.CSSProperties = {
  marginTop: 4,
  padding: 14,
  borderRadius: radiusScale.md,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.canvas,
  display: "grid",
  gap: 12,
};

const errorStyle: React.CSSProperties = {
  color: "#FCA5A5",
  fontSize: 12,
};
