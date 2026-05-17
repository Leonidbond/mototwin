import type { AdminModerationQueueKey } from "@mototwin/types";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminModerationQueue } from "@/lib/admin-moderation";
import { canMutate } from "@/lib/admin-auth";
import { ModerationConsole } from "./_components/ModerationConsole";
import { ruAdmin } from "../_locales/ru";

const VALID: AdminModerationQueueKey[] = [
  "pendingMasters",
  "pendingReports",
  "needsReviewReports",
  "safetyCriticalReports",
  "hiddenReports",
  "rejectedReports",
  "mixedFitments",
];

interface AdminModerationPageProps {
  searchParams: Promise<{ queue?: string }>;
}

export default async function AdminModerationPage({ searchParams }: AdminModerationPageProps) {
  const params = await searchParams;
  const queueParam = params.queue ?? "pendingReports";
  const queue = (VALID.includes(queueParam as AdminModerationQueueKey)
    ? queueParam
    : "pendingReports") as AdminModerationQueueKey;

  const [self, initial] = await Promise.all([
    loadAdminSelf(),
    loadAdminModerationQueue(queue),
  ]);

  return (
    <AdminPageChrome title={ruAdmin.nav.moderation} self={self}>
      <ModerationConsole initial={initial} canMutate={canMutate(self.role)} />
    </AdminPageChrome>
  );
}
