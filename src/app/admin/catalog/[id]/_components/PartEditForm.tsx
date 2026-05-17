"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPartDetailWire, AdminPartStatusWire } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

const STATUSES: AdminPartStatusWire[] = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"];

interface PartEditFormProps {
  part: AdminPartDetailWire;
  canMutate: boolean;
}

export function PartEditForm({ part, canMutate }: PartEditFormProps) {
  const router = useRouter();
  const [brandName, setBrandName] = useState(part.brandName);
  const [sku, setSku] = useState(part.sku);
  const [title, setTitle] = useState(part.title);
  const [subcategory, setSubcategory] = useState(part.subcategory ?? "");
  const [description, setDescription] = useState(part.description ?? "");
  const [imageUrl, setImageUrl] = useState(part.imageUrl ?? "");
  const [status, setStatus] = useState<AdminPartStatusWire>(part.status);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canMutate) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/parts/${part.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brandName,
            sku,
            title,
            subcategory: subcategory.trim() || null,
            description: description.trim() || null,
            imageUrl: imageUrl.trim() || null,
            status,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось сохранить");
          return;
        }
        setSavedAt(new Date().toLocaleTimeString("ru-RU"));
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <form onSubmit={submit} style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Карточка детали</h3>
      <Grid>
        <Field label="Бренд" required>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            disabled={!canMutate}
            style={inputStyle}
          />
        </Field>
        <Field label="SKU" required>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            disabled={!canMutate}
            style={inputStyle}
          />
        </Field>
      </Grid>
      <Field label="Название" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canMutate}
          style={inputStyle}
        />
      </Field>
      <Grid>
        <Field label="Категория">
          <input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!canMutate}
            style={inputStyle}
          />
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AdminPartStatusWire)}
            disabled={!canMutate}
            style={inputStyle}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </Grid>
      <Field label="Описание">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={!canMutate}
          style={textareaStyle}
        />
      </Field>
      <Field label="Картинка (URL)">
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={!canMutate}
          style={inputStyle}
          placeholder="https://…"
        />
      </Field>
      {error ? (
        <div style={errorBox}>{error}</div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" disabled={!canMutate || pending} style={primaryButton}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        {savedAt ? <span style={{ color: "#86EFAC", fontSize: 12 }}>Сохранено в {savedAt}</span> : null}
        {!canMutate ? (
          <span style={{ color: productSemanticColors.textMuted, fontSize: 12 }}>
            Только просмотр
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        {label}
        {required ? "*" : ""}
      </span>
      {children}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
};

const textareaStyle: React.CSSProperties = {
  resize: "vertical",
  padding: "10px 12px",
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  borderRadius: radiusScale.sm,
  fontSize: 13,
};

const errorBox: React.CSSProperties = {
  color: "#FCA5A5",
  backgroundColor: "rgba(248,113,113,0.10)",
  border: `1px solid rgba(248,113,113,0.30)`,
  padding: "8px 10px",
  borderRadius: radiusScale.sm,
  fontSize: 12,
};

const primaryButton: React.CSSProperties = {
  height: 34,
  padding: "0 16px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
