import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminFitmentMatrix } from "@/lib/admin-fitment";
import { prisma } from "@/lib/prisma";
import { ruAdmin } from "../_locales/ru";
import { FitmentMatrix } from "./_components/FitmentMatrix";

const TOP_PROBLEM = 30;

export default async function AdminFitmentPage() {
  const [self, matrix, mixed, lowConfidence] = await Promise.all([
    loadAdminSelf(),
    loadAdminFitmentMatrix(),
    prisma.fitmentConfidence.findMany({
      where: { status: "MIXED_REPORTS" },
      orderBy: { reportCount: "desc" },
      take: TOP_PROBLEM,
      include: {
        partMaster: { select: { brandName: true, sku: true, id: true } },
        modelVariant: { include: { model: { include: { brand: true } } } },
        node: { select: { name: true } },
      },
    }),
    prisma.fitmentConfidence.findMany({
      where: { confidenceScore: { lt: 40 }, reportCount: { gte: 2 } },
      orderBy: { confidenceScore: "asc" },
      take: TOP_PROBLEM,
      include: {
        partMaster: { select: { brandName: true, sku: true, id: true } },
        modelVariant: { include: { model: { include: { brand: true } } } },
        node: { select: { name: true } },
      },
    }),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.fitment} self={self}>
      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 13 }}>
        Матрица показывает, насколько каждое сочетание <em>бренд × узел</em> покрыто проверенными
        fitment-данными. Кликабельные конфликты ниже ведут на конкретные FitmentConfidence.
      </p>

      <section>
        <FitmentMatrix data={matrix} />
      </section>

      <section style={twoColGrid}>
        <ProblemList
          title="Конфликтующие fitments"
          items={mixed.map((row) => ({
            id: row.id,
            primary: `${row.partMaster.brandName} ${row.partMaster.sku}`,
            secondary: `${row.modelVariant.model.brand.name} ${row.modelVariant.model.name} ${row.modelVariant.year} · ${row.node.name}`,
            badge: `${row.reportCount} reports`,
            href: `/admin/moderation?queue=mixedFitments`,
          }))}
        />
        <ProblemList
          title="Низкая уверенность"
          items={lowConfidence.map((row) => ({
            id: row.id,
            primary: `${row.partMaster.brandName} ${row.partMaster.sku}`,
            secondary: `${row.modelVariant.model.brand.name} ${row.modelVariant.model.name} ${row.modelVariant.year} · ${row.node.name}`,
            badge: `${row.confidenceScore}/100`,
            href: `/admin/catalog/${row.partMaster.id}?tab=fitments`,
          }))}
        />
      </section>
    </AdminPageChrome>
  );
}

function ProblemList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; primary: string; secondary: string; badge: string; href: string }>;
}) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: 16,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
      {items.length === 0 ? (
        <div style={{ color: productSemanticColors.textMuted, fontSize: 13, marginTop: 8 }}>
          Проблем не обнаружено
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: `1px solid ${productSemanticColors.border}`,
              }}
            >
              <Link
                href={item.href}
                prefetch={false}
                style={{ color: productSemanticColors.textPrimary, textDecoration: "none", flex: 1, minWidth: 0 }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.primary}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: productSemanticColors.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.secondary}
                </div>
              </Link>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 22,
                  padding: "0 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FBBF24",
                  backgroundColor: "rgba(251,191,36,0.14)",
                }}
              >
                {item.badge}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};
