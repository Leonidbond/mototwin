import type { AdminSupportLevel } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminModelList } from "@/lib/admin-models";
import { ModelsTable } from "./_components/ModelsTable";
import { prisma } from "@/lib/prisma";
import { ruAdmin, formatNumber } from "../_locales/ru";

const SUPPORT_LEVELS: AdminSupportLevel[] = [
  "FULL_SUPPORT",
  "COMMUNITY_SUPPORT",
  "EARLY_BETA",
  "NO_DATA",
  "UNSUPPORTED",
];

interface AdminModelsPageProps {
  searchParams: Promise<{
    q?: string;
    brandId?: string;
    supportLevel?: string;
    page?: string;
  }>;
}

export default async function AdminModelsPage({ searchParams }: AdminModelsPageProps) {
  const params = await searchParams;
  const filters = {
    q: params.q || undefined,
    brandId: params.brandId || undefined,
    supportLevel: SUPPORT_LEVELS.includes(params.supportLevel as AdminSupportLevel)
      ? (params.supportLevel as AdminSupportLevel)
      : undefined,
  };
  const page = Number(params.page ?? 1);

  const [self, list, brands] = await Promise.all([
    loadAdminSelf(),
    loadAdminModelList({ filters, page }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.models} self={self}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <SummaryStat label={ruAdmin.support.FULL_SUPPORT} value={list.summary.full} tone="#22C55E" />
        <SummaryStat
          label={ruAdmin.support.COMMUNITY_SUPPORT}
          value={list.summary.community}
          tone="#60A5FA"
        />
        <SummaryStat label={ruAdmin.support.EARLY_BETA} value={list.summary.earlyBeta} tone="#FBBF24" />
        <SummaryStat label={ruAdmin.support.NO_DATA} value={list.summary.noData} tone="#94A3B8" />
      </section>
      <AdminFilterBar
        fields={[
          { key: "q", label: "Поиск", search: true, placeholder: "Бренд или модель" },
          {
            key: "brandId",
            label: "Бренд",
            options: brands.map((b) => ({ value: b.id, label: b.name })),
          },
          {
            key: "supportLevel",
            label: "Support level",
            options: SUPPORT_LEVELS.map((level) => ({
              value: level,
              label: ruAdmin.support[level],
            })),
          },
        ]}
      />
      <ModelsTable data={list} />
    </AdminPageChrome>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: productSemanticColors.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatNumber(value)}
      </span>
      <span
        aria-hidden
        style={{
          marginTop: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: tone,
          width: "40%",
        }}
      />
    </div>
  );
}
