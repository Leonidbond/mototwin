import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { prisma } from "@/lib/prisma";
import { formatNumberRu } from "../_components/format";
import { ruAdmin } from "../_locales/ru";

interface AdminDictionariesPageProps {
  searchParams: Promise<{ tab?: "brands" | "nodes" }>;
}

export default async function AdminDictionariesPage({
  searchParams,
}: AdminDictionariesPageProps) {
  const params = await searchParams;
  const tab = params.tab === "nodes" ? "nodes" : "brands";

  const self = await loadAdminSelf();
  const [brands, nodes] = await Promise.all([
    tab === "brands"
      ? prisma.brand.findMany({
          orderBy: { name: "asc" },
          include: { _count: { select: { models: true } } },
        })
      : Promise.resolve([]),
    tab === "nodes"
      ? prisma.node.findMany({
          orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            serviceGroup: true,
            isActive: true,
            isMvpVisible: true,
          },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.dictionaries} self={self}>
      <div role="tablist" style={tabsRow}>
        <Tab
          href="/admin/dictionaries?tab=brands"
          label="Бренды"
          active={tab === "brands"}
        />
        <Tab
          href="/admin/dictionaries?tab=nodes"
          label="Узлы (Node tree)"
          active={tab === "nodes"}
        />
      </div>

      {tab === "brands" ? (
        <div style={tableCardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Бренд</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyleNumeric}>Моделей</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 ? (
                <Empty colSpan={3} />
              ) : (
                brands.map((brand) => (
                  <tr
                    key={brand.id}
                    style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                  >
                    <td style={tdStyle}>{brand.name}</td>
                    <td style={tdStyle}>
                      <code style={codeStyle}>{brand.slug}</code>
                    </td>
                    <td style={tdStyleNumeric}>{formatNumberRu(brand._count.models)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "nodes" ? (
        <div style={tableCardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Имя</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Уровень</th>
                <th style={thStyle}>Service group</th>
                <th style={thStyle}>Видимость</th>
              </tr>
            </thead>
            <tbody>
              {nodes.length === 0 ? (
                <Empty colSpan={5} />
              ) : (
                nodes.map((node) => (
                  <tr
                    key={node.id}
                    style={{ borderTop: `1px solid ${productSemanticColors.border}` }}
                  >
                    <td style={{ ...tdStyle, paddingLeft: 14 + node.level * 12 }}>{node.name}</td>
                    <td style={tdStyle}>
                      <code style={codeStyle}>{node.code}</code>
                    </td>
                    <td style={tdStyle}>{node.level}</td>
                    <td style={tdStyle}>{node.serviceGroup ?? "—"}</td>
                    <td style={tdStyle}>
                      {node.isMvpVisible ? (
                        <span style={chipStyle("#86EFAC", "rgba(34,197,94,0.14)")}>MVP</span>
                      ) : node.isActive ? (
                        <span style={chipStyle("#A5B4FC", "rgba(99,102,241,0.16)")}>active</span>
                      ) : (
                        <span style={chipStyle("#94A3B8", "rgba(148,163,184,0.14)")}>off</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <p style={{ margin: 0, color: productSemanticColors.textMuted, fontSize: 12 }}>
        Редактирование справочников выполняется через bulk-импорт или прямые миграции. Здесь
        показан текущий снимок данных.
      </p>
    </AdminPageChrome>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      role="tab"
      aria-selected={active}
      style={active ? tabActive : tabIdle}
    >
      {label}
    </Link>
  );
}

function Empty({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: 32,
          textAlign: "center",
          color: productSemanticColors.textMuted,
          fontSize: 13,
        }}
      >
        Нет данных
      </td>
    </tr>
  );
}

function chipStyle(fg: string, bg: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 20,
    padding: "0 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: fg,
    backgroundColor: bg,
  };
}

const tabsRow: React.CSSProperties = {
  display: "flex",
  gap: 4,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const tabIdle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 14px",
  fontSize: 13,
  color: productSemanticColors.textMuted,
  textDecoration: "none",
  borderBottom: "2px solid transparent",
};

const tabActive: React.CSSProperties = {
  ...tabIdle,
  color: productSemanticColors.textPrimary,
  fontWeight: 600,
  borderBottom: `2px solid ${productSemanticColors.primaryAction}`,
};

const tableCardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
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
const tdStyleNumeric: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 12,
  color: productSemanticColors.textSecondary,
};
