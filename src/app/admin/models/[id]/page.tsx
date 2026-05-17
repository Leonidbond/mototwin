import { notFound } from "next/navigation";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { SupportLevelChip } from "../../_components/dashboard/StatusChip";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminModelDetail } from "@/lib/admin-models";
import { canMutate } from "@/lib/admin-auth";
import { formatNumberRu } from "../../_components/format";
import { SupportLevelForm } from "./_components/SupportLevelForm";

interface AdminModelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminModelDetailPage({ params }: AdminModelDetailPageProps) {
  const { id } = await params;
  const [self, detail] = await Promise.all([loadAdminSelf(), loadAdminModelDetail(id)]);
  if (!detail) notFound();

  const title = `${detail.brandLabel} ${detail.modelLabel} ${detail.year}`;
  const allowMutate = canMutate(self.role);

  return (
    <AdminPageChrome title={title} self={self}>
      <Link
        href="/admin/models"
        prefetch={false}
        style={{ color: productSemanticColors.textMuted, fontSize: 12, textDecoration: "none" }}
      >
        ← Назад к моделям
      </Link>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: productSemanticColors.textPrimary,
              }}
            >
              {detail.versionName}
            </h2>
            <SupportLevelChip level={detail.supportLevel} />
          </div>
          <dl style={specGrid}>
            <Spec term="Поколение" value={detail.generation} />
            <Spec term="Рынок" value={detail.market} />
            <Spec term="Двигатель" value={detail.engineType} />
            <Spec term="Охлаждение" value={detail.coolingType} />
            <Spec term="Колеса" value={detail.wheelSizes} />
            <Spec term="Тормоза" value={detail.brakeSystem} />
            <Spec term="Шаг цепи" value={detail.chainPitch} />
            <Spec term="Звезды" value={detail.stockSprockets} />
          </dl>
        </div>

        <div
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <Stat label="В гаражах" value={formatNumberRu(detail.garageCount)} />
          <Stat label="Reports" value={formatNumberRu(detail.reportsCount)} />
          <Stat label="Verified" value={formatNumberRu(detail.verifiedCount)} />
          <Stat label="Конфликтов" value={formatNumberRu(detail.conflictsCount)} />
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Покрытие узлов</h3>
          {detail.nodeCoverage.length === 0 ? (
            <div style={{ color: productSemanticColors.textMuted, fontSize: 13, marginTop: 6 }}>
              Нет fitment-данных
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Узел</th>
                  <th style={thStyleNumeric}>Verified</th>
                  <th style={thStyleNumeric}>Reports</th>
                  <th style={thStyleNumeric}>Конфликты</th>
                </tr>
              </thead>
              <tbody>
                {detail.nodeCoverage.map((row) => (
                  <tr
                    key={row.nodeId}
                    style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                  >
                    <td style={tdStyle}>{row.nodeLabel}</td>
                    <td style={tdStyleNumeric}>{formatNumberRu(row.verified)}</td>
                    <td style={tdStyleNumeric}>{formatNumberRu(row.reports)}</td>
                    <td style={tdStyleNumeric}>
                      {row.conflicts > 0 ? (
                        <span style={{ color: "#FBBF24", fontWeight: 600 }}>
                          {formatNumberRu(row.conflicts)}
                        </span>
                      ) : (
                        formatNumberRu(0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <SupportLevelForm
          modelVariantId={detail.modelVariantId}
          current={detail.supportLevel}
          override={detail.supportLevelOverride}
          reasonHint={detail.supportLevelReason}
          canMutate={allowMutate}
        />
      </section>
    </AdminPageChrome>
  );
}

function Spec({ term, value }: { term: string; value: string | null | undefined }) {
  return (
    <div>
      <dt
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: productSemanticColors.textMuted,
        }}
      >
        {term}
      </dt>
      <dd
        style={{
          margin: "2px 0 0",
          fontSize: 13,
          color: productSemanticColors.textPrimary,
        }}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 22,
          fontWeight: 700,
          color: productSemanticColors.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: "18px 20px",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: productSemanticColors.textPrimary,
};

const specGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  margin: "12px 0 0",
};

const thStyle: React.CSSProperties = {
  padding: "10px 8px",
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
  padding: "8px 8px",
  fontSize: 13,
  color: productSemanticColors.textPrimary,
};

const tdStyleNumeric: React.CSSProperties = { ...tdStyle, textAlign: "right" };
