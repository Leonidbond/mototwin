import Link from "next/link";
import { notFound } from "next/navigation";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { canMutate } from "@/lib/admin-auth";
import {
  formatStagingMetadataForAdmin,
  loadCatalogStagingDetail,
} from "@/lib/admin-catalog-staging";
import { ruAdmin } from "../../../_locales/ru";
import { StagingActions } from "./_components/StagingActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCatalogStagingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [self, detail] = await Promise.all([loadAdminSelf(), loadCatalogStagingDetail(id)]);
  if (!detail) notFound();

  const metadata = formatStagingMetadataForAdmin(detail.rawNotes, {
    sourceModelCode: detail.sourceModelCode,
    verificationRegion: detail.verificationRegion,
    evidenceLevel: detail.evidenceLevel,
    regionMatchStatus: detail.regionMatchStatus,
    parserVersion: detail.parserVersion,
    importBatch: detail.importBatch,
  });

  return (
    <AdminPageChrome
      title={detail.partName}
      self={self}
      breadcrumbs={[
        { label: ruAdmin.nav.catalog, href: "/admin/catalog" },
        { label: "Staging", href: "/admin/catalog/staging" },
        { label: detail.partNumber || detail.id.slice(0, 8) },
      ]}
      rightSlot={
        canMutate(self.role) ? (
          <StagingActions
            id={detail.id}
            reviewStatus={detail.reviewStatus}
            promotedSkuId={detail.promotedSkuId}
          />
        ) : null
      }
    >
      <div style={gridStyle}>
        <Section title="Мотоцикл">
          <Row label="Brand" value={detail.brand} />
          <Row label="Family" value={detail.modelFamily} />
          <Row label="Variant" value={detail.variant} />
          <Row label="Generation" value={detail.generationCode} />
          <Row label="Years" value={`${detail.yearFrom}${detail.yearTo ? `–${detail.yearTo}` : ""}`} />
          <Row label="Market" value={detail.market} />
          <Row label="Resolve" value={`${detail.resolveStatus}${detail.resolveMessage ? ` — ${detail.resolveMessage}` : ""}`} />
        </Section>
        <Section title="Деталь">
          <Row label="Manufacturer" value={detail.partManufacturer} />
          <Row label="Part number" value={detail.partNumber || "—"} />
          <Row label="Normalized" value={detail.normalizedPartNumber || "—"} />
          <Row label="Category" value={detail.partCategory} />
          <Row label="OEM" value={detail.isOem ? "true" : "false"} />
          <Row label="Application" value={detail.applicationType} />
          <Row label="Node" value={`${detail.nodeCode} (${detail.nodeName})`} />
          <Row label="Applicability" value={detail.nodeApplicability} />
          <Row label="Safety critical" value={detail.safetyCritical ? "true" : "false"} />
        </Section>
        <Section title="Provenance">
          <Row label="Source key" value={detail.sourceKey || "—"} />
          <Row label="Source" value={`${detail.sourceName} · ${detail.sourceType}`} />
          <Row label="Region" value={detail.sourceRegion} />
          <Row label="URL" value={<a href={detail.sourceUrl} target="_blank" rel="noreferrer">{detail.sourceUrl}</a>} />
          <Row label="Model code" value={detail.sourceModelCode || "—"} />
          <Row label="Source year" value={detail.sourceYear != null ? String(detail.sourceYear) : "—"} />
          <Row label="Verification region" value={detail.verificationRegion || "—"} />
          <Row label="Evidence level" value={detail.evidenceLevel || "—"} />
          <Row label="Region match" value={detail.regionMatchStatus || "—"} />
          <Row label="Supersession" value={detail.supersessionStatus || "—"} />
          <Row label="Verified at" value={detail.verifiedAt || "—"} />
          <Row label="Parser" value={detail.parserVersion || "—"} />
          <Row label="Diagram" value={detail.diagramName || "—"} />
          <Row label="Position" value={detail.diagramPosition || "—"} />
          <Row label="Quantity" value={detail.rawQuantity || "—"} />
          <Row label="Confidence" value={detail.confidence} />
          <Row label="Review" value={detail.reviewStatus} />
          <Row label="Parsed at" value={detail.parsedAt} />
          <Row label="Metadata" value={metadata || "—"} />
          {detail.rawNotes ? <Row label="raw_notes" value={detail.rawNotes} /> : null}
        </Section>
        <Section title="Promote">
          <Row label="Batch" value={detail.importBatch} />
          <Row label="Row key" value={detail.stagingRowKey} />
          <Row label="Promoted SKU" value={detail.promotedSkuId ? <Link href={`/admin/catalog`}>{detail.promotedSkuId}</Link> : "—"} />
          <Row label="Promoted fitment" value={detail.promotedFitmentId || "—"} />
          <Row label="Promoted at" value={detail.promotedAt || "—"} />
        </Section>
      </div>
    </AdminPageChrome>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitle}>{props.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{props.children}</div>
    </section>
  );
}

function Row(props: { label: string; value: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{props.label}</span>
      <span style={valueStyle}>{props.value}</span>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 14,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 14,
  fontWeight: 700,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 8,
  fontSize: 13,
};

const labelStyle: React.CSSProperties = { color: productSemanticColors.textMuted };
const valueStyle: React.CSSProperties = { color: productSemanticColors.textPrimary, overflowWrap: "anywhere" };
