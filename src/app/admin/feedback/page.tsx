import type { AdminFeedbackListFilters } from "@mototwin/types";
import { PAGE_HELP_ENTRIES } from "@mototwin/domain";
import { AdminPageChrome } from "../_components/AdminPageChrome";
import { AdminFilterBar } from "../_components/AdminFilterBar";
import { loadAdminSelf } from "@/lib/admin-self";
import { loadAdminFeedbackList } from "@/lib/admin-feedback";
import { ruAdmin } from "../_locales/ru";
import { FeedbackTable } from "./_components/FeedbackTable";

interface AdminFeedbackPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    platform?: string;
    pageKey?: string;
    page?: string;
  }>;
}

export default async function AdminFeedbackPage({ searchParams }: AdminFeedbackPageProps) {
  const params = await searchParams;
  const filters: AdminFeedbackListFilters = {
    q: params.q || undefined,
    status: parseStatus(params.status),
    type: parseType(params.type),
    platform: parsePlatform(params.platform),
    pageKey: params.pageKey || undefined,
  };
  const page = Number(params.page ?? 1);

  const [self, list] = await Promise.all([
    loadAdminSelf(),
    loadAdminFeedbackList({ filters, page }),
  ]);

  const pageOptions = PAGE_HELP_ENTRIES.map((entry) => ({
    value: entry.key,
    label: entry.title,
  }));

  return (
    <AdminPageChrome title={ruAdmin.feedback.title} self={self}>
      <AdminFilterBar
        fields={[
          { key: "q", label: ruAdmin.feedback.filters.search, search: true, placeholder: ruAdmin.feedback.filters.search },
          {
            key: "status",
            label: ruAdmin.feedback.filters.status,
            options: [
              { value: "NEW", label: "Новое" },
              { value: "IN_PROGRESS", label: "В работе" },
              { value: "RESOLVED", label: "Решено" },
              { value: "REJECTED", label: "Отклонено" },
            ],
          },
          {
            key: "type",
            label: ruAdmin.feedback.filters.type,
            options: [
              { value: "PROBLEM", label: "Проблема" },
              { value: "IDEA", label: "Идея" },
              { value: "QUESTION", label: "Вопрос" },
            ],
          },
          {
            key: "platform",
            label: ruAdmin.feedback.filters.platform,
            options: [
              { value: "web", label: "Web" },
              { value: "ios", label: "iOS" },
              { value: "android", label: "Android" },
            ],
          },
          {
            key: "pageKey",
            label: ruAdmin.feedback.columns.page,
            options: pageOptions,
          },
        ]}
      />
      <FeedbackTable data={list} currentSearch={params} />
    </AdminPageChrome>
  );
}

function parseStatus(value: string | undefined): AdminFeedbackListFilters["status"] {
  if (value === "NEW" || value === "IN_PROGRESS" || value === "RESOLVED" || value === "REJECTED") {
    return value;
  }
  return undefined;
}

function parseType(value: string | undefined): AdminFeedbackListFilters["type"] {
  if (value === "PROBLEM" || value === "IDEA" || value === "QUESTION") return value;
  return undefined;
}

function parsePlatform(value: string | undefined): AdminFeedbackListFilters["platform"] {
  if (value === "web" || value === "ios" || value === "android") return value;
  return undefined;
}
