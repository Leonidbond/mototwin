import { notFound } from "next/navigation";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminPartDetail } from "@/lib/admin-parts";
import { canMutate } from "@/lib/admin-auth";
import { formatDateRu, formatNumberRu } from "../../_components/format";
import { PartTabs } from "./_components/PartTabs";
import { PartEditForm } from "./_components/PartEditForm";
import { PartAliasesPanel } from "./_components/PartAliasesPanel";
import { PartMergePanel } from "./_components/PartMergePanel";

interface AdminPartDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminPartDetailPage({
  params,
  searchParams,
}: AdminPartDetailPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [self, detail] = await Promise.all([loadAdminSelf(), loadAdminPartDetail(id)]);
  if (!detail) notFound();

  const tab = sp.tab ?? "info";
  const allowMutate = canMutate(self.role);
  const title = `${detail.brandName} ${detail.sku}`;

  const tabs = [
    { key: "info", label: "Информация" },
    { key: "aliases", label: "Aliases", badge: detail.aliases.length },
    { key: "fitments", label: "Fitments", badge: detail.fitments.length },
    { key: "reports", label: "Reports", badge: detail.recentReports.length },
    {
      key: "duplicates",
      label: "Дубликаты",
      badge: detail.duplicates.length,
    },
  ];

  return (
    <AdminPageChrome title={title} self={self}>
      <Link
        href="/admin/catalog"
        prefetch={false}
        style={{ color: productSemanticColors.textMuted, fontSize: 12, textDecoration: "none" }}
      >
        ← Назад в каталог
      </Link>
      <div style={summaryRow}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: productSemanticColors.textPrimary,
            }}
          >
            {detail.title}
          </h2>
          <div style={{ marginTop: 4, fontSize: 12, color: productSemanticColors.textMuted }}>
            {detail.subcategory ?? "—"} · {detail.source === "ADMIN" ? "Каталог" : "От пользователя"}
            {" · "}обновлено {formatDateRu(detail.updatedAt)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <Stat label="Reports" value={formatNumberRu(detail.reportsCount)} />
          <Stat label="Verified" value={formatNumberRu(detail.verifiedCount)} />
          <Stat
            label="Конфликты"
            value={formatNumberRu(detail.conflictsCount)}
            warn={detail.conflictsCount > 0}
          />
        </div>
      </div>

      <PartTabs tabs={tabs} />

      {tab === "info" ? (
        <section style={twoCol}>
          <PartEditForm part={detail} canMutate={allowMutate} />
          <SidePanel detail={detail} />
        </section>
      ) : null}

      {tab === "aliases" ? (
        <PartAliasesPanel
          partId={detail.id}
          aliases={detail.aliases}
          canMutate={allowMutate}
        />
      ) : null}

      {tab === "fitments" ? <FitmentsPanel detail={detail} /> : null}
      {tab === "reports" ? <ReportsPanel detail={detail} /> : null}
      {tab === "duplicates" ? (
        <PartMergePanel part={detail} canMutate={allowMutate} />
      ) : null}
    </AdminPageChrome>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "12px 18px",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: productSemanticColors.textMuted }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 22,
          fontWeight: 700,
          color: warn ? "#FBBF24" : productSemanticColors.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SidePanel({ detail }: { detail: NonNullable<Awaited<ReturnType<typeof loadAdminPartDetail>>> }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Превью</h3>
      {detail.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={detail.imageUrl}
          alt={detail.title}
          style={{
            width: "100%",
            borderRadius: radiusScale.sm,
            border: `1px solid ${productSemanticColors.border}`,
          }}
        />
      ) : (
        <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>Нет картинки</div>
      )}
      <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <SpecRow term="ID" value={detail.id} mono />
        <SpecRow term="Создано" value={formatDateRu(detail.createdAt)} />
        <SpecRow term="Aliases" value={String(detail.aliases.length)} />
      </dl>
    </div>
  );
}

function SpecRow({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <dt style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        {term}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: 12,
          color: productSemanticColors.textPrimary,
          fontFamily: mono ? "var(--font-mono), monospace" : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function FitmentsPanel({
  detail,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof loadAdminPartDetail>>>;
}) {
  if (detail.fitments.length === 0) {
    return <Empty label="Нет fitment-данных" />;
  }
  return (
    <div style={tableCardStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Модель</th>
            <th style={thStyle}>Год</th>
            <th style={thStyle}>Status</th>
            <th style={thStyleNumeric}>Reports</th>
            <th style={thStyleNumeric}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {detail.fitments.map((row) => (
            <tr
              key={row.modelVariantId}
              style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
            >
              <td style={tdStyle}>
                <Link
                  href={`/admin/models/${row.modelVariantId}`}
                  prefetch={false}
                  style={{ color: productSemanticColors.textPrimary, textDecoration: "none" }}
                >
                  {row.brandLabel} {row.modelLabel}
                </Link>
              </td>
              <td style={tdStyle}>{row.year}</td>
              <td style={tdStyle}>{row.status}</td>
              <td style={tdStyleNumeric}>{formatNumberRu(row.reportCount)}</td>
              <td style={tdStyleNumeric}>{row.confidenceScore}/100</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsPanel({
  detail,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof loadAdminPartDetail>>>;
}) {
  if (detail.recentReports.length === 0) {
    return <Empty label="Нет последних отчётов" />;
  }
  return (
    <div style={tableCardStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Модель</th>
            <th style={thStyle}>Узел</th>
            <th style={thStyle}>Fitment</th>
            <th style={thStyle}>Модерация</th>
            <th style={thStyleNumeric}>Создан</th>
          </tr>
        </thead>
        <tbody>
          {detail.recentReports.map((report) => (
            <tr
              key={report.id}
              style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
            >
              <td style={tdStyle}>{report.modelLabel}</td>
              <td style={tdStyle}>{report.nodeLabel}</td>
              <td style={tdStyle}>{report.fitmentResult}</td>
              <td style={tdStyle}>{report.moderationStatus}</td>
              <td style={tdStyleNumeric}>{formatDateRu(report.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "24px 18px",
        textAlign: "center",
        color: productSemanticColors.textMuted,
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}

const summaryRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  gap: 16,
};

const tableCardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: "10px 0",
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const thStyleNumeric: React.CSSProperties = { ...thStyle, textAlign: "right" };

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
};

const tdStyleNumeric: React.CSSProperties = { ...tdStyle, textAlign: "right" };
