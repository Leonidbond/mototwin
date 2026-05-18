import { productSemanticColors } from "@mototwin/design-tokens";
import { AdminTopBar } from "./_components/AdminTopBar";
import { RefreshButton } from "./_components/RefreshButton";
import { KpiCard } from "./_components/dashboard/KpiCard";
import { WorkQueueCard } from "./_components/dashboard/WorkQueueCard";
import { FastestGrowingModelsCard } from "./_components/dashboard/FastestGrowingModelsCard";
import { ProblemAreasCard } from "./_components/dashboard/ProblemAreasCard";
import { FitmentQualityDonut } from "./_components/dashboard/FitmentQualityDonut";
import { CatalogCoverageMatrix } from "./_components/dashboard/CatalogCoverageMatrix";
import { ActivitySignalsChart } from "./_components/dashboard/ActivitySignalsChart";
import { QuickActionsCard } from "./_components/dashboard/QuickActionsCard";
import { loadAdminSelf } from "@/lib/admin-self";
import {
  loadActivity,
  loadCatalogCoverage,
  loadFastestGrowingModels,
  loadFitmentQuality,
  loadKpis,
  loadProblemAreas,
  loadWorkQueue,
} from "@/lib/admin-dashboard";
import { ruAdmin } from "./_locales/ru";
import { ADMIN_DEFAULT_PERIOD, parsePeriodKey } from "@/lib/admin-period";

interface AdminDashboardPageProps {
  searchParams: Promise<{ period?: string; tab?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await searchParams;
  const periodKey = parsePeriodKey(params.period) ?? ADMIN_DEFAULT_PERIOD;

  const [self, kpis, workQueue, fastest, problems, fitmentQuality, coverage, activity] = await Promise.all([
    loadAdminSelf(),
    loadKpis(periodKey),
    loadWorkQueue("all", 6),
    loadFastestGrowingModels(periodKey),
    loadProblemAreas(),
    loadFitmentQuality(),
    loadCatalogCoverage(),
    loadActivity(periodKey),
  ]);

  return (
    <>
      <AdminTopBar
        title={ruAdmin.dashboard.title}
        self={self}
        showPeriodPicker
        rightSlot={<RefreshButton />}
      />
      <div
        style={{
          flex: 1,
          padding: "20px 28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          backgroundColor: productSemanticColors.canvas,
          minWidth: 0,
        }}
      >
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 14,
          }}
        >
          {kpis.cards.map((card) => (
            <KpiCard key={card.id} card={card} />
          ))}
        </section>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <WorkQueueCard initialData={workQueue} />
          <FastestGrowingModelsCard data={fastest} />
        </section>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <ProblemAreasCard data={problems} />
          <FitmentQualityDonut data={fitmentQuality} />
          <CatalogCoverageMatrix data={coverage} />
        </section>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <ActivitySignalsChart data={activity} />
          <QuickActionsCard />
        </section>
      </div>
    </>
  );
}
