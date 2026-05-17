"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { Plus } from "../../_components/icons";

interface CreatePartButtonProps {
  canMutate: boolean;
}

export function CreatePartButton({ canMutate }: CreatePartButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canMutate) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!brandName.trim() || !sku.trim() || !title.trim()) {
      setError("Заполните бренд, SKU и название");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/parts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brandName: brandName.trim(),
            sku: sku.trim(),
            title: title.trim(),
            subcategory: subcategory.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(json?.error ?? "Не удалось создать");
          return;
        }
        const created = (await res.json()) as { id: string };
        setOpen(false);
        setBrandName("");
        setSku("");
        setTitle("");
        setSubcategory("");
        router.push(`/admin/catalog/${created.id}`);
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={primaryButton}>
        <Plus size={14} />
        <span>Добавить деталь</span>
      </button>
      {open ? (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            style={modalStyle}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Создать деталь</h3>
            <FieldRow>
              <Field label="Бренд" required>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="SKU" required>
                <input value={sku} onChange={(e) => setSku(e.target.value)} style={inputStyle} />
              </Field>
            </FieldRow>
            <Field label="Название" required>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Категория">
              <input
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                style={inputStyle}
                placeholder="brake_pads, oil_filter, …"
              />
            </Field>
            {error ? (
              <div
                style={{
                  color: "#FCA5A5",
                  backgroundColor: "rgba(248,113,113,0.10)",
                  border: `1px solid rgba(248,113,113,0.30)`,
                  padding: "8px 10px",
                  borderRadius: radiusScale.sm,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setOpen(false)} style={secondaryButton}>
                Отмена
              </button>
              <button type="submit" disabled={pending} style={primaryButton}>
                {pending ? "Создаём…" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
  );
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

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.primaryAction,
  color: productSemanticColors.onPrimaryAction,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: radiusScale.sm,
  backgroundColor: productSemanticColors.cardMuted,
  color: productSemanticColors.textPrimary,
  border: `1px solid ${productSemanticColors.border}`,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15,23,42,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  backdropFilter: "blur(4px)",
};

const modalStyle: React.CSSProperties = {
  width: 440,
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 20,
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
