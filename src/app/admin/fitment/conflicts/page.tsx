import { redirect } from "next/navigation";

/** Legacy admin links → moderation queue for mixed fitment reports. */
export default function AdminFitmentConflictsRedirectPage() {
  redirect("/admin/moderation?queue=mixedFitments");
}
