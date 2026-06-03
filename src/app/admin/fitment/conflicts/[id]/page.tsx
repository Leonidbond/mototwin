import { redirect } from "next/navigation";

type AdminFitmentConflictDetailRedirectPageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy per-conflict URLs → mixed fitments moderation queue. */
export default async function AdminFitmentConflictDetailRedirectPage({
  params,
}: AdminFitmentConflictDetailRedirectPageProps) {
  await params;
  redirect("/admin/moderation?queue=mixedFitments");
}
