import { notFound } from "next/navigation";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminUserDetail } from "@/lib/admin-users";
import {
  formatDateRu,
  formatDateTimeRu,
  formatNumberRu,
} from "../../_components/format";
import { ruAdmin } from "../../_locales/ru";

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { id } = await params;
  const [self, detail] = await Promise.all([loadAdminSelf(), loadAdminUserDetail(id)]);
  if (!detail) notFound();

  const display = detail.displayName ?? detail.email ?? "—";

  return (
    <AdminPageChrome title={display} self={self}>
      <Link
        href="/admin/users"
        prefetch={false}
        style={{ color: productSemanticColors.textMuted, fontSize: 12, textDecoration: "none" }}
      >
        ← Назад к списку пользователей
      </Link>

      <section style={summaryGrid}>
        <ProfileSummary detail={detail} />
        <Stat label="Мотоциклы" value={formatNumberRu(detail.vehicleCount)} />
        <Stat label="Service events" value={formatNumberRu(detail.serviceEventCount)} />
        <Stat label="Расходы" value={formatNumberRu(detail.expenseCount)} />
        <Stat label="Fitment-отчеты" value={formatNumberRu(detail.fitmentReportCount)} />
        <Stat label="Голоса по fitment" value={formatNumberRu(detail.fitmentVoteCount)} />
      </section>

      <section style={twoColGrid}>
        <Card title="Гаражи">
          {detail.garages.length === 0 ? (
            <Empty />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {detail.garages.map((garage) => (
                <li key={garage.id} style={listRowStyle}>
                  <span style={{ fontWeight: 500 }}>{garage.title}</span>
                  <span style={{ color: productSemanticColors.textMuted, fontSize: 12 }}>
                    {formatNumberRu(garage.vehicleCount)} мотоцикл(ов)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Последние мотоциклы">
          {detail.recentVehicles.length === 0 ? (
            <Empty />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {detail.recentVehicles.map((v) => (
                <li key={v.id} style={listRowStyle}>
                  <Link
                    href={`/admin/vehicles/${v.id}`}
                    prefetch={false}
                    style={{ color: productSemanticColors.textPrimary, textDecoration: "none" }}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {v.brandLabel} {v.modelLabel} {v.year}
                    </div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                      {v.nickname ? `«${v.nickname}» · ` : ""}
                      {formatNumberRu(v.odometer)} км · с {formatDateRu(v.createdAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section style={twoColGrid}>
        <Card title="Последние fitment-отчеты">
          {detail.recentFitmentReports.length === 0 ? (
            <Empty />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {detail.recentFitmentReports.map((r) => (
                <li key={r.id} style={listRowStyle}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.partLabel}</div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                      {r.nodeLabel} · {formatDateRu(r.createdAt)}
                    </div>
                  </div>
                  <span style={moderationChipStyle(r.moderationStatus)}>{r.moderationStatus}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Последние service events">
          {detail.recentServiceEvents.length === 0 ? (
            <Empty />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {detail.recentServiceEvents.map((e) => (
                <li key={e.id} style={listRowStyle}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{e.title || e.nodeLabel}</div>
                    <div style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
                      {e.nodeLabel} · {formatNumberRu(e.odometer)} км
                    </div>
                  </div>
                  <span style={{ color: productSemanticColors.textMuted, fontSize: 12 }}>
                    {formatDateTimeRu(e.eventDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </AdminPageChrome>
  );
}

function ProfileSummary({
  detail,
}: {
  detail: Awaited<ReturnType<typeof loadAdminUserDetail>> & object;
}) {
  return (
    <div
      style={{
        gridColumn: "span 2",
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        Профиль
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 18,
          fontWeight: 600,
          color: productSemanticColors.textPrimary,
        }}
      >
        {detail.displayName ?? detail.email ?? "—"}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: productSemanticColors.textSecondary }}>
        {detail.email ?? "Без email"} · ID {detail.id}
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {detail.adminRole ? (
          <span style={chipBase("#A5B4FC", "rgba(99,102,241,0.16)", "rgba(99,102,241,0.32)")}>
            {ruAdmin.topbar.role[detail.adminRole] ?? detail.adminRole}
          </span>
        ) : null}
        {detail.plan ? (
          <span style={chipBase("#FBBF24", "rgba(251,191,36,0.16)", "rgba(251,191,36,0.32)")}>
            План {detail.plan}
          </span>
        ) : null}
        {detail.isModerator ? (
          <span style={chipBase("#86EFAC", "rgba(34,197,94,0.14)", "rgba(34,197,94,0.30)")}>
            Moderator
          </span>
        ) : null}
        <span style={{ fontSize: 12, color: productSemanticColors.textMuted }}>
          Зарегистрирован {formatDateRu(detail.createdAt)}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 12, color: productSemanticColors.textMuted, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "16px 18px",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: productSemanticColors.textPrimary,
        }}
      >
        {title}
      </h3>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ color: productSemanticColors.textMuted, fontSize: 13 }}>Нет данных</div>
  );
}

function moderationChipStyle(status: string): React.CSSProperties {
  if (status === "PUBLISHED")
    return chipBase("#86EFAC", "rgba(34,197,94,0.14)", "rgba(34,197,94,0.30)");
  if (status === "PENDING")
    return chipBase("#FBBF24", "rgba(251,191,36,0.14)", "rgba(251,191,36,0.30)");
  if (status === "REJECTED")
    return chipBase("#F87171", "rgba(248,113,113,0.14)", "rgba(248,113,113,0.30)");
  if (status === "NEEDS_REVIEW")
    return chipBase("#93C5FD", "rgba(96,165,250,0.14)", "rgba(96,165,250,0.30)");
  return chipBase("#94A3B8", "rgba(148,163,184,0.10)", "rgba(148,163,184,0.20)");
}

function chipBase(fg: string, bg: string, border: string): React.CSSProperties {
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
    border: `1px solid ${border}`,
  };
}

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 14,
};

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const listRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: `1px solid ${productSemanticColors.border}`,
  gap: 12,
};
