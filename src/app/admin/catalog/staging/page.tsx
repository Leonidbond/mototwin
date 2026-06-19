import Link from "next/link";
import type { ReviewStatus } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { AdminFilterBar } from "../../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadCatalogStagingList } from "@/lib/admin-catalog-staging";
import { ruAdmin } from "../../_locales/ru";

const REVIEW_STATUSES: ReviewStatus[] = [
  "NEW",
  "NEEDS_REVIEW",
  "MANUAL_APPROVED",
  "REJECTED",
  "DUPLICATE",
  "NOT_APPLICABLE",
];

interface PageProps {
  searchParams: Promise<{
    reviewStatus?: string;
    brand?: string;
    nodeCode?: string;
    importBatch?: string;
    page?: string;
  }>;
}

export default async function AdminCatalogStagingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const [self, list] = await Promise.all([
    loadAdminSelf(),
    loadCatalogStagingList({
      reviewStatus: REVIEW_STATUSES.includes(params.reviewStatus as ReviewStatus)
        ? (params.reviewStatus as ReviewStatus)
        : undefined,
      brand: params.brand || undefined,
      nodeCode: params.nodeCode || undefined,
      importBatch: params.importBatch || undefined,
      page,
    }),
  ]);

  return (
    <AdminPageChrome
      title="Staging каталога"
      self={self}
      breadcrumbs={[
        { label: ruAdmin.nav.catalog, href: "/admin/catalog" },
        { label: "Staging" },
      ]}
    >
      <AdminFilterBar
        fields={[
          {
            key: "reviewStatus",
            label: "Review",
            options: REVIEW_STATUSES.map((s) => ({ value: s, label: s })),
          },
          { key: "brand", label: "Бренд", search: true, placeholder: "BMW" },
          { key: "nodeCode", label: "Узел", search: true, placeholder: "ENGINE.LUBE.FILTER" },
          { key: "importBatch", label: "Batch", search: true },
        ]}
      />
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Деталь</th>
              <th style={thStyle}>Узел</th>
              <th style={thStyle}>Review</th>
              <th style={thStyle}>Confidence</th>
              <th style={thStyle}>Region</th>
              <th style={thStyle}>Batch</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>
                  <Link href={`/admin/catalog/staging/${item.id}`} style={linkStyle}>
                    {item.partName}
                  </Link>
                  <div style={mutedStyle}>
                    {item.brand} · {item.partNumber || "—"}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div>{item.nodeName}</div>
                  <div style={mutedStyle}>{item.nodeCode}</div>
                </td>
                <td style={tdStyle}>{item.reviewStatus}</td>
                <td style={tdStyle}>{item.confidence}</td>
                <td style={tdStyle}>
                  {item.market} / {item.sourceRegion}
                </td>
                <td style={tdStyle}>{item.importBatch}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={mutedStyle}>
          Стр. {list.page} / {list.pageCount} · всего {list.total}
        </div>
      </div>
    </AdminPageChrome>
  );
}

const tableWrap: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 12,
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textMuted,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: `1px solid ${productSemanticColors.borderSubtle}`,
  verticalAlign: "top",
};

const linkStyle: React.CSSProperties = {
  color: productSemanticColors.primaryAction,
  textDecoration: "none",
  fontWeight: 600,
};

const mutedStyle: React.CSSProperties = {
  fontSize: 12,
  color: productSemanticColors.textMuted,
  marginTop: 2,
};
