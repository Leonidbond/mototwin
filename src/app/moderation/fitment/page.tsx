import { redirect } from "next/navigation";

/**
 * Legacy moderation page — replaced by the unified /admin/moderation console
 * which covers all 7 queues with a richer right-side inspector. Keep the
 * route alive as a 308 redirect for any bookmarks or in-app links.
 */
export default function LegacyModerationFitmentPage() {
  redirect("/admin/moderation");
}
