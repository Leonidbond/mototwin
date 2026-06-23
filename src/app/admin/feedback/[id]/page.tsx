import { notFound } from "next/navigation";
import Link from "next/link";
import { getFeedbackStatusLabelRu, getFeedbackTypeLabelRu } from "@mototwin/domain";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminFeedbackDetail } from "@/lib/admin-feedback";
import { formatDateTimeRu } from "../../_components/format";
import { ruAdmin } from "../../_locales/ru";
import { FeedbackStatusPanel } from "./_components/FeedbackStatusPanel";

interface AdminFeedbackDetailPageProps {
  params: Promise<{ id: string }>;
}

function platformLabel(platform: string): string {
  if (platform === "web") return "Web";
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  return platform;
}

export default async function AdminFeedbackDetailPage({ params }: AdminFeedbackDetailPageProps) {
  const { id } = await params;
  const [self, detail] = await Promise.all([loadAdminSelf(), loadAdminFeedbackDetail(id)]);
  if (!detail) notFound();

  const canManage = self.role === "SUPER_ADMIN" || self.role === "MODERATOR";

  return (
    <AdminPageChrome title={ruAdmin.feedback.title} self={self}>
      <Link
        href="/admin/feedback"
        prefetch={false}
        style={{ color: productSemanticColors.textMuted, fontSize: 12, textDecoration: "none" }}
      >
        {ruAdmin.feedback.detail.back}
      </Link>

      <section style={twoColGrid}>
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <Card title={ruAdmin.feedback.detail.message}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <span style={chipBase("#A5B4FC", "rgba(99,102,241,0.16)")}>
                {getFeedbackTypeLabelRu(detail.type)}
              </span>
              <span style={chipBase("#93C5FD", "rgba(96,165,250,0.16)")}>
                {getFeedbackStatusLabelRu(detail.status)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: productSemanticColors.textPrimary, whiteSpace: "pre-wrap" }}>
              {detail.message}
            </p>
          </Card>

          <Card title={ruAdmin.feedback.detail.context}>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", margin: 0 }}>
              <Row label="Страница">{detail.pageTitle} <Muted>({detail.pageKey})</Muted></Row>
              <Row label="Платформа">{platformLabel(detail.platform)}</Row>
              <Row label="Маршрут"><code style={codeStyle}>{detail.routePath}</code></Row>
              <Row label="Версия приложения">{detail.appVersion ?? "—"}</Row>
              <Row label="Локаль">{detail.locale ?? "—"}</Row>
              <Row label="User-Agent"><Muted>{detail.userAgent ?? "—"}</Muted></Row>
              <Row label="Создано">{formatDateTimeRu(detail.createdAt)}</Row>
            </dl>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {canManage ? (
            <FeedbackStatusPanel
              feedbackId={detail.id}
              status={detail.status}
              adminNote={detail.adminNote}
              reviewedByLabel={detail.reviewedByLabel}
              reviewedAt={detail.reviewedAt}
            />
          ) : (
            <Card title={ruAdmin.feedback.detail.manage}>
              <Muted>{ruAdmin.feedback.detail.noPermission}</Muted>
            </Card>
          )}

          <Card title={ruAdmin.feedback.detail.author}>
            <div style={{ fontSize: 14, color: productSemanticColors.textPrimary }}>
              {detail.authorLabel ?? "—"}
            </div>
            {detail.authorEmail ? (
              <div style={{ fontSize: 12, color: productSemanticColors.textMuted, marginTop: 2 }}>
                {detail.authorEmail}
              </div>
            ) : null}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.authorId ? (
                <Link href={`/admin/users/${detail.authorId}`} prefetch={false} style={linkStyle}>
                  {ruAdmin.feedback.detail.openUser}
                </Link>
              ) : null}
              {detail.vehicleId ? (
                <Link href={`/admin/vehicles/${detail.vehicleId}`} prefetch={false} style={linkStyle}>
                  {ruAdmin.feedback.detail.openVehicle}
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </AdminPageChrome>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "16px 18px",
        minWidth: 0,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: productSemanticColors.textPrimary }}>
        {title}
      </h3>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, color: productSemanticColors.textPrimary, overflowWrap: "anywhere" }}>
        {children}
      </dd>
    </>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ color: productSemanticColors.textMuted }}>{children}</span>;
}

function chipBase(fg: string, bg: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 22,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: fg,
    backgroundColor: bg,
  };
}

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  gap: 16,
  alignItems: "start",
};

const codeStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), monospace",
  color: productSemanticColors.textSecondary,
};

const linkStyle: React.CSSProperties = {
  color: productSemanticColors.primaryAction,
  fontSize: 13,
  textDecoration: "none",
};
