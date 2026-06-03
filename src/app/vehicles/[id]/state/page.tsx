import { redirect } from "next/navigation";

type VehicleStateRedirectPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
};

/** Legacy notification/deep links: `/vehicles/:id/state` → web mileage editor on vehicle page. */
export default async function VehicleStateRedirectPage({
  params,
  searchParams,
}: VehicleStateRedirectPageProps) {
  const { id } = await params;
  const { focus } = await searchParams;
  const q = new URLSearchParams();
  q.set("openVehicleState", "1");
  if (focus?.trim()) {
    q.set("focus", focus.trim());
  }
  redirect(`/vehicles/${encodeURIComponent(id)}?${q.toString()}`);
}
